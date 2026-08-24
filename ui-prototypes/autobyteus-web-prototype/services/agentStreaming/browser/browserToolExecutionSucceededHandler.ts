import type { ToolExecutionSucceededPayload } from '../protocol/messageTypes';
import { parseToolExecutionSucceededPayload } from '../handlers/toolLifecycleParsers';
import { useBrowserShellStore } from '~/stores/browserShellStore';
import { useRightSideTabs } from '~/composables/useRightSideTabs';

const OPEN_TAB_TOOL_NAME = 'open_tab';

const extractBrowserTabIdFromResult = (result: unknown): string | null => {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const value = (result as { tab_id?: unknown }).tab_id;
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result) as { tab_id?: unknown };
      const browserSessionId = parsed?.tab_id;
      return typeof browserSessionId === 'string' && browserSessionId.trim().length > 0
        ? browserSessionId.trim()
        : null;
    } catch {
      return null;
    }
  }

  return null;
};

export const handleBrowserToolExecutionSucceeded = async (
  payload: ToolExecutionSucceededPayload,
): Promise<void> => {
  const parsed = parseToolExecutionSucceededPayload(payload);
  if (!parsed || parsed.toolName !== OPEN_TAB_TOOL_NAME) {
    return;
  }

  const browserSessionId = extractBrowserTabIdFromResult(parsed.result);
  if (!browserSessionId) {
    return;
  }

  const browserShellStore = useBrowserShellStore();
  const { setActiveTab } = useRightSideTabs();

  try {
    await browserShellStore.focusSession(browserSessionId);
    setActiveTab('browser');
  } catch (error) {
    console.warn(
      '[handleBrowserToolExecutionSucceeded] Failed to focus browser session after open_tab.',
      error,
    );
  }
};
