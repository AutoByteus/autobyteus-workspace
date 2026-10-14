import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { CodexAgentRunContext } from "../../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexThread } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread.js";
import { CodexModelCallTiming } from "../../../../../../src/agent-execution/backends/codex/thread/codex-model-call-timing.js";
import { CodexApprovalPolicy } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { createCodexThreadStartupGate } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-startup-gate.js";
import { createTokenUsageUpdatedPayload } from "../../../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import type { CodexReadyTokenUsageUpdate } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-token-usage.js";

const repoRoot = path.resolve(__dirname, "../../../../../../..");
/** Live codex-cli 0.162.1 app-server stdout captured by API/E2E (API-L03/L04), one JSON line per frame. */
const liveWire = (sample: "codex" | "codex-repeat") =>
  path.join(repoRoot, `tickets/in-progress/output-tps-precision/evidence/api-e2e/live/${sample}/codex-wire.jsonl`);
/** Recorded codex-cli 0.161.0 probes (no raw events) from token-meter-accuracy. */
const probe = (name: string) => path.join(repoRoot, "tickets/done/token-meter-accuracy/probes", name);

const createThread = (autoExecuteTools = true) => {
  let clock = 0;
  const thread = new CodexThread({
    runContext: new AgentRunContext({
      runId: "codex-run",
      config: new AgentRunConfig({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "def",
        llmModelIdentifier: "gpt-6.1-sol", autoExecuteTools, workspaceId: null, llmConfig: null }),
      runtimeContext: new CodexAgentRunContext({
        codexThreadConfig: { model: "gpt-6.1-sol", workingDirectory: "/tmp/codex-tps", reasoningEffort: "medium",
          serviceTier: null, approvalPolicy: autoExecuteTools ? CodexApprovalPolicy.NEVER : CodexApprovalPolicy.ON_REQUEST,
          sandbox: "workspace-write", baseInstructions: null, developerInstructions: null, dynamicTools: [] },
        dynamicToolHandlers: null,
      }),
    }),
    client: { request: vi.fn(), respondSuccess: vi.fn(), respondError: vi.fn() } as never,
    startup: createCodexThreadStartupGate(),
    modelCallTiming: new CodexModelCallTiming(() => clock),
  });
  const updates: CodexReadyTokenUsageUpdate[] = [];
  const drain = () => {
    for (const update of thread.getReadyTokenUsageUpdates()) {
      updates.push(update);
      thread.markTokenUsageUpdatePersisted(update.idempotency_key);
    }
  };
  const notify = (atMs: number, method: string, params: Record<string, unknown>) => {
    clock = atMs;
    thread.handleAppServerNotification(method, params as never);
    drain();
  };
  return { thread, updates, notify, at: (ms: number) => { clock = ms; } };
};

/** Replays every notification of a live wire capture at its recorded receipt time. */
const replayLiveWire = (file: string) => {
  const harness = createThread();
  for (const line of fs.readFileSync(file, "utf8").split("\n").filter(Boolean)) {
    const frame = JSON.parse(line) as { t: number; line?: string };
    if (!frame.line) continue;
    const message = JSON.parse(frame.line) as { id?: unknown; method?: string; params?: Record<string, unknown> };
    if (message.method && message.id === undefined) harness.notify(frame.t, message.method, message.params ?? {});
  }
  return harness.updates;
};

const usageParams = (turnId: string, last: Record<string, number>, total: Record<string, number> = last) =>
  ({ threadId: "thread", turnId, tokenUsage: { last, total } });
const tokens = (output: number, input = 900) =>
  ({ inputTokens: input, outputTokens: output, totalTokens: input + output, cachedInputTokens: 0, reasoningOutputTokens: 0 });
const accepted = (update: CodexReadyTokenUsageUpdate) => createTokenUsageUpdatedPayload({ runId: "codex-run",
  payload: { ...update } as unknown as Record<string, unknown> }).output_throughput;

describe("Codex per-call TPS (DEC-002 end to end, SR-006)", () => {
  it("ends each call at rawResponse/completed and excludes the tool, live sample 1 (API-L03/L04)", () => {
    const updates = replayLiveWire(liveWire("codex"));
    expect(updates.map((update) => update.output_throughput)).toEqual([
      // L03 single call: user input done 2,458 → rawResponse/completed 5,445.
      { method: "end_to_end", output_tokens: 210, duration_ms: 2987 },
      // L04 call A: user input done 1,788, frozen by reasoning at 2,623, ends 3,669 (usage only at 6,870).
      { method: "end_to_end", output_tokens: 112, duration_ms: 1881 },
      // L04 call B: the tool's item/started (3,980) does not freeze; its item/completed 6,867 → end 9,248.
      { method: "end_to_end", output_tokens: 173, duration_ms: 2381 },
    ]);
    expect((112 / 1.881).toFixed(1)).toBe("59.5");
    expect((173 / 2.381).toFixed(1)).toBe("72.7");
  });

  it("does the same on live sample 2", () => {
    expect(replayLiveWire(liveWire("codex-repeat")).map((update) => update.output_throughput)).toEqual([
      { method: "end_to_end", output_tokens: 115, duration_ms: 3168 - 1651 },
      { method: "end_to_end", output_tokens: 158, duration_ms: 8511 - 6252 },
    ]);
  });

  it("uses the server's approval reply as a request boundary", async () => {
    const { thread, updates, notify, at } = createThread(false);
    notify(0, "turn/started", { threadId: "thread", turn: { id: "turn-1" } });
    notify(100, "item/completed", { threadId: "thread", turnId: "turn-1", item: { type: "userMessage", id: "u" } });
    notify(200, "item/started", { threadId: "thread", turnId: "turn-1", item: { type: "reasoning", id: "r1" } });
    notify(1000, "rawResponse/completed", { threadId: "thread", turnId: "turn-1", usage: tokens(50) });
    notify(1100, "item/started", { threadId: "thread", turnId: "turn-1", item: { type: "commandExecution", id: "cmd-1" } });
    at(1200);
    thread.handleAppServerRequest("req-1", "item/commandExecution/requestApproval",
      { threadId: "thread", turnId: "turn-1", itemId: "cmd-1", command: "sleep 3" });
    await Promise.resolve();
    at(5000); // the user approves after waiting
    await thread.approveTool("cmd-1", true);
    notify(5001, "thread/tokenUsage/updated", usageParams("turn-1", tokens(50)));
    notify(7600, "item/started", { threadId: "thread", turnId: "turn-1", item: { type: "reasoning", id: "r2" } });
    notify(8000, "rawResponse/completed", { threadId: "thread", turnId: "turn-1", usage: tokens(100, 1000) });
    notify(8002, "thread/tokenUsage/updated", usageParams("turn-1", tokens(100, 1000), tokens(150, 1900)));
    expect(updates.map((update) => update.output_throughput)).toEqual([
      { method: "end_to_end", output_tokens: 50, duration_ms: 900 },
      // The approval wait (1,000 → 5,000) is excluded: the next call starts at the reply.
      { method: "end_to_end", output_tokens: 100, duration_ms: 3000 },
    ]);
  });

  it("gives null on a token mismatch or without rawResponse/completed, and never uses usage arrival", () => {
    const { updates, notify } = createThread();
    notify(0, "turn/started", { threadId: "thread", turn: { id: "turn-1" } });
    notify(500, "item/started", { threadId: "thread", turnId: "turn-1", item: { type: "agentMessage", id: "m1" } });
    notify(2000, "rawResponse/completed", { threadId: "thread", turnId: "turn-1", usage: tokens(300) });
    notify(2003, "thread/tokenUsage/updated", usageParams("turn-1", tokens(299)));
    notify(3000, "item/started", { threadId: "thread", turnId: "turn-1", item: { type: "agentMessage", id: "m2" } });
    notify(6000, "thread/tokenUsage/updated", usageParams("turn-1", tokens(400), tokens(699, 1800)));
    expect(updates.map((update) => update.output_throughput)).toEqual([null, null]);
  });

  it("gives every call of the recorded 0.161.0 probe (no raw events) no reading (P5)", () => {
    const { updates, notify } = createThread();
    let turnId = "";
    for (const line of fs.readFileSync(probe("P5-codex-luna-multi.jsonl"), "utf8").split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as { label: string; dt: number; data: any };
      if (row.label === "EVENT" && row.data.method === "turn/started") {
        turnId = /"turn": \{"id": "([^"]+)"/.exec(row.data.params)![1]!;
        notify(row.dt, "turn/started", { threadId: "thread", turn: { id: turnId } });
      } else if (row.label === "item/started" || row.label === "item/completed") {
        notify(row.dt, row.label, { threadId: "thread", turnId, item: row.data });
      } else if (row.label === "TOKEN_USAGE") {
        notify(row.dt, "thread/tokenUsage/updated", row.data);
      }
    }
    expect(updates).toHaveLength(5);
    expect(updates.every((update) => update.output_throughput === null)).toBe(true);
  });

  it("leaves the pending reading untouched across a compaction frame (P6), then pairs it", () => {
    const compaction = fs.readFileSync(probe("P6-codex-luna-autocompact.jsonl"), "utf8").split("\n").filter(Boolean)
      .map((line) => JSON.parse(line) as { label: string; data: any })
      .find((row) => row.label === "TOKEN_USAGE" && row.data.tokenUsage.last.outputTokens === 0)!.data;
    const { updates, notify } = createThread();
    notify(0, "turn/started", { threadId: "thread", turn: { id: "turn-1" } });
    notify(400, "item/started", { threadId: "thread", turnId: "turn-1", item: { type: "agentMessage", id: "m" } });
    notify(2400, "rawResponse/completed", { threadId: "thread", turnId: "turn-1", usage: tokens(240) });
    notify(2401, "thread/tokenUsage/updated", { ...compaction, turnId: "turn-1" });
    notify(2402, "thread/tokenUsage/updated", usageParams("turn-1", tokens(240)));
    notify(2403, "thread/tokenUsage/updated", usageParams("turn-1", tokens(240))); // repeat: consumed already
    expect(updates.map((update) => [update.reports_model_call, update.output_throughput])).toEqual([
      [false, null],
      [true, { method: "end_to_end", output_tokens: 240, duration_ms: 2400 }],
      [true, null],
    ]);
    expect(accepted(updates[1]!)).toEqual({ method: "end_to_end", output_tokens: 240, duration_ms: 2400 });
  });

  it("clears the pending reading at turn end", () => {
    const { updates, notify } = createThread();
    notify(0, "turn/started", { threadId: "thread", turn: { id: "turn-1" } });
    notify(1000, "rawResponse/completed", { threadId: "thread", turnId: "turn-1", usage: tokens(80) });
    notify(1100, "turn/completed", { threadId: "thread", turn: { id: "turn-1" } });
    notify(1200, "thread/tokenUsage/updated", usageParams("turn-1", tokens(80)));
    expect(updates.map((update) => update.output_throughput)).toEqual([null]);
  });
});
