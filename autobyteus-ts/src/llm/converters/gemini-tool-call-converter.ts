import { ToolCallDelta } from '../utils/tool-call-delta.js';

type GeminiFunctionCall = {
  id?: string;
  name?: string;
  args?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function convertGeminiToolCalls(part: unknown, index = 0): ToolCallDelta[] | null {
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
      index,
      call_id: typeof functionCall.id === 'string' ? functionCall.id : undefined,
      name: typeof functionCall.name === 'string' ? functionCall.name : undefined,
      arguments_delta: argumentsDelta,
      native_context: {
        provider: 'gemini',
        functionCallPart: part as Record<string, unknown>
      }
    }
  ];
}

export function convertGeminiToolCallParts(parts: unknown[], startIndex = 0): ToolCallDelta[] | null {
  const deltas: ToolCallDelta[] = [];
  let nextIndex = startIndex;
  for (const part of parts) {
    const converted = convertGeminiToolCalls(part, nextIndex);
    if (converted) {
      deltas.push(...converted);
      nextIndex += converted.length;
    }
  }
  return deltas.length ? deltas : null;
}
