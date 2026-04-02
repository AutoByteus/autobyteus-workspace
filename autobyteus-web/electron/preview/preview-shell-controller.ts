import type { Rectangle } from 'electron';
import type { PreviewHostBounds, PreviewShellSnapshot, PreviewShellSessionSummary } from '../../types/previewShell';
import type { WorkspaceShellWindow } from '../shell/workspace-shell-window';
import { PreviewSessionManager, type PreviewSessionSummary } from './preview-session-manager';

export const PREVIEW_SHELL_SNAPSHOT_UPDATED_CHANNEL = 'preview-shell:snapshot-updated';

type PreviewShellState = {
  shell: WorkspaceShellWindow;
  sessionIds: string[];
  activeSessionId: string | null;
  attachedSessionId: string | null;
  hostBounds: Rectangle | null;
};

const toRectangle = (bounds: PreviewHostBounds | null): Rectangle | null => {
  if (!bounds) {
    return null;
  }

  const width = Math.max(0, Math.round(bounds.width));
  const height = Math.max(0, Math.round(bounds.height));
  if (width === 0 || height === 0) {
    return null;
  }

  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width,
    height,
  };
};

const cloneSummary = (summary: PreviewSessionSummary): PreviewShellSessionSummary => ({
  preview_session_id: summary.preview_session_id,
  title: summary.title,
  url: summary.url,
});

const rectanglesEqual = (left: Rectangle | null, right: Rectangle | null): boolean => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
};

export class PreviewShellController {
  private readonly shellStates = new Map<number, PreviewShellState>();
  private readonly removeSessionUpsertListener: () => void;
  private readonly removeSessionClosedListener: () => void;

  constructor(private readonly previewSessionManager: PreviewSessionManager) {
    this.removeSessionUpsertListener = this.previewSessionManager.onSessionUpserted((summary) => {
      this.handleSessionUpserted(summary);
    });
    this.removeSessionClosedListener = this.previewSessionManager.onSessionClosed((sessionId) => {
      this.handleSessionClosed(sessionId);
    });
  }

  dispose(): void {
    this.removeSessionUpsertListener();
    this.removeSessionClosedListener();
    for (const state of this.shellStates.values()) {
      state.shell.attachPreviewView(null);
    }
    this.shellStates.clear();
  }

  registerShell(shell: WorkspaceShellWindow): void {
    const shellId = shell.shellId;

    if (this.shellStates.has(shellId)) {
      return;
    }

    this.shellStates.set(shellId, {
      shell,
      sessionIds: [],
      activeSessionId: null,
      attachedSessionId: null,
      hostBounds: null,
    });

    shell.browserWindow.on('closed', () => {
      this.unregisterShell(shellId);
    });
  }

  unregisterShell(shellId: number): void {
    const state = this.shellStates.get(shellId);
    if (!state) {
      return;
    }

    this.releaseShellLeases(shellId, state);
    state.shell.attachPreviewView(null);
    this.shellStates.delete(shellId);
  }

  getSnapshot(shellId: number): PreviewShellSnapshot {
    return this.buildSnapshot(this.getStateOrThrow(shellId));
  }

  focusSession(shellId: number, previewSessionId: string): PreviewShellSnapshot {
    const state = this.getStateOrThrow(shellId);
    this.previewSessionManager.getSessionSummaryOrThrow(previewSessionId);
    const leaseOwner = this.previewSessionManager.getSessionLeaseOwner(previewSessionId);
    if (leaseOwner !== null && leaseOwner !== shellId) {
      throw new Error(
        `Preview session '${previewSessionId}' is already attached to shell '${leaseOwner}'.`,
      );
    }

    if (!state.sessionIds.includes(previewSessionId)) {
      state.sessionIds.push(previewSessionId);
    }
    this.previewSessionManager.claimSessionLease(previewSessionId, shellId);
    state.activeSessionId = previewSessionId;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  setActiveSession(shellId: number, previewSessionId: string): PreviewShellSnapshot {
    const state = this.getStateOrThrow(shellId);
    if (!state.sessionIds.includes(previewSessionId)) {
      throw new Error(`Preview session '${previewSessionId}' is not attached to shell '${shellId}'.`);
    }

    this.previewSessionManager.claimSessionLease(previewSessionId, shellId);
    state.activeSessionId = previewSessionId;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  updateHostBounds(shellId: number, bounds: PreviewHostBounds | null): PreviewShellSnapshot {
    const state = this.getStateOrThrow(shellId);
    const nextBounds = toRectangle(bounds);
    if (rectanglesEqual(state.hostBounds, nextBounds)) {
      return this.buildSnapshot(state);
    }

    state.hostBounds = nextBounds;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  async closeSession(shellId: number, previewSessionId: string): Promise<PreviewShellSnapshot> {
    this.getStateOrThrow(shellId);
    await this.previewSessionManager.closeSession({
      preview_session_id: previewSessionId,
    });
    return this.getSnapshot(shellId);
  }

  private handleSessionUpserted(summary: PreviewSessionSummary): void {
    for (const [shellId, state] of this.shellStates.entries()) {
      if (!state.sessionIds.includes(summary.preview_session_id)) {
        continue;
      }
      this.publishSnapshot(shellId);
    }
  }

  private handleSessionClosed(previewSessionId: string): void {
    for (const [shellId, state] of this.shellStates.entries()) {
      const index = state.sessionIds.indexOf(previewSessionId);
      if (index === -1) {
        continue;
      }

      state.sessionIds.splice(index, 1);
      if (state.activeSessionId === previewSessionId) {
        state.activeSessionId = state.sessionIds[state.sessionIds.length - 1] ?? null;
      }
      this.applyShellProjection(state);
      this.publishSnapshot(shellId);
    }
  }

  private releaseShellLeases(shellId: number, state: PreviewShellState): void {
    for (const sessionId of state.sessionIds) {
      this.previewSessionManager.releaseSessionLease(sessionId, shellId);
    }
  }

  private applyShellProjection(state: PreviewShellState): void {
    const activeSessionId = state.activeSessionId;
    if (!activeSessionId || !state.hostBounds) {
      state.shell.attachPreviewView(null);
      state.attachedSessionId = null;
      return;
    }

    const view = this.previewSessionManager.getSessionView(activeSessionId);
    const shouldFocus = state.attachedSessionId !== activeSessionId;
    this.previewSessionManager.updateSessionViewportBounds(activeSessionId, state.hostBounds);
    state.shell.updatePreviewHostBounds(state.hostBounds);
    state.shell.attachPreviewView(view);
    state.attachedSessionId = activeSessionId;
    if (shouldFocus) {
      void view.webContents.focus();
    }
  }

  private buildSnapshot(state: PreviewShellState): PreviewShellSnapshot {
    const sessions = state.sessionIds
      .map((sessionId) => this.previewSessionManager.getSessionSummary(sessionId))
      .filter((value): value is PreviewSessionSummary => value !== null)
      .map((summary) => cloneSummary(summary));

    const activePreviewSessionId =
      state.activeSessionId && sessions.some((session) => session.preview_session_id === state.activeSessionId)
        ? state.activeSessionId
        : null;

    return {
      previewVisible: sessions.length > 0,
      activePreviewSessionId,
      sessions,
    };
  }

  private publishSnapshot(shellId: number): void {
    const state = this.shellStates.get(shellId);
    if (!state) {
      return;
    }
    state.shell.send(PREVIEW_SHELL_SNAPSHOT_UPDATED_CHANNEL, this.buildSnapshot(state));
  }

  private getStateOrThrow(shellId: number): PreviewShellState {
    const state = this.shellStates.get(shellId);
    if (!state) {
      throw new Error(`Preview shell '${shellId}' is not registered.`);
    }
    return state;
  }
}
