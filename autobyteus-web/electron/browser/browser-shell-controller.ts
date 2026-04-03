import type { Rectangle } from 'electron';
import type {
  BrowserHostBounds,
  BrowserShellNavigateTabRequest,
  BrowserShellOpenTabRequest,
  BrowserShellReloadTabRequest,
  BrowserShellSnapshot,
  BrowserShellTabSummary,
} from '../../types/browserShell';
import type { WorkspaceShellWindow } from '../shell/workspace-shell-window';
import {
  BrowserTabManager,
  type BrowserPopupOpenedEvent,
  type BrowserTabSummary,
} from './browser-tab-manager';

export const BROWSER_SHELL_SNAPSHOT_UPDATED_CHANNEL = 'browser-shell:snapshot-updated';

type BrowserShellState = {
  shell: WorkspaceShellWindow;
  sessionIds: string[];
  activeSessionId: string | null;
  attachedSessionId: string | null;
  hostBounds: Rectangle | null;
};

const toRectangle = (bounds: BrowserHostBounds | null): Rectangle | null => {
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

const cloneSummary = (summary: BrowserTabSummary): BrowserShellTabSummary => ({
  tab_id: summary.tab_id,
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

export class BrowserShellController {
  private readonly shellStates = new Map<number, BrowserShellState>();
  private readonly removeSessionUpsertListener: () => void;
  private readonly removeSessionClosedListener: () => void;
  private readonly removePopupOpenedListener: () => void;

  constructor(private readonly browserSessionManager: BrowserTabManager) {
    this.removeSessionUpsertListener = this.browserSessionManager.onSessionUpserted((summary) => {
      this.handleSessionUpserted(summary);
    });
    this.removeSessionClosedListener = this.browserSessionManager.onSessionClosed((sessionId) => {
      this.handleSessionClosed(sessionId);
    });
    this.removePopupOpenedListener = this.browserSessionManager.onPopupOpened((event) => {
      this.handlePopupOpened(event);
    });
  }

  dispose(): void {
    this.removeSessionUpsertListener();
    this.removeSessionClosedListener();
    this.removePopupOpenedListener();
    for (const state of this.shellStates.values()) {
      state.shell.attachBrowserView(null);
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
    state.shell.attachBrowserView(null);
    this.shellStates.delete(shellId);
  }

  getSnapshot(shellId: number): BrowserShellSnapshot {
    return this.buildSnapshot(this.getStateOrThrow(shellId));
  }

  async openSession(
    shellId: number,
    request: BrowserShellOpenTabRequest,
  ): Promise<BrowserShellSnapshot> {
    const state = this.getStateOrThrow(shellId);
    const opened = await this.browserSessionManager.openSession({
      url: request.url,
      title: request.title,
      reuse_existing: request.reuseExisting,
      wait_until: request.waitUntil,
    });

    if (!state.sessionIds.includes(opened.tab_id)) {
      state.sessionIds.push(opened.tab_id);
    }
    this.browserSessionManager.claimSessionLease(opened.tab_id, shellId);
    state.activeSessionId = opened.tab_id;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  async navigateSession(
    shellId: number,
    request: BrowserShellNavigateTabRequest,
  ): Promise<BrowserShellSnapshot> {
    const state = this.getStateOrThrow(shellId);
    if (!state.sessionIds.includes(request.tabId)) {
      throw new Error(`Browser session '${request.tabId}' is not attached to shell '${shellId}'.`);
    }

    await this.browserSessionManager.navigateSession({
      tab_id: request.tabId,
      url: request.url,
      wait_until: request.waitUntil,
    });
    state.activeSessionId = request.tabId;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  async reloadSession(
    shellId: number,
    request: BrowserShellReloadTabRequest,
  ): Promise<BrowserShellSnapshot> {
    const state = this.getStateOrThrow(shellId);
    if (!state.sessionIds.includes(request.tabId)) {
      throw new Error(`Browser session '${request.tabId}' is not attached to shell '${shellId}'.`);
    }

    await this.browserSessionManager.reloadSession({
      tab_id: request.tabId,
      wait_until: request.waitUntil,
    });
    state.activeSessionId = request.tabId;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  focusSession(shellId: number, browserSessionId: string): BrowserShellSnapshot {
    const state = this.getStateOrThrow(shellId);
    this.browserSessionManager.getSessionSummaryOrThrow(browserSessionId);
    const leaseOwner = this.browserSessionManager.getSessionLeaseOwner(browserSessionId);
    if (leaseOwner !== null && leaseOwner !== shellId) {
      throw new Error(
        `Browser session '${browserSessionId}' is already attached to shell '${leaseOwner}'.`,
      );
    }

    if (!state.sessionIds.includes(browserSessionId)) {
      state.sessionIds.push(browserSessionId);
    }
    this.browserSessionManager.claimSessionLease(browserSessionId, shellId);
    state.activeSessionId = browserSessionId;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  setActiveSession(shellId: number, browserSessionId: string): BrowserShellSnapshot {
    const state = this.getStateOrThrow(shellId);
    if (!state.sessionIds.includes(browserSessionId)) {
      throw new Error(`Browser session '${browserSessionId}' is not attached to shell '${shellId}'.`);
    }

    this.browserSessionManager.claimSessionLease(browserSessionId, shellId);
    state.activeSessionId = browserSessionId;
    this.applyShellProjection(state);
    this.publishSnapshot(shellId);
    return this.buildSnapshot(state);
  }

  updateHostBounds(shellId: number, bounds: BrowserHostBounds | null): BrowserShellSnapshot {
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

  async closeSession(shellId: number, browserSessionId: string): Promise<BrowserShellSnapshot> {
    this.getStateOrThrow(shellId);
    await this.browserSessionManager.closeSession({
      tab_id: browserSessionId,
    });
    return this.getSnapshot(shellId);
  }

  private handleSessionUpserted(summary: BrowserTabSummary): void {
    for (const [shellId, state] of this.shellStates.entries()) {
      if (!state.sessionIds.includes(summary.tab_id)) {
        continue;
      }
      this.publishSnapshot(shellId);
    }
  }

  private handleSessionClosed(browserSessionId: string): void {
    for (const [shellId, state] of this.shellStates.entries()) {
      const index = state.sessionIds.indexOf(browserSessionId);
      if (index === -1) {
        continue;
      }

      state.sessionIds.splice(index, 1);
      if (state.activeSessionId === browserSessionId) {
        state.activeSessionId = state.sessionIds[state.sessionIds.length - 1] ?? null;
      }
      this.applyShellProjection(state);
      this.publishSnapshot(shellId);
    }
  }

  private handlePopupOpened(event: BrowserPopupOpenedEvent): void {
    const leaseOwner = this.browserSessionManager.getSessionLeaseOwner(
      event.opener_tab_id,
    );
    if (leaseOwner === null) {
      return;
    }

    const state = this.shellStates.get(leaseOwner);
    if (!state) {
      return;
    }

    if (!state.sessionIds.includes(event.tab_id)) {
      state.sessionIds.push(event.tab_id);
    }
    this.browserSessionManager.claimSessionLease(event.tab_id, leaseOwner);
    state.activeSessionId = event.tab_id;
    this.applyShellProjection(state);
    this.publishSnapshot(leaseOwner);
  }

  private releaseShellLeases(shellId: number, state: BrowserShellState): void {
    for (const sessionId of state.sessionIds) {
      this.browserSessionManager.releaseSessionLease(sessionId, shellId);
    }
  }

  private applyShellProjection(state: BrowserShellState): void {
    const activeSessionId = state.activeSessionId;
    if (!activeSessionId || !state.hostBounds) {
      state.shell.attachBrowserView(null);
      state.attachedSessionId = null;
      return;
    }

    const view = this.browserSessionManager.getSessionView(activeSessionId);
    const shouldFocus = state.attachedSessionId !== activeSessionId;
    this.browserSessionManager.updateSessionViewportBounds(activeSessionId, state.hostBounds);
    state.shell.updateBrowserHostBounds(state.hostBounds);
    state.shell.attachBrowserView(view);
    state.attachedSessionId = activeSessionId;
    if (shouldFocus) {
      void view.webContents.focus();
    }
  }

  private buildSnapshot(state: BrowserShellState): BrowserShellSnapshot {
    const sessions = state.sessionIds
      .map((sessionId) => this.browserSessionManager.getSessionSummary(sessionId))
      .filter((value): value is BrowserTabSummary => value !== null)
      .map((summary) => cloneSummary(summary));

    const activeTabId =
      state.activeSessionId && sessions.some((session) => session.tab_id === state.activeSessionId)
        ? state.activeSessionId
        : null;

    return {
      activeTabId,
      sessions,
    };
  }

  private publishSnapshot(shellId: number): void {
    const state = this.shellStates.get(shellId);
    if (!state) {
      return;
    }
    state.shell.send(BROWSER_SHELL_SNAPSHOT_UPDATED_CHANNEL, this.buildSnapshot(state));
  }

  private getStateOrThrow(shellId: number): BrowserShellState {
    const state = this.shellStates.get(shellId);
    if (!state) {
      throw new Error(`Browser shell '${shellId}' is not registered.`);
    }
    return state;
  }
}
