import { ToolCallPayload, ToolResultPayload } from '../utils/messages.js';
import {
  formatToolPayloadValueJson,
  formatToolPayloadValuePython,
} from './tool-payload-format.js';

export type LegacyToolHistoryValueStyle = 'json' | 'python';

const formatValue = (value: unknown, style: LegacyToolHistoryValueStyle): string => {
  if (style === 'json') {
    return Array.isArray(value) || typeof value === 'object'
      ? formatToolPayloadValueJson(value)
      : String(value ?? '');
  }
  return formatToolPayloadValuePython(value);
};

export const formatLegacyToolCallHistory = (
  payload: ToolCallPayload,
  style: LegacyToolHistoryValueStyle
): string =>
  payload.toolCalls
    .map((call) => `[TOOL_CALL] ${call.name} ${formatValue(call.arguments, style)}`)
    .join('\n');

export const formatLegacyToolResultHistory = (
  payload: ToolResultPayload,
  style: LegacyToolHistoryValueStyle
): string => {
  if (payload.toolError) {
    return `[TOOL_ERROR] ${payload.toolName} ${payload.toolError}`;
  }
  return `[TOOL_RESULT] ${payload.toolName} ${formatValue(payload.toolResult ?? '', style)}`;
};

export const appendHistoryContent = (
  content: string | null | undefined,
  historyLine: string
): string =>
  [content?.trim(), historyLine]
    .filter((value): value is string => Boolean(value))
    .join('\n');
