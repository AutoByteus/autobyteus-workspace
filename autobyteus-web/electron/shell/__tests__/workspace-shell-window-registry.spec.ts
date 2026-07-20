import type { WebFrameMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceShellWindow } from '../workspace-shell-window';
import { WorkspaceShellWindowRegistry } from '../workspace-shell-window-registry';

const createFrame = (destroyed = false): WebFrameMain => ({
  isDestroyed: vi.fn(() => destroyed),
} as unknown as WebFrameMain);

const createShell = (options: {
  shellId?: number;
  nodeId?: string;
  mainFrame?: WebFrameMain;
  shellDestroyed?: boolean;
  webContentsDestroyed?: boolean;
} = {}): WorkspaceShellWindow => {
  const shellId = options.shellId ?? 42;
  return {
    shellId,
    nodeId: options.nodeId ?? `node-${shellId}`,
    isDestroyed: vi.fn(() => options.shellDestroyed ?? false),
    browserWindow: {
      webContents: {
        id: shellId,
        isDestroyed: vi.fn(() => options.webContentsDestroyed ?? false),
        mainFrame: options.mainFrame ?? createFrame(),
      },
    },
  } as unknown as WorkspaceShellWindow;
};

describe('WorkspaceShellWindowRegistry requester identity', () => {
  it('accepts only the registered shell current main-frame object', () => {
    const registry = new WorkspaceShellWindowRegistry();
    const mainFrame = createFrame();
    registry.register(createShell({ mainFrame }));

    expect(registry.isOwnedMainFrame(42, mainFrame)).toBe(true);
    expect(registry.isOwnedMainFrame(42, createFrame())).toBe(false);
    expect(registry.isOwnedMainFrame(999, mainFrame)).toBe(false);
  });

  it('rejects destroyed frames, shells, and webContents', () => {
    const destroyedFrameRegistry = new WorkspaceShellWindowRegistry();
    const destroyedFrame = createFrame(true);
    destroyedFrameRegistry.register(createShell({ mainFrame: destroyedFrame }));
    expect(destroyedFrameRegistry.isOwnedMainFrame(42, destroyedFrame)).toBe(false);

    const destroyedShellRegistry = new WorkspaceShellWindowRegistry();
    const shellMainFrame = createFrame();
    destroyedShellRegistry.register(createShell({
      mainFrame: shellMainFrame,
      shellDestroyed: true,
    }));
    expect(destroyedShellRegistry.isOwnedMainFrame(42, shellMainFrame)).toBe(false);

    const destroyedWebContentsRegistry = new WorkspaceShellWindowRegistry();
    const webContentsMainFrame = createFrame();
    destroyedWebContentsRegistry.register(createShell({
      mainFrame: webContentsMainFrame,
      webContentsDestroyed: true,
    }));
    expect(destroyedWebContentsRegistry.isOwnedMainFrame(42, webContentsMainFrame)).toBe(false);
  });

  it('tracks unregister and replacement lifecycle without accepting stale main frames', () => {
    const registry = new WorkspaceShellWindowRegistry();
    const originalMainFrame = createFrame();
    registry.register(createShell({ mainFrame: originalMainFrame }));
    registry.unregister(42);
    expect(registry.isOwnedMainFrame(42, originalMainFrame)).toBe(false);

    const currentMainFrame = createFrame();
    registry.register(createShell({ mainFrame: currentMainFrame }));
    expect(registry.isOwnedMainFrame(42, originalMainFrame)).toBe(false);
    expect(registry.isOwnedMainFrame(42, currentMainFrame)).toBe(true);
  });
});
