/**
 * A run's MCP server sessions close when the run ends (mcp-run-session-cleanup, autobyteus-193).
 *
 * Purpose: through the real Studio HTTP/GraphQL/WebSocket server and the Agent Tools MCP endpoint, AGY runs call a
 * tool of a real stdio MCP server (the autobyteus-189 Node test server, which writes its pid to
 * MCP_TEST_SERVER_PID_FILE). The test proves the server process ends when the run ends, on every end path here:
 *   - termination (AC-002);
 *   - termination, then delete of the stopped run (AC-004; delete itself refuses active runs);
 *   - idle shutdown of a delegated copy, at the minimum 60 s grace period (AC-004);
 *   - a wake right after termination gets a new, working server process (AC-005);
 *   - ending run A leaves run B's process and a /mcp/gateway call working (AC-006).
 * Gate (a skip is not a pass): RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
 *   (the scripted AGY CLI, `linked_skills`: `CALL_TOOL:{…}` makes the agent call the actual tool; no model).
 * Values: dummy only.
 * Command: env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MCP_GATEWAY_EXECUTION_SCOPE_ID } from "../../../src/mcp-gateway/mcp-gateway-tool-executor.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

type Wire = { type: string; payload: Record<string, unknown> };

const cli = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const FIXTURE = fileURLToPath(new URL("../../../../autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs", import.meta.url));
const STDIO_TOOL = "cleanup_stdio_report_env_and_cwd";
const ENV_VALUE = "cleanup-env-value";
const GRACE_KEY = "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS";
const GRACE_MS = 60_000;
/** QR-001: no stdio child of an ended run is alive 10 s after its release. */
const EXIT_BOUND_MS = 10_000;
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isAlive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const exitsWithin = async (pid: number, ms: number) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (!isAlive(pid)) return true; await wait(100); }
  return !isAlive(pid);
};
const until = async (check: () => Promise<boolean> | boolean, label: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await check()) return; await wait(250); }
  throw new Error(`Timed out: ${label}`);
};

suite("A run's MCP server processes end when the run ends (real server, Agent Tools MCP, scripted AGY)", () => {
  let dataDir = "";
  let pidFile = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let workerName = "";
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
  const savedCase = process.env["AGY_FAKE_CASE"];

  const gql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await res.json() as { data?: T; errors?: unknown[] };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const definition = async (name: string, toolNames: string[]) => (await gql(
    "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name, role: "assistant", category: "runtime-e2e", description: `${name} (MCP cleanup E2E)`,
      instructions: "Follow the user's request.", toolNames } })).createAgentDefinition.id as string;
  const runConfig = () => ({ workspaceRootPath: path.join(dataDir, "workspace"), llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const readPid = async () => Number((await fs.readFile(pidFile, "utf8").catch(() => "")).trim()) || null;
  /** The pid of the stdio server process started after `previous` (the pid file holds the latest start). */
  const newPid = async (previous: number | null) => {
    let pid: number | null = null;
    await until(async () => { pid = await readPid(); return pid !== null && pid !== previous; }, "a new stdio server pid", 30_000);
    return pid!;
  };

  const openRun = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try { const parsed = JSON.parse(String(raw)) as Wire; if (typeof parsed.type === "string") messages.push(parsed); } catch { /* ignore */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    /** Sends one message and waits for the turn; returns the turn's wire text. */
    const turn = async (content: string) => {
      const start = messages.length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      await until(() => messages.slice(start).some((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR"), `turn of ${runId}`, 120_000);
      const text = JSON.stringify(messages.slice(start));
      expect(messages.slice(start).some((m) => m.type === "ERROR"), text.slice(-800)).toBe(false);
      return text;
    };
    return { socket, turn };
  };
  const createRun = async (definitionId: string) => {
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, ...runConfig() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    runIds.push(created.runId);
    return created.runId as string;
  };
  /** A new run that calls the stdio tool once; returns its run, live turn function and its server's pid. */
  const runThatCallsStdio = async (definitionId: string) => {
    const before = await readPid();
    const runId = await createRun(definitionId);
    const run = await openRun(runId);
    expect(await run.turn(callTool(STDIO_TOOL, { name: "CLEANUP_ENV" }))).toContain(ENV_VALUE);
    const pid = await newPid(before);
    expect(isAlive(pid)).toBe(true);
    return { runId, ...run, pid };
  };
  const terminate = async (runId: string) => {
    const result = (await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "mcp-run-session-cleanup-e2e-")));
    pidFile = path.join(dataDir, "stdio-server.pid");
    await fs.mkdir(path.join(dataDir, "workspace"));
    await fs.writeFile(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n${GRACE_KEY}=${GRACE_MS}\n`);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const input = { serverId: "cleanup_stdio", transportType: "STDIO", enabled: true, toolNamePrefix: "cleanup_stdio",
      stdioConfig: { command: process.execPath, args: [FIXTURE], env: { CLEANUP_ENV: ENV_VALUE, MCP_TEST_SERVER_PID_FILE: pidFile }, cwd: dataDir } };
    await gql("mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }", { input });
    const discovered = (await gql("mutation($id: String!) { discoverAndRegisterMcpServerTools(serverId: $id) { success message } }",
      { id: input.serverId })).discoverAndRegisterMcpServerTools;
    expect(discovered.success, discovered.message).toBe(true);
    workerName = `Cleanup Worker ${randomUUID().slice(0, 6)}`;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    if (app) {
      for (const runId of runIds) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
      await McpServerInstanceManager.getInstance().cleanupMcpServerInstancesForAgent(MCP_GATEWAY_EXECUTION_SCOPE_ID);
      await app.close();
    }
    if (savedCase === undefined) delete process.env["AGY_FAKE_CASE"]; else process.env["AGY_FAKE_CASE"] = savedCase;
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it("ends the run's stdio server process when the run is terminated", async () => {
    const run = await runThatCallsStdio(await definition(`Cleanup Terminate ${randomUUID().slice(0, 6)}`, [STDIO_TOOL]));
    await terminate(run.runId);
    expect(await exitsWithin(run.pid, EXIT_BOUND_MS)).toBe(true);
  }, 180_000);

  it("leaves no stdio server process once a terminated run is deleted", async () => {
    const run = await runThatCallsStdio(await definition(`Cleanup Delete ${randomUUID().slice(0, 6)}`, [STDIO_TOOL]));
    await terminate(run.runId);
    const deleted = (await gql("mutation($id: String!) { deleteStoredRun(runId: $id) { success message } }", { id: run.runId })).deleteStoredRun;
    expect(deleted.success, deleted.message).toBe(true);
    expect(await exitsWithin(run.pid, EXIT_BOUND_MS)).toBe(true);
  }, 180_000);

  it("gives a run woken right after termination a new, working stdio server process", async () => {
    const run = await runThatCallsStdio(await definition(`Cleanup Wake ${randomUUID().slice(0, 6)}`, [STDIO_TOOL]));
    await terminate(run.runId);
    const restored = (await gql("mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message } }", { id: run.runId })).restoreAgentRun;
    expect(restored.success, restored.message).toBe(true);
    const woken = await openRun(run.runId);
    expect(await woken.turn(callTool(STDIO_TOOL, { name: "CLEANUP_ENV" }))).toContain(ENV_VALUE);
    const pid = await newPid(run.pid);
    expect(isAlive(pid)).toBe(true);
    expect(await exitsWithin(run.pid, EXIT_BOUND_MS)).toBe(true);
  }, 180_000);

  it("leaves another run's stdio server process and the gateway working when one run ends", async () => {
    const definitionId = await definition(`Cleanup Pair ${randomUUID().slice(0, 6)}`, [STDIO_TOOL]);
    const a = await runThatCallsStdio(definitionId);
    const b = await runThatCallsStdio(definitionId);
    expect(b.pid).not.toBe(a.pid);
    await terminate(a.runId);
    expect(await exitsWithin(a.pid, EXIT_BOUND_MS)).toBe(true);
    expect(isAlive(b.pid)).toBe(true);
    expect(await b.turn(callTool(STDIO_TOOL, { name: "CLEANUP_ENV" }))).toContain(ENV_VALUE);
    expect(await readPid()).toBe(b.pid);

    const client = new Client({ name: "mcp-cleanup-e2e-gateway-client", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL("/mcp/gateway", url)));
    try {
      const result = await client.callTool({ name: STDIO_TOOL, arguments: { name: "CLEANUP_ENV" } }) as { content: Array<{ text?: string }> };
      expect(JSON.stringify(result.content)).toContain(ENV_VALUE);
    } finally {
      await client.close();
    }
    expect(isAlive(b.pid)).toBe(true);
  }, 240_000);

  it("ends a delegated copy's stdio server process when the copy is shut down after the idle grace period", async () => {
    const managerId = await createRun(await definition(`Cleanup Manager ${randomUUID().slice(0, 6)}`, []));
    await definition(workerName, [STDIO_TOOL]);
    const manager = await openRun(managerId);
    const before = await readPid();
    await manager.turn(callTool("delegate_task", {
      recipient_address: `/${segment(workerName)}`,
      description: callTool(STDIO_TOOL, { name: "CLEANUP_ENV" }),
    }));
    const pid = await newPid(before);
    const startedAt = Date.now();
    expect(isAlive(pid)).toBe(true);
    // The copy goes idle after its turn; it is shut down one grace period later (plus the monitor's polling).
    expect(await exitsWithin(pid, GRACE_MS + 20_000 + EXIT_BOUND_MS)).toBe(true);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(GRACE_MS - 5_000);
  }, 240_000);
});
