import { ToolCallDelta } from '../utils/tool-call-delta.js';

type GeminiFunctionCall = {
  id?: string;
  name?: string;
  args?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function convertGeminiToolCalls(part: unknown): ToolCallDelta[] | null {
  if (!isObject(part)) return null;

  const functionCall = (part as { functionCall?: GeminiFunctionCall }).functionCall;
  if (!functionCall || !isObject(functionCall)) {
    return null;
  }

  const args = functionCall.args ?? {};
  let argumentsDelta = '{}';
  try {
    argumentsDelta = JSON.stringify(args);
  } catch {
    argumentsDelta = '{}';
  }

  return [
    {
      index: 0,
      call_id: typeof functionCall.id === 'string' ? functionCall.id : undefined,
      name: typeof functionCall.name === 'string' ? functionCall.name : undefined,
      arguments_delta: argumentsDelta
    }
  ];
}
