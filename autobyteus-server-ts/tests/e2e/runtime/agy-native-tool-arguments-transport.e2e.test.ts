import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute>/tests/fixtures/agy-failure-cli.mjs
// Real Studio HTTP/WS/persistence/restore; only the external CLI/model is emulated.
// Hoisting is essential: the production provider resolves HOME at module import.
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "agy-arguments-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type Projection = { conversation: Array<Record<string, unknown>>; activities: Array<Record<string, unknown>> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("future native input capture across AGY CLI / server / saved history / actual restore", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
  const brainRoot = path.join(home, ".gemini", "antigravity-cli", "brain");
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const projection = async (runId: string): Promise<Projection> => (await graphql<{ getRunProjection: Projection }>(
    "query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }", { runId })).getRunProjection;
  const terminate = async (runId: string) => (await graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
    { agentRunId: runId })).terminateAgentRun.success;
  const rawFile = (runId: string) => path.join(dataDir, "memory", "agents", runId, "raw_traces_active.jsonl");
  const rawBytes = (runId: string) => fs.readFile(rawFile(runId), "utf8");
  const raw = async (runId: string) => (await rawBytes(runId)).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
  const until = async (predicate: () => boolean | Promise<boolean>, detail: () => unknown, timeout = 20_000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { if (await predicate()) return; await wait(25); }
    throw new Error("Timed out: " + JSON.stringify(detail()));
  };
  beforeEach(async (context) => {
    const ledger = process.env["AGY_ARGUMENT_LEDGER"];
    if (!ledger) return;
    await fs.appendFile(ledger, `| auto | ${context.task.name.slice(0, 5)} | ${new Date().toISOString()} | Started | ${context.task.name} | N/A | native-transport-final.log |\n`);
    context.onTestFinished(async ({ task }) => {
      await fs.appendFile(ledger, `| auto | ${task.name.slice(0, 5)} | ${new Date().toISOString()} | Completed | ${task.name} | ${task.result?.state === "pass" ? "Pass" : "Fail"} | native-transport-final.log |\n`);
    });
  });
  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(home, "app-data-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    process.env["AGY_FAKE_CASE"] = "native_arguments";
    process.env["AGY_FAKE_ARGUMENT_HOME"] = home;
    process.env["AGY_FAKE_ARGUMENT_WORKSPACE"] = workspace;
    process.env["AGY_FAKE_ARGV_LOG"] = path.join(home, "launches.jsonl");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-input-" + randomUUID(), role: "assistant", description: "owned native input E2E",
        instructions: "Use configured native tools when requested.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) socket.close();
    if (url) {
      for (const runId of runIds) await terminate(runId).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (home) await fs.rm(home, { recursive: true, force: true });
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGUMENT_HOME", "AGY_FAKE_ARGUMENT_WORKSPACE", "AGY_FAKE_ARGV_LOG"]) delete process.env[key];
    if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
  });
  const connect = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`); sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (data: unknown) => { messages.push(JSON.parse(String(data)) as Wire); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { runId, socket, messages };
  };
  const openRun = async () => {
    const result = (await graphql<{ createAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(result.success, result.message).toBe(true); runIds.push(result.runId);
    return connect(result.runId);
  };
  const send = (run: Awaited<ReturnType<typeof connect>>, content: string) => {
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content });
  };
  const complete = async (run: Awaited<ReturnType<typeof connect>>) => {
    await until(() => run.messages.some((m) => m.type === "TURN_COMPLETED"), () => run.messages);
    expect(run.messages.some((m) => ["ERROR", "TOOL_EXECUTION_FAILED", "TURN_INTERRUPTED"].includes(m.type))).toBe(false);
  };
  const starts = (run: Awaited<ReturnType<typeof connect>>) => run.messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED");
  const source = async (runId: string) => {
    const metadata = JSON.parse(await fs.readFile(path.join(dataDir, "memory", "agents", runId, "run_metadata.json"), "utf8"));
    // Production's explicit binding, never UUID extraction or latest-conversation discovery.
    expect(metadata.runtimeKind).toBe("antigravity_cli");
    const conversationId: string = metadata.platformAgentRunId;
    expect(conversationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    return { conversationId, file: path.join(brainRoot, conversationId, ".system_generated/logs/transcript_full.jsonl") };
  };
  const expectedArgs = () => {
    const target = path.join(workspace, "marker.txt");
    return [
      { TargetFile: target, CodeContent: "BEFORE\nsecond 🙂 line\n", Overwrite: false, EmptyFile: false,
        ArtifactMetadata: { empty: "", count: 0, values: [null, false, 0, ""] } },
      { TargetFile: target, TargetContent: "BEFORE", ReplacementContent: "MIDDLE", StartLine: 1, EndLine: 2,
        AllowMultiple: false, Description: "first edit", Instruction: "replace first marker" },
      { TargetFile: target, TargetContent: "MIDDLE", ReplacementContent: "AFTER", StartLine: 1, EndLine: 2,
        AllowMultiple: false, Description: "second edit", Instruction: "replace second marker" },
      { AbsolutePath: target, StartLine: 1, EndLine: 2 },
      { SearchPath: workspace, Query: "AFTER", CaseInsensitive: false, MatchPerLine: true, Includes: ["*.txt"], IsRegex: false },
      { SearchDirectory: workspace, Pattern: "*.txt", Type: "file", MaxDepth: 0 },
      { DirectoryPath: workspace },
      { CommandLine: "printf NATIVE_ARGUMENTS_PREFIX_VERIFIED", Cwd: workspace, WaitMsBeforeAsync: 0, IsDaemon: false, SafeToAutoRun: true },
      { CommandLine: "fixture-background-command", Cwd: workspace, IsDaemon: true, WaitMsBeforeAsync: 0 },
    ];
  };
  const assertCaptured = async (run: Awaited<ReturnType<typeof connect>>) => {
    const first = starts(run);
    expect(first.map((m) => m.payload["arguments"])).toEqual(expectedArgs());
    expect(first.map((m) => m.payload["tool_name"])).toEqual(["write_to_file", "replace_file_content", "replace_file_content",
      "view_file", "grep_search", "find_by_name", "list_dir", "run_command", "run_command"]);
    const records = await raw(run.runId);
    const history = await projection(run.runId);
    for (const [index, start] of first.entries()) {
      const id = start.payload["invocation_id"];
      const terminal = run.messages.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === id);
      expect(terminal).toHaveLength(1);
      expect(terminal[0]!.payload).toMatchObject({ invocation_id: id, turn_id: start.payload["turn_id"],
        tool_name: start.payload["tool_name"], arguments: expectedArgs()[index] });
      expect(run.messages.indexOf(start)).toBeLessThan(run.messages.indexOf(terminal[0]!));
      expect(run.messages.indexOf(terminal[0]!)).toBeLessThan(run.messages.findIndex((m) => m.type === "TURN_COMPLETED"));
      expect(records.filter((r) => r["trace_type"] === "tool_call" && r["tool_call_id"] === id)).toHaveLength(1);
      expect(records.find((r) => r["trace_type"] === "tool_call" && r["tool_call_id"] === id)).toMatchObject({
        source_event: "TOOL_EXECUTION_STARTED", tool_args: expectedArgs()[index], turn_id: start.payload["turn_id"] });
      expect(history.conversation.find((r) => r["invocationId"] === id)).toMatchObject({ kind: "tool_call", toolArgs: expectedArgs()[index] });
      expect(history.activities.find((r) => r["invocationId"] === id)).toMatchObject({ arguments: expectedArgs()[index], status: "success" });
    }
    expect(first[1]!.payload["invocation_id"]).not.toBe(first[2]!.payload["invocation_id"]);
    expect(run.messages.find((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" &&
      m.payload["invocation_id"] === first.at(-1)!.payload["invocation_id"])!.payload["result"]).toMatchObject({ provider_state: "RUNNING" });
    return history;
  };

  it("E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence", async () => {
    const run = await openRun(); send(run, "FULL");
    await until(() => starts(run).length === 1, () => run.messages);
    expect(starts(run)[0]!.payload["arguments"]).toEqual(expectedArgs()[0]);
    const id = starts(run)[0]!.payload["invocation_id"];
    await until(async () => (await raw(run.runId)).some((r) => r["tool_call_id"] === id && r["trace_type"] === "tool_call"), () => run.messages);
    expect(run.messages.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")).toBe(false);
    expect((await raw(run.runId)).find((r) => r["tool_call_id"] === id)).toMatchObject({ tool_args: expectedArgs()[0] });
    await complete(run);
    const captured = await assertCaptured(run);
    const { file } = await source(run.runId); await fs.rm(file);
    expect(await terminate(run.runId)).toBe(true);
    expect(await projection(run.runId)).toEqual(captured);
  }, 40_000);

  it.each(["SUMMARY_ONLY", "AMBIGUOUS"])("E-002 retains truthful summary and completion for %s detail", async (content) => {
    const run = await openRun(); send(run, content); await complete(run);
    expect(starts(run)).toHaveLength(1);
    const summary = { TargetFile: path.join(workspace, "marker.txt") };
    expect(starts(run)[0]!.payload["arguments"]).toEqual(summary);
    expect((await projection(run.runId)).activities.find((r) => r["invocationId"] === starts(run)[0]!.payload["invocation_id"]))
      .toMatchObject({ arguments: summary, status: "success" });
  }, 40_000);

  it("E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged", async () => {
    const old = await openRun(); send(old, "SUMMARY_ONLY"); await complete(old);
    const oldId = starts(old)[0]!.payload["invocation_id"];
    expect(await terminate(old.runId)).toBe(true); old.socket.close();
    const oldBytes = await rawBytes(old.runId);
    const oldHistory = await projection(old.runId);
    const { conversationId, file } = await source(old.runId);
    const restored = (await graphql<{ restoreAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message runId } }",
      { agentRunId: old.runId })).restoreAgentRun;
    expect(restored, restored.message).toMatchObject({ success: true, runId: old.runId });
    const launches = (await fs.readFile(path.join(home, "launches.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    const argv: string[] = launches.at(-1).argv;
    expect(argv[argv.indexOf("--conversation") + 1]).toBe(conversationId);
    const resumed = await connect(old.runId); send(resumed, "FULL"); await complete(resumed);
    await assertCaptured(resumed);
    const now = await projection(old.runId);
    expect(now.activities.find((r) => r["invocationId"] === oldId)).toEqual(oldHistory.activities.find((r) => r["invocationId"] === oldId));
    expect(now.conversation.find((r) => r["invocationId"] === oldId)).toEqual(oldHistory.conversation.find((r) => r["invocationId"] === oldId));
    expect((await rawBytes(old.runId)).startsWith(oldBytes)).toBe(true);
    await fs.rm(file); expect(await terminate(old.runId)).toBe(true);
    expect(await projection(old.runId)).toEqual(now);
  }, 60_000);
});
