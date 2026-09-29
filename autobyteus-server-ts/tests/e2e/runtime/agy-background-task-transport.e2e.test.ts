import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Deterministic AGY daemon stream through the real server (fake AGY transport: tests/fixtures/agy-failure-cli.mjs).
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type Projection = { conversation: Array<Record<string, unknown>>; activities: Array<Record<string, unknown>> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BACKGROUND_RESULT = { provider_state: "RUNNING",
  output: "Started as a background task; still running when the turn ended." };
const DAEMON_ARGS = { CommandLine: "python3 -m http.server 5199", IsDaemon: true };

suite("AGY background (daemon) tool steps through app WebSocket and history", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
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

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-background-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-background-" + randomUUID(), role: "assistant", description: "background task probe",
        instructions: "Run commands when asked.", category: "runtime-e2e", toolNames: [] } });
    definitionId = created.createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) await terminate(runId).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  });

  const openRun = async (fakeCase: "daemon_background" | "daemon_hold") => {
    process.env["AGY_FAKE_CASE"] = fakeCase;
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
        autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    const runId = started.createAgentRun.runId!;
    runIds.push(runId);
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
            ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const until = async (predicate: () => boolean, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !predicate()) await wait(50);
      expect(predicate(), JSON.stringify(messages)).toBe(true);
    };
    return { runId, socket, messages, until };
  };

  it("closes a never-finished daemon step as a succeeded background task before TURN_COMPLETED and replays it", async () => {
    const run = await openRun("daemon_background");
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content: "Start the dev server and keep working." });
    await run.until(() => run.messages.some((m) => m.type === "TURN_COMPLETED"));
    await wait(200);
    const started = (command: string) => run.messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED"
      && (m.payload["arguments"] as Record<string, unknown> | undefined)?.["CommandLine"] === command);
    const succeeded = (starts: Wire[]) => run.messages.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED"
      && m.payload["invocation_id"] === starts[0]?.payload["invocation_id"]);
    const daemonStarted = started(DAEMON_ARGS.CommandLine);
    const echoStarted = started("echo AFTER_ONE");
    expect(daemonStarted).toHaveLength(1);
    expect(echoStarted).toHaveLength(1);
    const daemonSucceeded = succeeded(daemonStarted);
    const echoSucceeded = succeeded(echoStarted);
    expect(daemonSucceeded).toHaveLength(1);
    expect(echoSucceeded).toHaveLength(1);
    expect(run.messages.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")).toHaveLength(2);
    const invocationId = daemonStarted[0]!.payload["invocation_id"];
    expect(daemonSucceeded[0]!.payload).toMatchObject({ invocation_id: invocationId, tool_name: "run_command",
      turn_id: daemonStarted[0]!.payload["turn_id"], arguments: DAEMON_ARGS, result: BACKGROUND_RESULT });
    expect(echoSucceeded[0]!.payload["result"]).toMatchObject({ provider_state: "DONE" });
    const completed = run.messages.find((m) => m.type === "TURN_COMPLETED")!;
    const index = (m: Wire) => run.messages.indexOf(m);
    expect(index(daemonStarted[0]!)).toBeLessThan(index(echoSucceeded[0]!));
    expect(index(echoSucceeded[0]!)).toBeLessThan(index(daemonSucceeded[0]!));
    expect(index(daemonSucceeded[0]!)).toBeLessThan(index(completed));
    expect(run.messages.some((m) => ["ERROR", "TOOL_EXECUTION_FAILED", "TURN_INTERRUPTED"].includes(m.type))).toBe(false);

    const expectHistory = async () => {
      const history = await projection(run.runId);
      expect(history.conversation.find((row) => row["invocationId"] === invocationId)).toMatchObject({
        kind: "tool_call", toolName: "run_command", toolArgs: DAEMON_ARGS, toolResult: BACKGROUND_RESULT });
      expect(history.activities.find((row) => row["invocationId"] === invocationId)).toMatchObject({
        toolName: "run_command", status: "success", result: BACKGROUND_RESULT });
    };
    await expectHistory();

    // The run stays usable: the next turn is accepted and does not repeat or reopen the daemon card.
    const before = run.messages.length;
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content: "Anything else?" });
    await run.until(() => run.messages.slice(before).some((m) => m.type === "TURN_COMPLETED"));
    const next = run.messages.slice(before);
    expect(next.some((m) => m.type.startsWith("TOOL_EXECUTION"))).toBe(false);
    expect(next.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => m.payload["delta"]).join("")).toContain("SECOND_TURN_OK");

    expect(await terminate(run.runId)).toBe(true);
    await expectHistory();
  }, 60_000);

  it("keeps Stop during a daemon turn as an interruption, never a background success", async () => {
    const run = await openRun("daemon_hold");
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content: "Start the dev server and keep working." });
    await run.until(() => run.messages.some((m) => m.type === "TOOL_EXECUTION_STARTED"));
    const invocationId = run.messages.find((m) => m.type === "TOOL_EXECUTION_STARTED")!.payload["invocation_id"];
    const commandId = `interrupt-${randomUUID()}`;
    run.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: commandId } }));
    await run.until(() => run.messages.some((m) => m.type === "TURN_INTERRUPTED"));
    await wait(300);
    expect(run.messages.find((m) => m.type === "AGENT_COMMAND_ACK" && m.payload["command_id"] === commandId)?.payload)
      .toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    expect(run.messages.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")).toBe(false);
    expect(run.messages.some((m) => m.type === "TURN_COMPLETED")).toBe(false);
    expect(run.messages.some((m) => m.type === "ERROR" && m.payload["code"] === "AGY_PROCESS_ERROR")).toBe(false);
    const history = await projection(run.runId);
    const activity = history.activities.find((row) => row["invocationId"] === invocationId);
    expect(activity).toBeDefined();
    expect(activity!["status"]).not.toBe("success");
    expect(JSON.stringify(history)).not.toContain(BACKGROUND_RESULT.output);
    expect(JSON.stringify(history)).toContain("Tool execution interrupted.");
  }, 60_000);
});
