import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePreviewToolExecutionSucceeded } from '../previewToolExecutionSucceededHandler';

const previewShellStoreMock = {
  focusSession: vi.fn().mockResolvedValue(undefined),
};

const rightSideTabsMock = {
  setActiveTab: vi.fn(),
};

vi.mock('~/stores/previewShellStore', () => ({
  usePreviewShellStore: () => previewShellStoreMock,
}));

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => rightSideTabsMock,
}));

describe('handlePreviewToolExecutionSucceeded', () => {
  beforeEach(() => {
    previewShellStoreMock.focusSession.mockClear();
    rightSideTabsMock.setActiveTab.mockClear();
  });

  it('focuses the preview shell and activates the preview tab for open_preview', async () => {
    await handlePreviewToolExecutionSucceeded({
      invocation_id: 'call-1',
      tool_name: 'open_preview',
      result: {
        preview_session_id: 'preview-session-1',
        status: 'opened',
        url: 'http://localhost:3000/demo',
        title: 'Demo',
      },
    });

    expect(previewShellStoreMock.focusSession).toHaveBeenCalledWith('preview-session-1');
    expect(rightSideTabsMock.setActiveTab).toHaveBeenCalledWith('preview');
  });

  it('ignores unrelated tool successes', async () => {
    await handlePreviewToolExecutionSucceeded({
      invocation_id: 'call-2',
      tool_name: 'read_file',
      result: { content: 'ok' },
    });

    expect(previewShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });

  it('ignores open_preview success results without a preview_session_id', async () => {
    await handlePreviewToolExecutionSucceeded({
      invocation_id: 'call-3',
      tool_name: 'open_preview',
      result: { success: true },
    });

    expect(previewShellStoreMock.focusSession).not.toHaveBeenCalled();
    expect(rightSideTabsMock.setActiveTab).not.toHaveBeenCalled();
  });
});
