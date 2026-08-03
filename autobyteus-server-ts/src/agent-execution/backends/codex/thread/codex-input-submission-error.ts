export type CodexInputSubmissionErrorCode =
  | "CODEX_TURN_START_RESPONSE_INVALID"
  | "CODEX_TURN_START_IDENTITY_CONFLICT"
  | "CODEX_TURN_STEER_RESPONSE_INVALID"
  | "CODEX_TURN_STEER_ID_MISMATCH"
  | "CODEX_TURN_STEER_REJECTED";

export class CodexInputSubmissionError extends Error {
  readonly code: CodexInputSubmissionErrorCode;
  override readonly cause?: unknown;

  constructor(
    code: CodexInputSubmissionErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message);
    this.name = "CodexInputSubmissionError";
    this.code = code;
    this.cause = options.cause;
  }
}
