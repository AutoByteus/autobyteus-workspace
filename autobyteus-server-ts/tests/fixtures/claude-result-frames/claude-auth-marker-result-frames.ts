/**
 * Real Claude Agent SDK turn frames (SDK 0.3.280) captured in
 * tickets/in-progress/claude-normal-reply-auth-error-misclassification/probe-evidence/.
 * Usage, cost, timing and subagent statistics are dropped; every field the session or
 * turn tracker reads is kept verbatim. Each export preserves the observed order.
 */
export type ClaudeFrame = Record<string, unknown>;

/** sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl: a successful turn whose reply contains every auth marker. */
export const CLAUDE_NORMAL_REPLY_MENTIONING_LOGIN_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "assistant",
    "message": {
      "model": "claude-haiku-4-5-20251001",
      "id": "msg_011Cfx5jQRswsmPeHdkMrCa5",
      "type": "message",
      "role": "assistant",
      "content": [{ "type": "text", "text": "A runtime that is installed but not logged in says \"Not logged in · Please run /login\" (authentication_failed)." }],
      "stop_reason": null,
    },
    "parent_tool_use_id": null,
    "session_id": "13d714ae-2300-4dd7-bfbe-439bdf6dd5c8",
    "uuid": "87466f24-2fe6-4729-9cb5-4d56bd186c01",
  },
  {
    "type": "result",
    "subtype": "success",
    "is_error": false,
    "terminal_reason": "completed",
    "stop_reason": "end_turn",
    "api_error_status": null,
    "num_turns": 1,
    "result": "A runtime that is installed but not logged in says \"Not logged in · Please run /login\" (authentication_failed).",
    "session_id": "13d714ae-2300-4dd7-bfbe-439bdf6dd5c8",
    "uuid": "83a52df1-8955-46c5-8d17-348269093ea8",
  },
];

/** sdk-0.3.280-not-logged-in.frames.jsonl: a turn on a CLI with no credentials. */
export const CLAUDE_NOT_LOGGED_IN_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "assistant",
    "message": {
      "id": "92803cdc-3101-431a-b001-327b2f8d6120",
      "model": "<synthetic>",
      "role": "assistant",
      "type": "message",
      "stop_reason": "stop_sequence",
      "stop_sequence": "",
      "content": [{ "type": "text", "text": "Not logged in · Please run /login" }],
    },
    "parent_tool_use_id": null,
    "session_id": "50b1fe1c-5378-48ae-b1b2-e2f9308f1916",
    "uuid": "c4250577-32a2-445d-be2d-e508e1330119",
    "error": "authentication_failed",
    "is_api_error_message": true,
  },
  {
    "type": "result",
    "subtype": "success",
    "is_error": true,
    "terminal_reason": "api_error",
    "stop_reason": "stop_sequence",
    "api_error_status": null,
    "num_turns": 1,
    "result": "Not logged in · Please run /login",
    "session_id": "50b1fe1c-5378-48ae-b1b2-e2f9308f1916",
    "uuid": "5feefdcb-6682-4e76-a1d6-395197230eeb",
  },
];

export const claudeResultFrame = (frames: readonly ClaudeFrame[]): ClaudeFrame =>
  frames.find((frame) => frame.type === "result")!;
