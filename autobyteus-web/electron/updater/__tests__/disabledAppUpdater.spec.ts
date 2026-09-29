import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  APP_UPDATE_IPC_CHECK,
  APP_UPDATE_IPC_DOWNLOAD,
  APP_UPDATE_IPC_GET_STATE,
  APP_UPDATE_IPC_INSTALL,
  APP_UPDATE_IPC_SET_CHANNEL,
} from '../appUpdateController'

const { ipcHandlers, ipcMainMock, appMock } = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => any>()
  return {
    ipcHandlers: handlers,
    ipcMainMock: {
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
      handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
        handlers.set(channel, handler)
      }),
    },
    appMock: { getVersion: vi.fn(() => '1.4.91-beta.4') },
  }
})

vi.mock('electron', () => ({ app: appMock, ipcMain: ipcMainMock }))

import { DisabledAppUpdater } from '../disabledAppUpdater'

function invoke(channel: string, ...args: unknown[]): Promise<any> {
  const handler = ipcHandlers.get(channel)
  if (!handler) throw new Error(`Missing handler for ${channel}`)
  return handler({}, ...args)
}

describe('DisabledAppUpdater', () => {
  beforeEach(() => {
    ipcHandlers.clear()
    ipcMainMock.handle.mockClear()
  })

  it('answers every update IPC request so the renderer never sees a missing handler', async () => {
    new DisabledAppUpdater().initialize()

    const state = await invoke(APP_UPDATE_IPC_GET_STATE)
    expect(state).toMatchObject({
      status: 'disabled',
      currentVersion: '1.4.91-beta.4',
      currentVersionIsPrerelease: true,
      updateStaged: false,
      errorKind: null,
      checkedAt: null,
    })
    expect(await invoke(APP_UPDATE_IPC_CHECK)).toMatchObject({ status: 'disabled' })
    expect(await invoke(APP_UPDATE_IPC_DOWNLOAD)).toMatchObject({ status: 'disabled' })
  })

  it('refuses install and channel changes explicitly', async () => {
    new DisabledAppUpdater().initialize()

    expect(await invoke(APP_UPDATE_IPC_INSTALL)).toEqual({ accepted: false })
    const result = await invoke(APP_UPDATE_IPC_SET_CHANNEL, 'beta')
    expect(result.accepted).toBe(false)
    expect(result.persisted).toBe(false)
    expect(result.state.status).toBe('disabled')
  })

  it('registers handlers once and never schedules checks', () => {
    const controller = new DisabledAppUpdater()
    controller.initialize()
    controller.initialize()
    controller.startAutoCheck()

    expect(ipcMainMock.handle).toHaveBeenCalledTimes(5)
  })
})
