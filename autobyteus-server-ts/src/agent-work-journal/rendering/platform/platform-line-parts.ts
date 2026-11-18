import { asText } from "../command-text.js";
import { confirmedOutcome } from "../journal-actions.js";
import { splitLines } from "../output-shortener.js";
import type { BodyPart, BuiltInLine, RecordedCall } from "../runtimes/runtime-translation.js";
import { DELIVERED, NO_RESULT, OK, type NormalizedToolResult, type ToolOutcome } from "../tool-outcome.js";

/**
 * Line parts the platform converters share. Every function here is used by at least two families;
 * a part one family needs stays in that family.
 */

/** One platform tool's neutral line; it receives the result already normalized by the run's translation. */
export type PlatformToolConverter = (call: RecordedCall, result: NormalizedToolResult | null) => BuiltInLine;

export const quoted = (text: string): string => JSON.stringify(text);

/** The first line of a text, or the fallback when there is none. */
export const firstLineOf = (text: string | null, fallback: string): string =>
  splitLines(text ?? "")[0]?.trim() || fallback;

/** A text as the message part of a line (nothing for a missing text). */
export const messageParts = (text: string | null): BodyPart[] => text === null ? [] : [{ kind: "message", text }];

const resultParts = (result: NormalizedToolResult | null): BodyPart[] =>
  result?.output ? [{ kind: "output", text: result.output }] : [];

/** A read tool: the outcome as recorded, the result below. */
export const readLine = (head: string, result: NormalizedToolResult | null): BuiltInLine =>
  ({ head, outcome: (result ?? NO_RESULT).outcome, parts: resultParts(result) });

/** An action tool: a success confirmation is not shown, a failure keeps its text; `parts` come first. */
export const actionLine = (head: string, result: NormalizedToolResult | null, parts: readonly BodyPart[] = []): BuiltInLine => {
  const settled = confirmedOutcome(result);
  return { head, outcome: settled.outcome, parts: [...parts, ...settled.parts] };
};

/** Who a message or task goes to, as the call gave it: an address, a name or a run ID. */
export const recipientOf = (args: Readonly<Record<string, unknown>>): string | null => {
  const named = asText(args.recipient_address) ?? asText(args.recipient_name);
  if (named) return named;
  const run = asText(args.target_agent_run_id);
  if (run) return `run ${run}`;
  const team = asText(args.target_team_run_id);
  return team ? `team run ${team}` : null;
};

/** Text items of a list argument; anything else is ignored. */
export const textItems = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

const parseObject = (text: string | null): Record<string, unknown> | null => {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

/**
 * What happened to a message or a task handed over: `delivered` when the platform accepted it,
 * `failed: <the platform's message>` when it refused (the tool call itself ran), else as recorded.
 */
export const acceptanceOutcome = (result: NormalizedToolResult | null): ToolOutcome => {
  if (!result) return NO_RESULT.outcome;
  const { outcome } = result;
  if (outcome.kind === "failed" && outcome.error) {
    const refusal = parseObject(outcome.error);
    return typeof refusal?.message === "string" ? { kind: "failed", error: refusal.message } : outcome;
  }
  if (outcome.kind !== "ok") return outcome;
  const answer = parseObject(result.output);
  if (answer?.accepted === false) {
    return { kind: "failed", error: typeof answer.message === "string" ? answer.message : asText(answer.code) };
  }
  return answer?.accepted === true ? DELIVERED : OK;
};
