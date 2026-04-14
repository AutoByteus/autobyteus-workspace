import { beforeEach, describe, expect, it, vi } from 'vitest'

const electronState = vi.hoisted(() => {
  const createdViews: Array<{
    options: Record<string, unknown>
    bounds: { x: number; y: number; width: number; height: number } | null
  }> = []
  const browserSession = { id: 'browser-session' }
  const foreignSession = { id: 'foreign-session' }
  const fromPartitionMock = vi.fn(() => browserSession)

  return {
    createdViews,
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
    WebContentsView: class MockWebContentsView {
      readonly webContents = {}

      constructor(public readonly options: Record<string, unknown>) {
        electronState.createdViews.push({
          options,
          bounds: null,
        })
      }

      setBounds(bounds: { x: number; y: number; width: number; height: number }): void {
        electronState.createdViews[electronState.createdViews.length - 1]!.bounds = {
          ...bounds,
        }
      }
    },
  }
})

import { BrowserSessionProfile } from '../browser-session-profile'
import { BrowserTabError } from '../browser-tab-types'
import {
  DEFAULT_BROWSER_VIEW_BOUNDS,
  BrowserViewFactory,
} from '../browser-view-factory'

describe('BrowserViewFactory', () => {
  beforeEach(() => {
    electronState.createdViews.length = 0
    electronState.fromPartitionMock.mockClear()
  })

  it('creates browser views on the Browser-owned persistent Electron session', () => {
    const factory = new BrowserViewFactory(new BrowserSessionProfile())

    factory.createBrowserView()
    factory.createBrowserView()

    expect(electronState.fromPartitionMock).toHaveBeenCalledTimes(1)
    expect(electronState.createdViews).toHaveLength(2)
    for (const view of electronState.createdViews) {
      expect(view.options).toMatchObject({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          session: electronState.browserSession,
        },
      })
      expect(view.bounds).toEqual(DEFAULT_BROWSER_VIEW_BOUNDS)
    }
  })

  it('adopts Browser-owned popup webContents through the explicit popup boundary', () => {
    const factory = new BrowserViewFactory(new BrowserSessionProfile())
    const popupWebContents = {
      id: 'popup-web-contents',
      session: electronState.browserSession,
    }

    factory.adoptPopupWebContents(popupWebContents as any)

    expect(electronState.fromPartitionMock).toHaveBeenCalledTimes(1)
    expect(electronState.createdViews).toHaveLength(1)
    expect(electronState.createdViews[0]!.options.webContents).toBe(popupWebContents)
    expect(electronState.createdViews[0]!.options).toMatchObject({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })
    expect(
      (electronState.createdViews[0]!.options.webPreferences as Record<string, unknown>).session,
    ).toBeUndefined()
  })

  it('rejects popup webContents from a foreign Electron session', () => {
    const factory = new BrowserViewFactory(new BrowserSessionProfile())
    const popupWebContents = {
      id: 'popup-web-contents',
      session: electronState.foreignSession,
    }

    let thrownError: unknown = null

    try {
      factory.adoptPopupWebContents(popupWebContents as any)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(BrowserTabError)
    expect((thrownError as BrowserTabError).code).toBe('browser_popup_session_mismatch')
    expect(electronState.createdViews).toHaveLength(0)
  })
})
