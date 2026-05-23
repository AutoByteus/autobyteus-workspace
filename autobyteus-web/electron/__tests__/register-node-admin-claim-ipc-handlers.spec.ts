import { describe, expect, it, vi } from 'vitest'
import { registerNodeAdminClaimIpcHandlers } from '../register-node-admin-claim-ipc-handlers'

const makeIpcMain = () => {
  const handlers = new Map<string, (...args: any[]) => unknown>()
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...args: any[]) => unknown) => {
        handlers.set(channel, handler)
      }),
    },
    handlers,
  }
}

describe('registerNodeAdminClaimIpcHandlers', () => {
  it('returns an unavailable, redacted header result when the claim store is not ready', async () => {
    const { ipcMain, handlers } = makeIpcMain()

    registerNodeAdminClaimIpcHandlers(ipcMain as any, () => null)

    const result = await handlers.get('node-admin-claim:get-headers')?.({}, 'node-1', 'http://127.0.0.1:8001')
    expect(result).toEqual({
      ok: false,
      reason: 'unavailable',
      summary: {
        status: 'missing',
        nodeId: 'node-1',
        managementBaseUrl: 'http://127.0.0.1:8001',
        claimIdSuffix: null,
        updatedAt: null,
      },
    })
  })

  it('delegates claim registration to the Electron main claim store boundary', async () => {
    const { ipcMain, handlers } = makeIpcMain()
    const register = vi.fn().mockReturnValue({ status: 'configured' })

    registerNodeAdminClaimIpcHandlers(ipcMain as any, () => ({ register } as any))

    const input = {
      nodeId: 'node-1',
      managementBaseUrl: 'http://127.0.0.1:8001',
      claimId: 'nac_test',
      rawSecret: 'nas_secret',
    }
    await expect(handlers.get('node-admin-claim:register')?.({}, input)).resolves.toEqual({ status: 'configured' })
    expect(register).toHaveBeenCalledWith(input)
  })
})
