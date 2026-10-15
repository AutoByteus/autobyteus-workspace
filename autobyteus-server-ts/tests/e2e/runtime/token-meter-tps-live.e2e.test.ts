/**
 * TPS-LIVE / output-tps-precision AC-001–004, AC-010 (REQ-009). Real runtimes and real providers
 * (paid or local inference) through the real Studio server: public GraphQL, the agent WebSocket,
 * each runtime integration's own per-call timing and the run-side acceptance check. Asserts what
 * every model call's TOKEN_USAGE_UPDATED carries as `output_throughput`:
 * - the method each runtime must choose (DEC-002): autobyteus with streamed reasoning and claude
 *   generation; codex and grok end to end; antigravity end to end when thinking > 0;
 * - the numerator is the call's own reported output;
 * - the duration is positive and never longer than the time since the message was sent (one
 *   process clock; AGY's provider duration gets a 1 s allowance).
 * Codex cases also run a ~3 s shell tool and hold a tool approval ~6 s (RSK-002): neither may appear
 * in any reading. Each case writes its WS timeline as JSON.
 *
 * Gate: RUN_TOKEN_TPS_LIVE_E2E=1. Select runtimes with TPS_LIVE_RUNTIMES (comma list of
 * autobyteus, claude_agent_sdk, codex_app_server, antigravity_cli, grok_build; default all).
 * Run one runtime per invocation in a clean env (see TESTING.md), e.g.
 *   env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_TOKEN_TPS_LIVE_E2E=1 \
 *     TPS_LIVE_RUNTIMES=claude_agent_sdk TEST_TPS_LIVE_OUTPUT_DIR=<fresh dir> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-meter-tps-live.e2e.test.ts --no-watch
 * Prerequisites and logins:
 * - autobyteus: a local LM Studio server (no key). The model is matched by TPS_LIVE_AUTOBYTEUS_MODEL
 *   (default "qwen3.6-35b-a3b"). Run no other local-model job at the same time.
 * - claude_agent_sdk: the host `claude` login. TPS_LIVE_CLAUDE_MODEL (default haiku, then sonnet).
 * - codex_app_server: CODEX_HOME=<throwaway home> with a symlinked auth.json.
 *   TPS_LIVE_CODEX_MODEL (default gpt-5.4-mini).
 * - antigravity_cli: the host `agy` login. TPS_LIVE_AGY_MODEL (default gemini-3.8-flash-low) and
 *   TPS_LIVE_AGY_THINKING_MODEL (default gemini-3.8-flash-high).
 * - grok_build: the host `grok` login. TPS_LIVE_GROK_MODEL (default grok-4.7, low reasoning effort).
 * - autobyteus + DeepSeek (API-L09): a DeepSeek key in the target database's vault. Import it with
 *   `pnpm secrets:import -- --source <key file> --database-url file:<abs>/autobyteus-server-ts/db/test.db`, start
 *   the built test server on that database (test-support/live-e2e/test-runtime-bootstrap.mjs) and pass its URL
 *   as AUTOBYTEUS_TEST_SERVER_URL; in that mode the suite uses the external server instead of an in-process one
 *   (select the case with -t API-L09). TPS_LIVE_DEEPSEEK_MODEL (default deepseek-v4-flash).
 * Optional raw-wire evidence: point CODEX_APP_SERVER_COMMAND or ANTIGRAVITY_CLI_COMMAND at a
 * stdout-stamping wrapper; the suite does not depend on it.
 * Owns its server, data dir, definitions, runs and token-usage rows, and removes them afterwards.
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rootPrismaClient } from "repository_prisma";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

type RuntimeKind = "autobyteus" | "claude_agent_sdk" | "codex_app_server" | "antigravity_cli" | "grok_build";
type Frame = { t: number; type: string; payload: Record<string, unknown> };
type Throughput = { method: "generation" | "end_to_end"; output_tokens: number; duration_ms: number };

const ALL_RUNTIMES: RuntimeKind[] = ["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build"];
const selected = (process.env.TPS_LIVE_RUNTIMES?.split(",").map((value) => value.trim()).filter(Boolean)
  ?? ALL_RUNTIMES) as RuntimeKind[];
const live = process.env.RUN_TOKEN_TPS_LIVE_E2E === "1";
const suite = live ? describe : describe.skip;
const runtimeIt = (runtime: RuntimeKind) => (live && selected.includes(runtime) ? it : it.skip);
const TURN_TIMEOUT_MS = Number(process.env.TPS_LIVE_TURN_TIMEOUT_MS || 300_000);
const PLAIN_TEXT_PROMPT = "Write one plain-text paragraph of about 150 words about how rivers shape valleys. "
  + "Do not use any tools.";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Optional: run against the built test server of the persistent test database (keys imported there). */
const externalServerUrl = process.env.AUTOBYTEUS_TEST_SERVER_URL?.trim() || null;

suite("per-call TPS on real runtimes (live)", () => {
  let app: FastifyInstance | null = null;
  let url: URL;
  let dataDir = "";
  const outputDir = process.env.TEST_TPS_LIVE_OUTPUT_DIR || path.resolve(`tests/.tmp/tps-live-${Date.now()}`);
  const runIds: string[] = [];
  const cleanup: Array<() => Promise<unknown>> = [];
  const sockets: WebSocket[] = [];

  const graphql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    await fs.mkdir(outputDir, { recursive: true });
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "token-tps-live-"));
    if (externalServerUrl) {
      url = new URL(externalServerUrl); // the built test server on the persistent test database
      return;
    }
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (runIds.length && !externalServerUrl) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: runIds } } });
    if (!externalServerUrl) await getCodexAppServerClientManager().close().catch(() => undefined);
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  /** The native runtime's LM Studio models come from LM Studio discovery, as in the token-usage live suite. */
  const chooseLmStudioModel = async (target: string) => {
    await LLMFactory.reloadModels(LLMProvider.LMSTUDIO);
    const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
    const found = models.find((model) => model.model_identifier.toLowerCase().includes(target.toLowerCase()));
    if (!found) throw new Error(`No LM Studio model matching ${target} among ${JSON.stringify(models.map((m) => m.model_identifier))}`);
    return found.model_identifier;
  };

  const chooseModel = async (runtimeKind: RuntimeKind, prefer: string[]) => {
    const catalog = await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }",
      { r: runtimeKind });
    const models = catalog.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((m) => m.modelIdentifier));
    for (const wanted of prefer) {
      const found = models.find((model) => model === wanted);
      if (found) return found;
    }
    // Catalogs change over time: fall back to the first listed model rather than fail.
    if (models[0]) return models[0];
    throw new Error(`No ${runtimeKind} model in the catalog`);
  };

  const startRun = async (input: { runtimeKind: RuntimeKind; model: string; instructions: string;
    llmConfig?: Record<string, unknown>; autoExecuteTools?: boolean }) => {
    const definition = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `tps-live-${input.runtimeKind}-${randomUUID()}`, role: "assistant", description: "TPS live e2e",
        instructions: input.instructions, category: "runtime-e2e", toolNames: [] } });
    const definitionId = definition.createAgentDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id: definitionId }));
    const workspace = await fs.mkdtemp(path.join(dataDir, "ws-"));
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: input.model,
        llmConfig: input.llmConfig ?? null, autoExecuteTools: input.autoExecuteTools ?? true, runtimeKind: input.runtimeKind } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.push(runId);
    cleanup.push(() => graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
      { agentRunId: runId }));
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type !== "string") return;
        frames.push({ t: Date.now(), type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* not a JSON frame */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    return { runId, socket, frames, workspace };
  };

  /** Sends one message and waits for the turn to end; returns the turn's frames and the send time. */
  const runTurn = async (run: Awaited<ReturnType<typeof startRun>>, content: string) => {
    const from = run.frames.length;
    const sentAtMs = Date.now();
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content });
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    const ended = (frame: Frame) => frame.type === "TURN_COMPLETED" || frame.type === "TURN_INTERRUPTED" || frame.type === "ERROR";
    while (!run.frames.slice(from).some(ended)) {
      if (Date.now() > deadline) throw new Error(`Turn did not end; tail=${JSON.stringify(run.frames.slice(-10).map((f) => f.type))}`);
      await wait(100);
    }
    await wait(1500); // usage events may trail TURN_COMPLETED by a moment
    const turn = run.frames.slice(from);
    expect(turn.filter((frame) => frame.type === "ERROR").map((frame) => frame.payload)).toEqual([]);
    return { turn, sentAtMs };
  };

  const modelCalls = (turn: Frame[]) => turn.filter((frame) => frame.type === "TOKEN_USAGE_UPDATED"
    && frame.payload.reports_model_call === true);

  const record = async (name: string, data: Record<string, unknown>) => {
    await fs.writeFile(path.join(outputDir, `${name}.json`), JSON.stringify(data, null, 2));
  };

  /** When visible text arrived on the WebSocket: a cross-check for generation windows. */
  const contentWindow = (turn: Frame[], sentAtMs: number) => {
    const content = turn.filter((frame) => frame.type === "SEGMENT_CONTENT");
    return content.length ? { frames: content.length, firstAtMsSinceSend: content[0]!.t - sentAtMs,
      lastAtMsSinceSend: content.at(-1)!.t - sentAtMs } : null;
  };

  const summarize = (turn: Frame[], sentAtMs: number) => turn
    .filter((frame) => frame.type !== "SEGMENT_CONTENT")
    .map((frame) => ({ atMsSinceSend: frame.t - sentAtMs, type: frame.type,
      ...(frame.type === "TOKEN_USAGE_UPDATED" ? {
        call_sequence: frame.payload.call_sequence, reports_model_call: frame.payload.reports_model_call,
        model_identifier: frame.payload.model_identifier, reported_output_tokens: frame.payload.reported_output_tokens,
        reasoning_output_tokens: frame.payload.reasoning_output_tokens, output_throughput: frame.payload.output_throughput,
        raw_usage_json: frame.payload.raw_usage_json,
      } : {}),
      ...(frame.type.startsWith("TOOL_") ? { tool_name: frame.payload.tool_name, invocation_id: frame.payload.invocation_id } : {}),
    }));

  /** Checks every reading on the turn's model calls and returns them with their receipt offsets. */
  const checkReadings = (turn: Frame[], sentAtMs: number, options: {
    expectMethod: (frame: Frame) => Throughput["method"] | null;
    ownOutput?: (frame: Frame) => number | null;
    durationAllowanceMs?: number;
  }) => {
    const readings = modelCalls(turn).flatMap((frame) => {
      const value = frame.payload.output_throughput as Throughput | null | undefined;
      expect(value === null || typeof value === "object", JSON.stringify(frame.payload)).toBe(true);
      if (!value) return [];
      const elapsedMs = frame.t - sentAtMs;
      expect(Object.keys(value).sort()).toEqual(["duration_ms", "method", "output_tokens"]);
      const expected = options.expectMethod(frame);
      if (expected) expect(value.method).toBe(expected);
      const own = options.ownOutput ? options.ownOutput(frame) : frame.payload.reported_output_tokens as number;
      if (own !== null) expect(value.output_tokens).toBe(own);
      expect(value.output_tokens).toBeGreaterThanOrEqual(20);
      expect(value.duration_ms).toBeGreaterThanOrEqual(250);
      expect(value.duration_ms).toBeLessThanOrEqual(elapsedMs + (options.durationAllowanceMs ?? 0));
      const tps = value.output_tokens / (value.duration_ms / 1000);
      expect(tps).toBeGreaterThan(0.5);
      expect(tps).toBeLessThan(5000);
      return [{ ...value, tokensPerSecond: Number(tps.toFixed(1)), receivedAtMsSinceSend: elapsedMs,
        call_sequence: frame.payload.call_sequence, model: frame.payload.model_identifier }];
    });
    return readings;
  };

  const singleCallCase = async (input: { runtimeKind: RuntimeKind; model: string; caseId: string;
    llmConfig?: Record<string, unknown>; expectMethod: (frame: Frame) => Throughput["method"] | null;
    ownOutput?: (frame: Frame) => number | null; durationAllowanceMs?: number; prompt?: string }) => {
    const run = await startRun({ runtimeKind: input.runtimeKind, model: input.model, llmConfig: input.llmConfig,
      instructions: "Reply directly in plain text. Do not use tools." });
    const { turn, sentAtMs } = await runTurn(run, input.prompt ?? PLAIN_TEXT_PROMPT);
    const turnEndMs = (turn.find((frame) => frame.type === "TURN_COMPLETED")?.t ?? Date.now()) - sentAtMs;
    const evidence = { caseId: input.caseId, runtimeKind: input.runtimeKind, model: input.model, runId: run.runId,
      sentAtMs, turnCompletedAtMsSinceSend: turnEndMs, modelCallCount: modelCalls(turn).length,
      text: turn.filter((frame) => frame.type === "SEGMENT_CONTENT").map((frame) => String(frame.payload.delta ?? "")).join(""),
      contentWindow: contentWindow(turn, sentAtMs),
      timeline: summarize(turn, sentAtMs) };
    await record(input.caseId, evidence); // kept even when a check below fails
    const readings = checkReadings(turn, sentAtMs, input);
    await record(input.caseId, { ...evidence, readings });
    expect(readings.length, "a single-call plain-text turn must yield a TPS reading").toBeGreaterThanOrEqual(1);
    // The reading carries the call's reported model (e.g. "claude-haiku-5-5" for the "haiku" alias).
    expect(typeof readings.at(-1)!.model === "string" && readings.at(-1)!.model).toBeTruthy();
    return { run, turn, readings };
  };

  runtimeIt("autobyteus")("API-L01 native AutoByteus (LM Studio) single call: generation speed from the first streamed chunk", async () => {
    const model = await chooseLmStudioModel(process.env.TPS_LIVE_AUTOBYTEUS_MODEL || "qwen3.6-35b-a3b");
    await singleCallCase({ runtimeKind: "autobyteus", model, caseId: "API-L01-autobyteus",
      // LM Studio streams the model's reasoning before its answer, so the first chunk precedes all generation.
      expectMethod: () => "generation" });
  }, TURN_TIMEOUT_MS + 60_000);

  runtimeIt("autobyteus")("API-L09 native AutoByteus with DeepSeek (provider API key) single call: generation speed", async () => {
    const model = await chooseModel("autobyteus", [process.env.TPS_LIVE_DEEPSEEK_MODEL || "deepseek-v4-flash"]);
    expect(model).toBe(process.env.TPS_LIVE_DEEPSEEK_MODEL || "deepseek-v4-flash");
    // DeepSeek streams its reasoning (or reports none) before the answer, so the first chunk precedes all generation.
    await singleCallCase({ runtimeKind: "autobyteus", model, caseId: "API-L09-deepseek", expectMethod: () => "generation" });
  }, TURN_TIMEOUT_MS + 60_000);

  runtimeIt("claude_agent_sdk")("API-L02 Claude single call: generation speed (message_start → message_delta)", async () => {
    const model = await chooseModel("claude_agent_sdk", [process.env.TPS_LIVE_CLAUDE_MODEL || "haiku", "sonnet"]);
    await singleCallCase({ runtimeKind: "claude_agent_sdk", model, caseId: "API-L02-claude", expectMethod: () => "generation" });
  }, TURN_TIMEOUT_MS + 60_000);

  /** Codex usage reports the cumulative total; the call's own output is `last.outputTokens`. */
  const codexOwnOutput = (frame: Frame): number | null => {
    const raw = frame.payload.raw_usage_json as { last?: { outputTokens?: unknown } } | null | undefined;
    return typeof raw?.last?.outputTokens === "number" ? raw.last.outputTokens : null;
  };

  runtimeIt("codex_app_server")("API-L03 Codex single call: end-to-end speed from the call's request boundary", async () => {
    const model = await chooseModel("codex_app_server", [process.env.TPS_LIVE_CODEX_MODEL || "gpt-5.4-mini", "gpt-5.5"]);
    await singleCallCase({ runtimeKind: "codex_app_server", model, caseId: "API-L03-codex",
      expectMethod: () => "end_to_end", ownOutput: codexOwnOutput });
  }, TURN_TIMEOUT_MS + 60_000);

  runtimeIt("codex_app_server")("API-L04 Codex turn with a ~3 s shell tool: every reading is end to end and no reading spans the tool", async () => {
    const model = await chooseModel("codex_app_server", [process.env.TPS_LIVE_CODEX_MODEL || "gpt-5.4-mini", "gpt-5.5"]);
    const run = await startRun({ runtimeKind: "codex_app_server", model,
      instructions: "You are a concise test agent. Follow the user's instructions exactly." });
    const { turn, sentAtMs } = await runTurn(run, "Run exactly this shell command once: `sleep 3 && echo TPS_TOOL_DONE`. "
      + "After it finishes, write one plain-text paragraph of about 120 words about why waiting is useful, "
      + "and include its output TPS_TOOL_DONE.");
    const toolStarted = turn.find((frame) => frame.type === "TOOL_EXECUTION_STARTED");
    const toolDone = turn.find((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" || frame.type === "TOOL_EXECUTION_FAILED");
    const evidence = { caseId: "API-L04", runtimeKind: "codex_app_server", model, runId: run.runId,
      sentAtMs, modelCallCount: modelCalls(turn).length,
      toolStartedAtMsSinceSend: toolStarted ? toolStarted.t - sentAtMs : null,
      toolFinishedAtMsSinceSend: toolDone ? toolDone.t - sentAtMs : null, contentWindow: contentWindow(turn, sentAtMs),
      timeline: summarize(turn, sentAtMs) };
    await record("API-L04-codex-tool", evidence); // kept even when a check below fails
    const readings = checkReadings(turn, sentAtMs, { expectMethod: () => "end_to_end", ownOutput: codexOwnOutput });
    await record("API-L04-codex-tool", { ...evidence, readings });
    expect(toolStarted && toolDone, "the turn must run the shell tool").toBeTruthy();
    expect(toolDone!.t - toolStarted!.t).toBeGreaterThanOrEqual(2500);
    expect(modelCalls(turn).length).toBeGreaterThanOrEqual(2);
    expect(readings.length).toBeGreaterThanOrEqual(1);
    // SCN-002: tool time is never part of a reading. A call either ended before the tool started
    // (at most toolStarted - send long) or started after it finished (at most receipt - toolDone
    // long), so a reading received after the tool cannot be longer than the larger of the two.
    const toolStartedMs = toolStarted!.t - sentAtMs;
    const toolDoneMs = toolDone!.t - sentAtMs;
    for (const reading of readings) {
      if (reading.receivedAtMsSinceSend >= toolDoneMs) {
        expect(reading.duration_ms, JSON.stringify({ reading, toolStartedMs, toolDoneMs }))
          .toBeLessThanOrEqual(Math.max(toolStartedMs, reading.receivedAtMsSinceSend - toolDoneMs) + 50);
      }
    }
  }, TURN_TIMEOUT_MS + 60_000);

  runtimeIt("codex_app_server")("API-L08 Codex tool approval held ~6 s: the wait is in no reading", async () => {
    const model = await chooseModel("codex_app_server", [process.env.TPS_LIVE_CODEX_MODEL || "gpt-5.4-mini", "gpt-5.5"]);
    // The server's own Codex setting: "untrusted" asks before any command that is not read-only.
    const previousPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    const run = await startRun({ runtimeKind: "codex_app_server", model, autoExecuteTools: false,
      instructions: "You are a concise test agent. Follow the user's instructions exactly." })
      .finally(() => {
        if (previousPolicy === undefined) delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
        else process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousPolicy;
      });
    const from = run.frames.length;
    const sentAtMs = Date.now();
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content: "Run exactly this shell command once: "
      + "`echo TPS_APPROVED > tps-approved.txt`. After it finishes, write one plain-text paragraph of about 120 words "
      + "about patience, and include the word TPS_APPROVED." });
    const approvals: Array<{ requestedAtMs: number; approvedAtMs: number; tool: unknown }> = [];
    const handled = new Set<Frame>();
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    const ended = (frame: Frame) => frame.type === "TURN_COMPLETED" || frame.type === "TURN_INTERRUPTED" || frame.type === "ERROR";
    while (!run.frames.slice(from).some(ended)) {
      if (Date.now() > deadline) throw new Error("Approval turn did not end");
      for (const request of run.frames.slice(from).filter((frame) => frame.type === "TOOL_APPROVAL_REQUESTED" && !handled.has(frame))) {
        handled.add(request);
        await wait(6000); // the user takes a while to approve
        run.socket.send(JSON.stringify({ type: "APPROVE_TOOL", payload: {
          invocation_id: request.payload.invocation_id, reason: "approved by TPS live e2e after a wait" } }));
        approvals.push({ requestedAtMs: request.t - sentAtMs, approvedAtMs: Date.now() - sentAtMs, tool: request.payload.tool_name });
      }
      await wait(100);
    }
    await wait(1500);
    const turn = run.frames.slice(from);
    const toolDone = turn.find((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" || frame.type === "TOOL_EXECUTION_FAILED");
    const evidence = { caseId: "API-L08", runtimeKind: "codex_app_server", model, runId: run.runId, sentAtMs, approvals,
      toolFinishedAtMsSinceSend: toolDone ? toolDone.t - sentAtMs : null, modelCallCount: modelCalls(turn).length,
      contentWindow: contentWindow(turn, sentAtMs), timeline: summarize(turn, sentAtMs) };
    await record("API-L08-codex-approval", evidence); // kept even when a check below fails
    expect(turn.filter((frame) => frame.type === "ERROR").map((frame) => frame.payload)).toEqual([]);
    const readings = checkReadings(turn, sentAtMs, { expectMethod: () => "end_to_end", ownOutput: codexOwnOutput });
    await record("API-L08-codex-approval", { ...evidence, readings });
    expect(approvals.length, "Codex asked for approval").toBeGreaterThanOrEqual(1);
    expect(toolDone).toBeTruthy();
    expect(readings.length).toBeGreaterThanOrEqual(1);
    // A call either ended before the approval request or started after the tool finished.
    const requestedMs = approvals[0]!.requestedAtMs;
    const toolDoneMs = toolDone!.t - sentAtMs;
    for (const reading of readings) {
      if (reading.receivedAtMsSinceSend >= toolDoneMs) {
        expect(reading.duration_ms, JSON.stringify({ reading, requestedMs, toolDoneMs }))
          .toBeLessThanOrEqual(Math.max(requestedMs, reading.receivedAtMsSinceSend - toolDoneMs) + 50);
      }
    }
  }, TURN_TIMEOUT_MS + 60_000);

  /** AGY: generation only with zero thinking; any thinking means AGY's own (end-to-end) duration. */
  const agyMethod = (frame: Frame): Throughput["method"] | null =>
    (frame.payload.reasoning_output_tokens as number | null) ? "end_to_end" : null;

  runtimeIt("antigravity_cli")("API-L05 AGY long answer: a reading per DONE step; generation when thinking is 0", async () => {
    const model = process.env.TPS_LIVE_AGY_MODEL || "gemini-3.8-flash-low";
    await singleCallCase({ runtimeKind: "antigravity_cli", model, caseId: "API-L05-agy-long", expectMethod: agyMethod,
      durationAllowanceMs: 1000,
      prompt: "Write about 500 words of plain text, in five paragraphs, about how rivers shape valleys. Do not use any tools." });
  }, TURN_TIMEOUT_MS + 60_000);

  runtimeIt("antigravity_cli")("API-L06 AGY thinking model: thinking > 0 gives end-to-end speed from AGY's step duration", async () => {
    const model = process.env.TPS_LIVE_AGY_THINKING_MODEL || "gemini-3.8-flash-high";
    const { turn } = await singleCallCase({ runtimeKind: "antigravity_cli", model, caseId: "API-L06-agy-thinking",
      expectMethod: agyMethod, durationAllowanceMs: 1000,
      prompt: "A farmer has 17 sheep; all but 9 run away, then he buys twice as many as remain. How many now? "
        + "Explain your reasoning in one plain-text paragraph of about 120 words. Do not use any tools." });
    expect(modelCalls(turn).some((frame) => Number(frame.payload.reasoning_output_tokens) > 0),
      "the thinking model reported thinking tokens").toBe(true);
  }, TURN_TIMEOUT_MS + 60_000);

  runtimeIt("grok_build")("API-L07 Grok single call: end-to-end speed from the prompt send", async () => {
    const model = await chooseModel("grok_build", [process.env.TPS_LIVE_GROK_MODEL || "grok-4.7"]);
    await singleCallCase({ runtimeKind: "grok_build", model, caseId: "API-L07-grok", expectMethod: () => "end_to_end",
      llmConfig: { reasoning_effort: "low" } });
  }, TURN_TIMEOUT_MS + 60_000);
});
