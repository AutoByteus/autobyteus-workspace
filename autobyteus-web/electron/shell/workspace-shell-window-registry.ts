import type { WorkspaceShellWindow } from './workspace-shell-window';

export class WorkspaceShellWindowRegistry {
  private readonly shellsById = new Map<number, WorkspaceShellWindow>();
  private readonly shellIdByNodeId = new Map<string, number>();

  register(shell: WorkspaceShellWindow): void {
    this.shellsById.set(shell.shellId, shell);
    this.shellIdByNodeId.set(shell.nodeId, shell.shellId);
  }

  unregister(shellId: number): void {
    const shell = this.shellsById.get(shellId);
    if (!shell) {
      return;
    }

    this.shellsById.delete(shellId);
    if (this.shellIdByNodeId.get(shell.nodeId) === shellId) {
      this.shellIdByNodeId.delete(shell.nodeId);
    }
  }

  getByShellId(shellId: number): WorkspaceShellWindow | null {
    return this.shellsById.get(shellId) ?? null;
  }

  getByNodeId(nodeId: string): WorkspaceShellWindow | null {
    const shellId = this.shellIdByNodeId.get(nodeId);
    if (typeof shellId !== 'number') {
      return null;
    }
    return this.getByShellId(shellId);
  }

  list(): Array<{ windowId: number; nodeId: string }> {
    return Array.from(this.shellsById.values()).map((shell) => ({
      windowId: shell.shellId,
      nodeId: shell.nodeId,
    }));
  }

  getNodeIdForShell(shellId: number): string | null {
    return this.shellsById.get(shellId)?.nodeId ?? null;
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

  closeNodeWindow(nodeId: string): void {
    this.getByNodeId(nodeId)?.close();
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
