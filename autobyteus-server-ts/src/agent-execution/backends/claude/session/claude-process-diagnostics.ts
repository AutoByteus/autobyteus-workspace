const MAX_DIAGNOSTIC_CHARS = 4_000;
const MAX_DIAGNOSTIC_LINES = 20;

const SECRET_REDACTIONS: Array<[RegExp, string]> = [
  [
    /\b([A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*)\s*=\s*([^\s"'`]+)/gi,
    "$1=[redacted]",
  ],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]"],
  [/\bsk-ant-[A-Za-z0-9_-]+/gi, "[redacted-api-key]"],
];

const toDiagnosticText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return String(value);
};

export const redactClaudeDiagnosticText = (value: string): string => {
  let redacted = value;
  for (const [pattern, replacement] of SECRET_REDACTIONS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
};

const normalizeDiagnosticSummary = (value: string): string | null => {
  const normalizedLines = value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(-MAX_DIAGNOSTIC_LINES);
  if (normalizedLines.length === 0) {
    return null;
  }
  return normalizedLines.join("\n").slice(-MAX_DIAGNOSTIC_CHARS);
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const formatClaudeRuntimeError = (error: unknown): string =>
  redactClaudeDiagnosticText(error instanceof Error ? error.message : String(error));

export class ClaudeProcessDiagnostics {
  private buffer = "";

  append(value: unknown): void {
    const next = redactClaudeDiagnosticText(toDiagnosticText(value));
    if (!next) {
      return;
    }
    this.buffer = `${this.buffer}${next}`.slice(-MAX_DIAGNOSTIC_CHARS);
  }

  summarize(): string | null {
    const redactedBuffer = redactClaudeDiagnosticText(this.buffer);
    const summary = normalizeDiagnosticSummary(redactedBuffer);
    return summary ? redactClaudeDiagnosticText(summary) : null;
  }
}

export const enrichClaudeRuntimeErrorWithDiagnostics = (
  error: unknown,
  diagnostics: ClaudeProcessDiagnostics,
): unknown => {
  const summary = diagnostics.summarize();
  if (!summary) {
    return error;
  }
  const originalMessage = redactClaudeDiagnosticText(resolveErrorMessage(error));
  if (originalMessage.includes(summary)) {
    return error;
  }
  return new Error(`${originalMessage}\nClaude Code diagnostics:\n${summary}`, {
    cause: error,
  });
};
