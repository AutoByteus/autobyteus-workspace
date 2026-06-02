import type { AgentInputUserMessage } from './agent-input-user-message.js';

export const TOOL_CONTINUATION_MODE_METADATA_KEY = 'tool_continuation_mode';
export const NATIVE_API_TOOL_CONTINUATION_MODE = 'native_api';
export const TOOL_HISTORY_ONLY_CONTINUATION_MODE = 'tool_history_only';

export type ToolContinuationMode =
  | typeof NATIVE_API_TOOL_CONTINUATION_MODE
  | typeof TOOL_HISTORY_ONLY_CONTINUATION_MODE;

export function getToolContinuationMode(message: AgentInputUserMessage): ToolContinuationMode | null {
  const mode = message.metadata?.[TOOL_CONTINUATION_MODE_METADATA_KEY];
  if (mode === NATIVE_API_TOOL_CONTINUATION_MODE) {
    return NATIVE_API_TOOL_CONTINUATION_MODE;
  }
  return mode === TOOL_HISTORY_ONLY_CONTINUATION_MODE ? TOOL_HISTORY_ONLY_CONTINUATION_MODE : null;
}
