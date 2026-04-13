import * as fsSync from 'fs'
import * as os from 'os'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { RemoteBrowserSharingSettingsStore } from '../remote-browser-sharing-settings-store'

describe('RemoteBrowserSharingSettingsStore', () => {
  it('keeps the browser bridge loopback-only when remote sharing is disabled', () => {
    const userDataPath = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-remote-browser-settings-'))
    const store = new RemoteBrowserSharingSettingsStore(userDataPath)

    expect(store.getSnapshot()).toEqual({
      enabled: false,
      advertisedHost: '',
    })
    expect(store.getListenerHost()).toBe('127.0.0.1')
  })

  it('switches the browser bridge listener to all interfaces when remote sharing is enabled', () => {
    const userDataPath = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-remote-browser-settings-'))
    const store = new RemoteBrowserSharingSettingsStore(userDataPath)

    const nextSettings = store.save({
      enabled: true,
      advertisedHost: 'host.docker.internal',
    })

    expect(nextSettings).toEqual({
      enabled: true,
      advertisedHost: 'host.docker.internal',
    })
    expect(store.getListenerHost()).toBe('0.0.0.0')
  })
})
