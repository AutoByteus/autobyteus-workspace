import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GROK_ACP_FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/grok-acp",
);

export const grokAcpFixturePath = (name: string): string => path.join(GROK_ACP_FIXTURES, `${name}.jsonl`);

export type FakeGrokCommand = Readonly<{ command: string; dir: string }>;

/**
 * Executable `grok` stand-in for `GROK_BUILD_COMMAND`: runs the recorded-fixture fake CLI
 * (`tests/fixtures/grok-acp/fake-grok-cli.mjs`) under the current Node binary. It reads
 * `FAKE_GROK_VERSION`, `FAKE_ACP_FIXTURE` and the other fake-agent switches from the
 * server environment it inherits, so it costs no Grok credits.
 */
export const createFakeGrokCommand = async (): Promise<FakeGrokCommand> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fake-grok-cli-"));
  const command = path.join(dir, "grok");
  const script = path.join(GROK_ACP_FIXTURES, "fake-grok-cli.mjs");
  await fs.writeFile(command, `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`, { mode: 0o755 });
  return { command, dir };
};

/** Sets environment variables for one test and returns a function restoring the previous values. */
export const overrideEnv = (values: Record<string, string | undefined>): (() => void) => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const apply = (entries: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  apply(values);
  return () => apply(previous);
};

/** One script row of the fake ACP agent (`tests/fixtures/grok-acp/fake-acp-agent.mjs`), a pause included. */
export type GrokScriptRow =
  | Readonly<{ dir: "in" | "out"; msg: Record<string, any> }>
  | Readonly<{ dir: "pause"; ms: number }>;

/**
 * The frame orders of Grok Build's own prompts, as the probes of autobyteus-517 recorded them (Grok 1.0.88, the
 * ticket grok-self-started-turns-517's `evidence/grok-acp-probe*.jsonl`), for one session:
 * - (a) a prompt Grok starts itself after the input turn ended (probe 1): wake, reasoning, a tool call, text, usage, end;
 * - (b) a background job ending during an input turn (probe 2 A): the input prompt's `turn_completed`, Grok's queued
 *   prompt running, `prompt_complete`, then the `session/prompt` response; the queued prompt's content after it;
 * - (c) a provider prompt the client cancels (probe 2 B): `session/cancel`, then `turn_completed(cancelled)`.
 * The pauses stand for the model's time after a wake (≥1.2 s in the probes), so a test can act during a turn.
 */
export const grokProviderTurnScript = (sessionId: string) => {
  const inputPrompt = "8876a0c8-d01e-4f53-8ad5-fd54f3a1b947";
  const wake = "task-completed-f60f2c3b-fbd0-4e61-8d85-01ffebf0ed56";
  const reminder = "<system-reminder>\nBackground task \"f60f2c3b\" completed (exit code: 0).\n"
    + "Description: Run job.sh in the background | Duration: 60.1s\n"
    + "Use get_command_or_subagent_output(\"f60f2c3b\") to see the full output.\n</system-reminder>";
  const ext = (method: string, params: Record<string, unknown>): GrokScriptRow =>
    ({ dir: "in", msg: { jsonrpc: "2.0", method, params: { sessionId, ...params } } });
  const update = (value: Record<string, unknown>): GrokScriptRow =>
    ({ dir: "in", msg: { jsonrpc: "2.0", method: "session/update", params: { sessionId, update: value } } });
  const running = (promptId: string, text: string) =>
    ext("_x.ai/queue/changed", { entries: [], runningPromptId: promptId, runningText: text, runningKind: "prompt" });
  const turnCompleted = (promptId: string, stopReason: string) =>
    ext("_x.ai/session_notification", { update: { sessionUpdate: "turn_completed", prompt_id: promptId, stop_reason: stopReason } });
  const promptComplete = (promptId: string) =>
    ext("_x.ai/session/prompt_complete", { promptId, stopReason: "end_turn", agentResult: null });
  const text = (kind: "agent_message_chunk" | "agent_thought_chunk", value: string, promptId: string) =>
    update({ sessionUpdate: kind, content: { type: "text", text: value }, _meta: { promptId } });
  const usage = () => ext("_x.ai/session_notification", { update: { sessionUpdate: "response_completed",
    usage: { input_tokens: 15931, output_tokens: 99, cache_read_input_tokens: 2176, cache_creation_input_tokens: 0, reasoning_tokens: 98 } } });
  const prompt = (id: number): GrokScriptRow => ({ dir: "out", msg: { jsonrpc: "2.0", id, method: "session/prompt", params: { sessionId } } });
  const result = (id: number): GrokScriptRow => ({ dir: "in", msg: { jsonrpc: "2.0", id, result: { stopReason: "end_turn" } } });
  const pause = (ms: number): GrokScriptRow => ({ dir: "pause", ms });
  /** An input prompt that ends with Grok's own prompt end before its response (probe 1). */
  const inputTurn = (id: number, words: string): GrokScriptRow[] => [prompt(id), running(inputPrompt, words),
    text("agent_message_chunk", "STARTED", inputPrompt), ext("_x.ai/queue/changed", { entries: [] }),
    turnCompleted(inputPrompt, "end_turn"), promptComplete(inputPrompt), result(id)];
  /** A message the run held: Grok receives it only after its own prompt ended. */
  const heldMessage = (id: number): GrokScriptRow[] => [prompt(id), text("agent_message_chunk", "HELD-MESSAGE-ANSWERED", `held-${id}`), result(id)];
  const providerContent: GrokScriptRow[] = [text("agent_thought_chunk", "The background job finished.", wake),
    update({ sessionUpdate: "tool_call", toolCallId: "call-wake-1", title: "read_file", status: "in_progress",
      rawInput: { target_file: "job.out" }, _meta: { "x.ai/tool": { name: "read_file" } } }),
    update({ sessionUpdate: "tool_call_update", toolCallId: "call-wake-1", status: "completed", rawOutput: "PROBE_DONE" }),
    text("agent_message_chunk", "FINISHED", wake), usage(), turnCompleted(wake, "end_turn")];
  return {
    notice: reminder.replace("<system-reminder>", "").replace("</system-reminder>", "").trim(),
    /** (a): after the input turn, a finished tool's late update, then Grok's wake; `then` follows its end. */
    orderA: (then: GrokScriptRow[] = [], pauseMs = 1_500): GrokScriptRow[] => [...inputTurn(99, "Run job.sh in the background."),
      update({ sessionUpdate: "tool_call_update", toolCallId: "call-bg-0", status: "completed" }),
      ext("_x.ai/queue/changed", { entries: [] }), running(wake, reminder), pause(pauseMs), ...providerContent, ...then],
    /** (b): a message held during the input turn (sent in the pause) waits through Grok's prompt and is answered after it. */
    orderB: (pauseMs = 1_500): GrokScriptRow[] => [prompt(99), running(inputPrompt, "Start the job, then run long.sh."),
      text("agent_message_chunk", "working", inputPrompt), pause(pauseMs), running(inputPrompt, "Start the job, then run long.sh."),
      ext("_x.ai/queue/changed", { entries: [] }), turnCompleted(inputPrompt, "end_turn"), running(wake, reminder),
      promptComplete(inputPrompt), result(99), pause(1_200), ...providerContent, ...heldMessage(100)],
    /**
     * (b'): as (b), but the pause is in the hand-over's gap: after Grok's `turn_completed(input)` and its
     * `queue/changed(provider)`, before `prompt_complete(input)` and the `session/prompt` response. A message sent in the
     * pause reaches the run while the input prompt is complete for Grok but its response has not arrived.
     */
    orderBGap: (gapMs = 3_000): GrokScriptRow[] => [prompt(99), running(inputPrompt, "Start the job, then run long.sh."),
      text("agent_message_chunk", "working", inputPrompt), ext("_x.ai/queue/changed", { entries: [] }),
      turnCompleted(inputPrompt, "end_turn"), running(wake, reminder), pause(gapMs),
      promptComplete(inputPrompt), result(99), pause(1_200), ...providerContent, ...heldMessage(100)],
    /** (c): Grok's wake; the client cancels it (in the pause); Grok ends it `cancelled` at once. */
    orderC: (pauseMs = 1_500): GrokScriptRow[] => [...inputTurn(99, "Run job.sh in the background."), running(wake, reminder),
      text("agent_thought_chunk", "Running the next step.", wake), pause(pauseMs),
      { dir: "out", msg: { jsonrpc: "2.0", method: "session/cancel" } }, turnCompleted(wake, "cancelled")],
    heldMessage,
  };
};
