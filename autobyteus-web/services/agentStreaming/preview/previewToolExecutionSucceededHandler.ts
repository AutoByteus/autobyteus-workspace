import type { ToolExecutionSucceededPayload } from '../protocol/messageTypes';
import { parseToolExecutionSucceededPayload } from '../handlers/toolLifecycleParsers';
import { usePreviewShellStore } from '~/stores/previewShellStore';
import { useRightSideTabs } from '~/composables/useRightSideTabs';

const OPEN_PREVIEW_TOOL_NAME = 'open_preview';

const extractPreviewSessionIdFromResult = (result: unknown): string | null => {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const value = (result as { preview_session_id?: unknown }).preview_session_id;
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result) as { preview_session_id?: unknown };
      const previewSessionId = parsed?.preview_session_id;
      return typeof previewSessionId === 'string' && previewSessionId.trim().length > 0
        ? previewSessionId.trim()
        : null;
    } catch {
      return null;
    }
  }

  return null;
};

export const handlePreviewToolExecutionSucceeded = async (
  payload: ToolExecutionSucceededPayload,
): Promise<void> => {
  const parsed = parseToolExecutionSucceededPayload(payload);
  if (!parsed || parsed.toolName !== OPEN_PREVIEW_TOOL_NAME) {
    return;
  }

  const previewSessionId = extractPreviewSessionIdFromResult(parsed.result);
  if (!previewSessionId) {
    return;
  }

  const previewShellStore = usePreviewShellStore();
  const { setActiveTab } = useRightSideTabs();

  try {
    await previewShellStore.focusSession(previewSessionId);
    setActiveTab('preview');
  } catch (error) {
    console.warn(
      '[handlePreviewToolExecutionSucceeded] Failed to focus preview session after open_preview.',
      error,
    );
  }
};
