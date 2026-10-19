import { splitLines } from "./output-shortener.js";

/** Contract §7: what happened to one tool call. `kind` is the single outcome discriminator. */
export type ToolOutcome =
  | Readonly<{ kind: "ok"; note: string | null }>
  | Readonly<{ kind: "exit"; code: number }>
  | Readonly<{ kind: "failed"; error: string | null }>
  | Readonly<{ kind: "denied"; reason: string | null }>
  | Readonly<{ kind: "rejected" }>
  | Readonly<{ kind: "interrupted" }>
  | Readonly<{ kind: "timed_out" }>
  | Readonly<{ kind: "no_result" }>
  | Readonly<{ kind: "started"; pid: number | null }>;

/** A recorded result after envelopes and runtime texts are removed. */
export type NormalizedToolResult = Readonly<{ outcome: ToolOutcome; output: string | null }>;

export const OK: ToolOutcome = Object.freeze({ kind: "ok", note: null });
export const okWith = (note: string): ToolOutcome => ({ kind: "ok", note });
export const NO_RESULT: NormalizedToolResult = Object.freeze({
  outcome: Object.freeze({ kind: "no_result" as const }),
  output: null,
});

const INLINE_ERROR_CHARS = 200;

/** The outcome text after `→`, and error text that is too long for the line (shown as output). */
export const formatOutcome = (outcome: ToolOutcome): Readonly<{ text: string; errorOutput: string | null }> => {
  switch (outcome.kind) {
    case "ok": return { text: outcome.note ? `ok (${outcome.note})` : "ok", errorOutput: null };
    case "exit": return { text: `exit ${outcome.code}`, errorOutput: null };
    case "failed": {
      const error = outcome.error?.trim() ?? "";
      if (!error) return { text: "failed", errorOutput: null };
      const inline = splitLines(error).length === 1 && Array.from(error).length <= INLINE_ERROR_CHARS;
      return inline ? { text: `failed: ${error}`, errorOutput: null } : { text: "failed", errorOutput: error };
    }
    case "denied": return { text: outcome.reason ? `denied: ${outcome.reason}` : "denied", errorOutput: null };
    case "rejected": return { text: "rejected by the user", errorOutput: null };
    case "interrupted": return { text: "interrupted", errorOutput: null };
    case "timed_out": return { text: "timed out", errorOutput: null };
    case "no_result": return { text: "no result in this file", errorOutput: null };
    case "started": return { text: outcome.pid === null ? "started" : `started pid ${outcome.pid}`, errorOutput: null };
  }
};
