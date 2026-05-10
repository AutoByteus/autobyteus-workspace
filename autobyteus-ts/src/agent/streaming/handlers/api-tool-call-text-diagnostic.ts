export interface ApiToolCallTextDiagnostic {
  code: 'api_tool_call_text_leak';
  message: string;
  details: string;
  snippet: string;
}

const MAX_SNIPPET_LENGTH = 240;
const TEXT_TOOL_CALL_PATTERN = /\[TOOL_CALL\]\s+[A-Za-z_][\w.-]*(?:\s+\{[\s\S]*?\})?/i;

function buildSnippet(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= MAX_SNIPPET_LENGTH) {
    return compact;
  }
  return `${compact.slice(0, MAX_SNIPPET_LENGTH)}…`;
}

export function detectApiToolCallTextLeak(
  text: string,
  parsedNativeToolInvocationCount: number
): ApiToolCallTextDiagnostic | null {
  if (parsedNativeToolInvocationCount > 0 || !text) {
    return null;
  }

  const match = TEXT_TOOL_CALL_PATTERN.exec(text);
  if (!match) {
    return null;
  }

  const snippet = buildSnippet(text);
  return {
    code: 'api_tool_call_text_leak',
    message:
      'Native API tool-call mode received assistant text that looks like a legacy [TOOL_CALL] payload, but parsed zero native tool_calls. The text was kept as assistant output and no tool was executed.',
    details: `Matched text-tool syntax near: ${snippet}`,
    snippet
  };
}
