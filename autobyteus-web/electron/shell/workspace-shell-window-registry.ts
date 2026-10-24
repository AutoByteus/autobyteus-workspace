import type { WebFrameMain } from 'electron';
import type { WorkspaceShellWindow } from './workspace-shell-window';

export class WorkspaceShellWindowRegistry {
  private readonly shellsById = new Map<number, WorkspaceShellWindow>();
  private readonly shellIdByEntryId = new Map<string, number>();

  register(shell: WorkspaceShellWindow): void {
    this.shellsById.set(shell.shellId, shell);
    this.shellIdByEntryId.set(shell.entryId, shell.shellId);
  }

  unregister(shellId: number): void {
    const shell = this.shellsById.get(shellId);
    if (!shell) {
      return;
    }

    this.shellsById.delete(shellId);
    if (this.shellIdByEntryId.get(shell.entryId) === shellId) {
      this.shellIdByEntryId.delete(shell.entryId);
    }
  }

  getByShellId(shellId: number): WorkspaceShellWindow | null {
    return this.shellsById.get(shellId) ?? null;
  }

  getByEntryId(entryId: string): WorkspaceShellWindow | null {
    const shellId = this.shellIdByEntryId.get(entryId);
    if (typeof shellId !== 'number') {
      return null;
    }
    return this.getByShellId(shellId);
  }

  list(): Array<{ windowId: number; entryId: string }> {
    return Array.from(this.shellsById.values()).map((shell) => ({
      windowId: shell.shellId,
      entryId: shell.entryId,
    }));
  }

  getEntryIdForShell(shellId: number): string | null {
    return this.shellsById.get(shellId)?.entryId ?? null;
  }

  isOwnedMainFrame(webContentsId: number, frame: WebFrameMain): boolean {
    const shell = this.getByShellId(webContentsId);
    if (!shell || shell.isDestroyed() || frame.isDestroyed()) {
      return false;
    }

    const webContents = shell.browserWindow.webContents;
    if (webContents.id !== webContentsId || webContents.isDestroyed()) {
      return false;
    }

    const mainFrame = webContents.mainFrame;
    return !mainFrame.isDestroyed() && frame === mainFrame;
  }

  focusShell(shellId: number): boolean {
    const shell = this.getByShellId(shellId);
    if (!shell || shell.isDestroyed()) {
      this.unregister(shellId);
      return false;
    }
    shell.focus();
    return true;
  }

  closeNodeWindow(entryId: string): void {
    this.getByEntryId(entryId)?.close();
  }

  broadcast(channel: string, payload: unknown): void {
    for (const shell of this.shellsById.values()) {
      shell.send(channel, payload);
    }
  }

  getAll(): WorkspaceShellWindow[] {
    return Array.from(this.shellsById.values());
  }
}
