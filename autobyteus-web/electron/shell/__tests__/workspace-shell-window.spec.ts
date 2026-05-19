import { describe, expect, it, vi, beforeEach } from 'vitest'

const electronMockState = vi.hoisted(() => ({
  windows: [] as any[],
}))

vi.mock('electron', () => {
  class BrowserWindow {
    readonly webContents = {
      id: 101,
      sent: [] as Array<{ channel: string; payload: unknown }>,
      on: () => undefined,
      setWindowOpenHandler: () => undefined,
      send(channel: string, payload: unknown): void {
        this.sent.push({ channel, payload })
      },
    }

    readonly contentView = {
      added: [] as unknown[],
      removed: [] as unknown[],
      addChildView(view: unknown): void {
        this.added.push(view)
      },
      removeChildView(view: unknown): void {
        this.removed.push(view)
      },
    }

    private readonly listeners = new Map<string, Array<() => void>>()
    private destroyed = false

    constructor() {
      electronMockState.windows.push(this)
    }

    on(event: string, listener: () => void): void {
      const listeners = this.listeners.get(event) ?? []
      listeners.push(listener)
      this.listeners.set(event, listeners)
    }

    emit(event: string): void {
      for (const listener of this.listeners.get(event) ?? []) {
        listener()
      }
    }

    isDestroyed(): boolean {
      return this.destroyed
    }

    isMinimized(): boolean {
      return false
    }

    restore(): void {}
    focus(): void {}

    close(): void {
      this.destroyed = true
      this.emit('closed')
    }

    async loadURL(): Promise<void> {}
  }

  return { BrowserWindow }
})

import { WorkspaceShellWindow } from '../workspace-shell-window'

const createShell = (): WorkspaceShellWindow =>
  new WorkspaceShellWindow({
    nodeId: 'node-1',
    startUrl: 'http://localhost:3000',
    preloadPath: '/tmp/preload.js',
    iconPath: '/tmp/icon.png',
  })

describe('WorkspaceShellWindow', () => {
  beforeEach(() => {
    electronMockState.windows.length = 0
  })

  it('attaches browser views without overwriting manager-owned presentation bounds', () => {
    const shell = createShell()
    const browserWindow = electronMockState.windows[0]!
    const view = {
      boundsCalls: [] as unknown[],
      setBounds(bounds: unknown): void {
        this.boundsCalls.push(bounds)
      },
    }

    shell.updateBrowserHostBounds({ x: 0, y: 0, width: 1000, height: 900 })
    shell.attachBrowserView(view as any)
    shell.updateBrowserHostBounds({ x: 0, y: 0, width: 320, height: 500 })

    expect(browserWindow.contentView.added).toEqual([view])
    expect(view.boundsCalls).toEqual([])
  })

  it('detaches the attached browser view when host bounds disappear', () => {
    const shell = createShell()
    const browserWindow = electronMockState.windows[0]!
    const view = { setBounds: () => undefined }

    shell.updateBrowserHostBounds({ x: 0, y: 0, width: 1000, height: 900 })
    shell.attachBrowserView(view as any)
    shell.updateBrowserHostBounds(null)

    expect(browserWindow.contentView.added).toEqual([view])
    expect(browserWindow.contentView.removed).toEqual([view])
  })
})
