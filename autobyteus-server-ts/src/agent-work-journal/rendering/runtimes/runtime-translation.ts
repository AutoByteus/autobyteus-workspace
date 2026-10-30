import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { NormalizedToolResult, ToolOutcome } from "../tool-outcome.js";
import { normalizeRecordedResult } from "../result-envelopes.js";
import { antigravityTranslation } from "./antigravity-translation.js";
import { autobyteusTranslation } from "./autobyteus-translation.js";
import { claudeTranslation } from "./claude-translation.js";
import { codexTranslation } from "./codex-translation.js";
import { grokTranslation } from "./grok-translation.js";

/** A tool call as recorded: its name and arguments. */
export type RecordedCall = Readonly<{ name: string; args: Readonly<Record<string, unknown>> }>;

/** A tool result as recorded: `tool_result` and `tool_error`. */
export type RecordedResult = Readonly<{ value: unknown; error: string | null }>;

/** Detail shown under an action line; the renderer applies the §7 limits to each kind. */
export type BodyPart =
  /** Further lines of a multi-line command, shown under the action line. */
  | Readonly<{ kind: "command"; lines: readonly string[] }>
  /** Command or tool output: first and last lines when long. */
  | Readonly<{ kind: "output"; text: string }>
  /** Diff lines: the first lines when long. */
  | Readonly<{ kind: "diff"; lines: readonly string[] }>
  /** Written file content: the first lines when long. */
  | Readonly<{ kind: "content"; text: string }>
  /** The free text of a message or a task, shown with the argument line limit. */
  | Readonly<{ kind: "message"; text: string }>
  /** A generic tool's long or multi-line argument, on its own `<key>:` lines (§5). */
  | Readonly<{ kind: "argument"; key: string; text: string }>
  /** A generic tool's result under a `result:` line, used when argument lines are present (§5). */
  | Readonly<{ kind: "labeled_result"; text: string }>;

/** A tool of another server: the tool and the server it belongs to. */
export type QualifiedToolName = Readonly<{ tool: string; server: string }>;

/** One built-in call as a plain action line: the head (`Command: …`), outcome and details. */
export type BuiltInLine = Readonly<{ head: string; outcome: ToolOutcome; parts: readonly BodyPart[] }>;

export type BuiltInConverter = (call: RecordedCall, result: RecordedResult | null) => BuiltInLine;

/**
 * One runtime's part of the contract (principle 11): its built-in table (§4) and its runtime
 * texts and envelopes (§6). Adding a runtime adds a translation; the format never changes.
 */
export type RuntimeTranslation = Readonly<{
  /** The runtime label of the journal header. */
  label: string;
  /**
   * The runtime's own tools by recorded name: built-in and runtime-only tools (contract §4). A name
   * that is not here goes to the platform converters, then the generic rule (`toolCallLine`).
   */
  builtInTools: ReadonlyMap<string, BuiltInConverter>;
  /** A result with this runtime's envelopes and runtime texts removed. */
  normalizeResult(result: RecordedResult): NormalizedToolResult;
  /** Rewrites an older wrapped call into its recorded inner call (AGY `call_mcp_tool`). */
  unwrapCall?(call: RecordedCall): RecordedCall;
  /** Splits a name this runtime qualifies with its server (`server.tool`); null for an unqualified name. */
  splitToolName?(name: string): QualifiedToolName | null;
  normalizeAgentText?(text: string): string;
  normalizeUserText?(text: string): string;
}>;

/** No runtime named, or a runtime without a translation yet: every tool uses the generic rule. */
const genericTranslation: RuntimeTranslation = Object.freeze({
  label: "unknown",
  builtInTools: new Map(),
  normalizeResult: (result: RecordedResult) => normalizeRecordedResult(result),
});

let registry: ReadonlyMap<string, RuntimeTranslation> | null = null;

export const getRuntimeTranslation = (runtimeKind: RuntimeKind | string | null): RuntimeTranslation => {
  registry ??= new Map<string, RuntimeTranslation>([
    [RuntimeKind.CLAUDE_AGENT_SDK, claudeTranslation],
    [RuntimeKind.CODEX_APP_SERVER, codexTranslation],
    [RuntimeKind.ANTIGRAVITY_CLI, antigravityTranslation],
    [RuntimeKind.GROK_BUILD, grokTranslation],
    [RuntimeKind.AUTOBYTEUS, autobyteusTranslation],
  ]);
  return (runtimeKind && registry.get(runtimeKind)) || genericTranslation;
};
