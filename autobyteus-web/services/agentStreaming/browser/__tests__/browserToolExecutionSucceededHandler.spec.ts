import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleBrowserToolExecutionSucceeded } from '../browserToolExecutionSucceededHandler';

const browserShellStoreMock = {
  browserAvailable: true,
  focusSession: vi.fn().mockResolvedValue(undefined),
};

const windowNodeContextStoreMock = {
  isEmbeddedWindow: true,
};

const rightSideTabsMock = {
  setActiveTab: vi.fn(),
};

vi.mock('~/stores/browserShellStore', () => ({
  useBrowserShellStore: () => browserShellStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => rightSideTabsMock,
}));

describe('handleBrowserToolExecutionSucceeded', () => {
  beforeEach(() => {
    browserShellStoreMock.browserAvailable = true;
    browserShellStoreMock.focusSession.mockClear();
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    rightSideTabsMock.setActiveTab.mockClear();
  });

  it('focuses the browser shell and activates the browser tab for an eligible embedded open_tab', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-1',
      tool_name: 'open_tab',
      turn_id: 'turn-1',
      result: {
        tab_id: 'browser-session-1',
        status: 'opened',
        url: 'http://localhost:3000/demo',
        title: 'Demo',
      },
    });

    expect(browserShellStoreMock.focusSession).toHaveBeenCalledWith('browser-session-1');
    expect(rightSideTabsMock.setActiveTab).toHaveBeenCalledWith('browser');
    expect(browserShellStoreMock.focusSession.mock.invocationCallOrder[0]).toBeLessThan(
      rightSideTabsMock.setActiveTab.mock.invocationCallOrder[0],
    );
  });

  it('preserves projection for an eligible JSON-string open_tab result', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-string',
      tool_name: 'open_tab',
      turn_id: 'turn-string',
      result: JSON.stringify({
        tab_id: 'browser-session-string',
        status: 'opened',
        url: 'http://localhost:3000/string-result',
      }),
    });

    expect(browserShellStoreMock.focusSession).toHaveBeenCalledWith('browser-session-string');
    expect(rightSideTabsMock.setActiveTab).toHaveBeenCalledWith('browser');
  });

  it('does not project a remote-node open_tab into the local browser shell', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;

    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-remote',
      tool_name: 'open_tab',
      turn_id: 'turn-remote',
      result: {
        tab_id: 'remote-browser-session',
        status: 'opened',
        url: 'http://remote-node.example/demo',
      },
    });

    expect(browserShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });

  it('does not project an embedded open_tab when the local browser shell is unavailable', async () => {
    browserShellStoreMock.browserAvailable = false;

    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-unavailable',
      tool_name: 'open_tab',
      turn_id: 'turn-unavailable',
      result: {
        tab_id: 'browser-session-unavailable',
        status: 'opened',
        url: 'http://localhost:3000/demo',
      },
    });

    expect(browserShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });

  it('ignores unrelated tool successes', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-2',
      tool_name: 'read_file',
      turn_id: 'turn-2',
      result: { content: 'ok' },
    });

    expect(browserShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });

  it('ignores open_tab success results without a tab_id', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-3',
      tool_name: 'open_tab',
      turn_id: 'turn-3',
      result: { success: true },
    });

    expect(browserShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });
});
