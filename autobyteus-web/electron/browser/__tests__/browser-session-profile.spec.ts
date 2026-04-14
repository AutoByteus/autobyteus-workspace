import { beforeEach, describe, expect, it, vi } from 'vitest'

const electronState = vi.hoisted(() => {
  const browserSession = { id: 'browser-session' }
  const foreignSession = { id: 'foreign-session' }
  const fromPartitionMock = vi.fn(() => browserSession)

  return {
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
})
