import { describe, expect, it, vi } from 'vitest'
import { registerBrowserShellIpcHandlers } from '../register-browser-shell-ipc-handlers'

describe('history IPC', () => {
  it('uses actual sender identity, not a shell ID in the payload', () => {
    const handlers = new Map<string, Function>()
    const navigateHistory = vi.fn(() => ({ activeTabId: null, sessions: [] }))
    registerBrowserShellIpcHandlers({ handle: (name: string, handler: Function) => handlers.set(name, handler) } as any,
      () => ({ getShellController: () => ({ navigateHistory }) }) as any)
    const request = { tabId: 'tab', direction: 'back', shellId: 99 }
    handlers.get('browser-shell:navigate-history')!({ sender: { id: 7 } }, request)
    expect(navigateHistory).toHaveBeenCalledWith(7, request)
  })
  it('rejects an unavailable runtime', () => {
    const handlers = new Map<string, Function>()
    registerBrowserShellIpcHandlers({ handle: (name: string, handler: Function) => handlers.set(name, handler) } as any, () => null)
    expect(() => handlers.get('browser-shell:navigate-history')!({ sender: { id: 7 } }, {})).toThrow(/unavailable/)
  })
})
