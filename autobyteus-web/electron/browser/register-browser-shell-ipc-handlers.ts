import type { IpcMain } from 'electron';
import type { BrowserRuntime } from './browser-runtime';
import type {
  BrowserHostBounds,
  BrowserShellNavigateTabRequest,
  BrowserShellOpenTabRequest,
  BrowserShellReloadTabRequest,
  BrowserShellSnapshot,
} from '../../types/browserShell';

const getBrowserRuntimeOrThrow = (
  getBrowserRuntime: () => BrowserRuntime | null,
): BrowserRuntime => {
  const browserRuntime = getBrowserRuntime();
  if (!browserRuntime) {
    throw new Error('Browser runtime is unavailable on this desktop instance.');
  }
  return browserRuntime;
};

export const registerBrowserShellIpcHandlers = (
  ipcMain: IpcMain,
  getBrowserRuntime: () => BrowserRuntime | null,
): void => {
  ipcMain.handle('browser-shell:get-snapshot', async (event): Promise<BrowserShellSnapshot> => {
    const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
    return browserRuntime.getShellController().getSnapshot(event.sender.id);
  });

  ipcMain.handle(
    'browser-shell:open-tab',
    async (event, request: BrowserShellOpenTabRequest): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().openSession(event.sender.id, request);
    },
  );

  ipcMain.handle(
    'browser-shell:navigate-tab',
    async (event, request: BrowserShellNavigateTabRequest): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().navigateSession(event.sender.id, request);
    },
  );

  ipcMain.handle(
    'browser-shell:reload-tab',
    async (event, request: BrowserShellReloadTabRequest): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().reloadSession(event.sender.id, request);
    },
  );

  ipcMain.handle(
    'browser-shell:focus-session',
    async (event, browserSessionId: string): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().focusSession(event.sender.id, browserSessionId);
    },
  );

  ipcMain.handle(
    'browser-shell:set-active-session',
    async (event, browserSessionId: string): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().setActiveSession(event.sender.id, browserSessionId);
    },
  );

  ipcMain.handle(
    'browser-shell:update-host-bounds',
    async (event, bounds: BrowserHostBounds | null): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().updateHostBounds(event.sender.id, bounds);
    },
  );

  ipcMain.handle(
    'browser-shell:close-session',
    async (event, browserSessionId: string): Promise<BrowserShellSnapshot> => {
      const browserRuntime = getBrowserRuntimeOrThrow(getBrowserRuntime);
      return browserRuntime.getShellController().closeSession(event.sender.id, browserSessionId);
    },
  );
};
