import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleBrowserToolExecutionSucceeded } from '../browserToolExecutionSucceededHandler';

const browserShellStoreMock = {
  focusSession: vi.fn().mockResolvedValue(undefined),
};

const rightSideTabsMock = {
  setActiveTab: vi.fn(),
};

vi.mock('~/stores/browserShellStore', () => ({
  useBrowserShellStore: () => browserShellStoreMock,
}));

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => rightSideTabsMock,
}));

describe('handleBrowserToolExecutionSucceeded', () => {
  beforeEach(() => {
    browserShellStoreMock.focusSession.mockClear();
    rightSideTabsMock.setActiveTab.mockClear();
  });

  it('focuses the browser shell and activates the browser tab for open_tab', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-1',
      tool_name: 'open_tab',
      result: {
        tab_id: 'browser-session-1',
        status: 'opened',
        url: 'http://localhost:3000/demo',
        title: 'Demo',
      },
    });

    expect(browserShellStoreMock.focusSession).toHaveBeenCalledWith('browser-session-1');
    expect(rightSideTabsMock.setActiveTab).toHaveBeenCalledWith('browser');
  });

  it('ignores unrelated tool successes', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-2',
      tool_name: 'read_file',
      result: { content: 'ok' },
    });

    expect(browserShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });

  it('ignores open_tab success results without a tab_id', async () => {
    await handleBrowserToolExecutionSucceeded({
      invocation_id: 'call-3',
      tool_name: 'open_tab',
      result: { success: true },
    });

    expect(browserShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });
});
