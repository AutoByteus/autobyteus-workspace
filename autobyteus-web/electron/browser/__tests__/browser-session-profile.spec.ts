import { beforeEach, describe, expect, it, vi } from 'vitest'

const electronState = vi.hoisted(() => {
  const onBeforeSendHeaders = vi.fn()
  const browserSession = { id: 'browser-session', webRequest: { onBeforeSendHeaders } }
  const foreignSession = { id: 'foreign-session' }
  const fromPartitionMock = vi.fn(() => browserSession)

  return {
    onBeforeSendHeaders,
    browserSession,
    foreignSession,
    fromPartitionMock,
  }
})

vi.mock('electron', () => {
  return {
    session: {
      fromPartition: electronState.fromPartitionMock,
    },
  }
})

import {
  BROWSER_SESSION_PARTITION,
  BrowserSessionProfile,
} from '../browser-session-profile'
import { BrowserTabError } from '../browser-tab-types'

describe('BrowserSessionProfile', () => {
  beforeEach(() => {
    electronState.fromPartitionMock.mockClear()
    electronState.onBeforeSendHeaders.mockClear()
  })

  it('resolves the dedicated persistent Browser partition exactly once', () => {
    const profile = new BrowserSessionProfile()

    const firstSession = profile.getSession()
    const secondSession = profile.getSession()

    expect(BROWSER_SESSION_PARTITION).toBe('persist:autobyteus-browser')
    expect(electronState.fromPartitionMock).toHaveBeenCalledTimes(1)
    expect(electronState.fromPartitionMock).toHaveBeenCalledWith(BROWSER_SESSION_PARTITION)
    expect(firstSession).toBe(electronState.browserSession)
    expect(secondSession).toBe(electronState.browserSession)
  })

  it('rejects popup webContents that do not belong to the Browser-owned session', () => {
    const profile = new BrowserSessionProfile()

    expect(() => {
      profile.assertOwnedPopupWebContents({
        session: electronState.browserSession,
      } as any)
    }).not.toThrow()

    let thrownError: unknown = null
    try {
      profile.assertOwnedPopupWebContents({
        session: electronState.foreignSession,
      } as any)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(BrowserTabError)
    expect((thrownError as BrowserTabError).code).toBe('browser_popup_session_mismatch')
  })

  it('installs the file:// document policy once: Origin: null for such requests, others unchanged (autobyteus-416 D6)', () => {
    const profile = new BrowserSessionProfile()
    profile.getSession()
    profile.getSession()
    expect(electronState.onBeforeSendHeaders).toHaveBeenCalledTimes(1)
    const listener = electronState.onBeforeSendHeaders.mock.calls[0]![0] as (
      details: unknown,
      callback: (response: { requestHeaders: Record<string, string> }) => void,
    ) => void

    const answer = (details: Record<string, unknown>) => {
      const callback = vi.fn()
      listener(details, callback)
      expect(callback).toHaveBeenCalledTimes(1)
      return callback.mock.calls[0]![0].requestHeaders as Record<string, string>
    }

    expect(answer({
      url: 'http://127.0.0.1:29695/graphql', method: 'POST', resourceType: 'xhr',
      frame: { origin: 'file://' }, requestHeaders: { 'Content-Type': 'application/json' },
    })).toEqual({ 'Content-Type': 'application/json', Origin: 'null' })

    const httpPageHeaders = { Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json' }
    expect(answer({
      url: 'http://127.0.0.1:29695/graphql', method: 'POST', resourceType: 'xhr',
      frame: { origin: 'http://127.0.0.1:5173' }, requestHeaders: httpPageHeaders,
    })).toEqual(httpPageHeaders)

    expect(answer({
      url: 'http://127.0.0.1:29695/rest/workspaces/w/content?path=a.pdf', method: 'GET', resourceType: 'mainFrame',
      frame: { origin: 'file://' }, requestHeaders: {},
    })).toEqual({})
  })
})
