import "reflect-metadata";
import fs from "node:fs/promises";
import net from "node:net";
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

// Real AGY daemons shown as Background Tasks through the real server (AC-013; opt-in; about 5 minutes;
// uses the local `agy` login). AGY reports a daemon's exit only in its conversation message files,
// which the server polls, so these cases guard that undocumented format on AGY upgrades.
// Run: RUN_AGY_BACKGROUND_E2E=1 [AGY_BACKGROUND_EVIDENCE_DIR=<dir>] vitest run tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts
const live = process.env["RUN_AGY_BACKGROUND_E2E"] === "1" &&
  spawnSync("agy", ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = live ? describe : describe.skip;
const evidenceDir = path.resolve(process.env["AGY_BACKGROUND_EVIDENCE_DIR"] ?? path.join(os.tmpdir(), "agy-background-e2e-evidence"));
const MODEL = "gemini-3.8-flash-high";
const BACKGROUND_RESULT = { provider_state: "RUNNING",
  output: "Started as a background task; still running when the turn ended." };
type Wire = { at: number; type: string; payload: Record<string, unknown> };
type TaskSnapshot = { task_id: string; kind: string; description: string; command: string | null; status: string; summary: string | null; started_at: string };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = (server.address() as net.AddressInfo).port;
    server.close(() => resolve(port));
  });
});
const listening = (port: number) => new Promise<boolean>((resolve) => {
  const socket = net.connect({ port, host: "127.0.0.1" });
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("error", () => resolve(false));
});
const waitListening = async (port: number, expected: boolean, ms: number) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline && await listening(port) !== expected) await wait(250);
  return await listening(port) === expected;
};
const killPortOwner = (port: number) => {
  for (const pid of spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).stdout.split(/\s+/).filter(Boolean))
    spawnSync("kill", [pid]);
};
const command = (m: Wire) => String((m.payload["arguments"] as Record<string, unknown> | undefined)?.["CommandLine"] ?? "");
const daemonPrompt = (commandLine: string) => "Using your run_command tool, start exactly this command as a long-running background daemon "
  + `(IsDaemon true) in the project directory: \`${commandLine}\`. Do not wait for it and do not check it. Immediately reply STARTED and end your turn.`;

suite("real AGY daemons are shown as background tasks (AC-013)", () => {
  let appDataDir = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
  const ports: number[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const terminate = async (runId: string) => (await graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
    { agentRunId: runId })).terminateAgentRun.success;
  const writeEvidence = async (name: string, value: unknown) => {
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, name), JSON.stringify(value, null, 2));
  };

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-background-updates-live-"));
    await fs.writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-background-updates-live-" + randomUUID(), role: "assistant", category: "runtime-e2e",
        description: "Real AGY background task status agent", toolNames: [],
        instructions: "Follow the user's command steps exactly with your run_command tool." } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) await terminate(runId).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    for (const port of ports) killPortOwner(port);
    if (appDataDir) await fs.rm(appDataDir, { recursive: true, force: true });
  });

  const openRun = async () => {
    const workspace = await fs.mkdtemp(path.join(appDataDir, "workspace-"));
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: {}, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    const runId = started.createAgentRun.runId!;
    runIds.push(runId);
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    sockets.push(socket);
    const t0 = Date.now();
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ at: Date.now() - t0, type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
            ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const send = (content: string) => { const from = messages.length; sendE2eSendMessageCommand(socket, { agent_run_id: runId, content }); return from; };
    const turnEnd = (from: number) => messages.slice(from).find((m) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED"
      || (m.type === "ERROR" && m.payload["error_effect"] === "terminal"));
    const until = async <T>(probe: () => T | undefined, ms: number) => {
      const deadline = Date.now() + ms;
      let value = probe();
      while (value === undefined && Date.now() < deadline) { await wait(250); value = probe(); }
      return value;
    };
    const tasks = (from = 0) => messages.slice(from).filter((m) => m.type === "BACKGROUND_TASK_UPDATED")
      .map((m) => ({ at: m.at, ...(m.payload as unknown as TaskSnapshot) }));
    const taskWith = (status: string, taskId?: string) => () =>
      tasks().find((task) => task.status === status && (taskId === undefined || task.task_id === taskId));
    return { runId, workspace, messages, send, turnEnd, until, tasks, taskWith };
  };
  type Run = Awaited<ReturnType<typeof openRun>>;

  /** Starts a daemon, checks the unchanged tool result and the running entry, and returns both. */
  const startDaemon = async (run: Run, commandLine: string, evidence: Record<string, unknown>) => {
    const from = run.send(daemonPrompt(commandLine));
    const end = await run.until(() => run.turnEnd(from), 180_000);
    expect(end?.type, JSON.stringify(run.messages.slice(from).map((m) => m.type))).toBe("TURN_COMPLETED");
    const start = run.messages.slice(from).find((m) => m.type === "TOOL_EXECUTION_STARTED" && command(m).includes(commandLine.slice(0, 12)));
    expect(start, "daemon tool call").toBeDefined();
    // The tool call closes exactly as before (BEH-007 preserved text).
    const closed = run.messages.find((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === start!.payload["invocation_id"]);
    expect(closed?.payload["result"]).toEqual(BACKGROUND_RESULT);
    const running = await run.until(run.taskWith("running"), 10_000);
    expect(running, "running BACKGROUND_TASK_UPDATED").toBeDefined();
    expect(running!).toMatchObject({ kind: "shell", status: "running", summary: null });
    expect(running!.description).toContain(commandLine.slice(0, 12));
    // REQ-003: the command is the step's command line, identical to the unchanged title.
    expect(running!.command).toBe(running!.description);
    expect(running!.task_id).toMatch(/^[0-9a-f-]{36}\/task-\d+$/u);
    evidence.turnEndAtMs = end!.at;
    evidence.running = running;
    return { end: end!, running: running! };
  };

  it("(a) a daemon that exits 0 after its turn ends shows running, then completed about 20 s later without new input", async () => {
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "L-AGY-01", runId: run.runId, model: MODEL };
    try {
      const { end, running } = await startDaemon(run, "sleep 20; echo DAEMON_EXITED_MARKER > daemon-exit.txt", evidence);
      const inputsBefore = run.messages.length;
      const completed = await run.until(run.taskWith("completed", running.task_id), 90_000);
      evidence.completed = completed ?? null;
      expect(completed, "completed BACKGROUND_TASK_UPDATED").toBeDefined();
      expect(completed!.at - end.at, "completion follows the daemon's own exit").toBeGreaterThanOrEqual(12_000);
      expect(completed!.summary ?? "").toMatch(/exited with code 0/u);
      expect(completed!).toMatchObject({ kind: "shell", started_at: running.started_at, description: running.description });
      // No new turn was needed: nothing but background-task updates arrived after the turn ended.
      expect(run.messages.slice(inputsBefore).filter((m) => m.type.startsWith("TURN_") || m.type.startsWith("TOOL_"))).toEqual([]);
      expect(run.tasks().map((task) => task.status)).toEqual(["running", "completed"]);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); evidence.stream = run.messages.map((m) => ({ at: m.at, type: m.type })); throw error;
    } finally { await writeEvidence("l-agy-01-exit-0.json", evidence); }
  }, 300_000);

  it("(b) a daemon that exits 3 shows failed with the exit code in its summary", async () => {
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "L-AGY-02", runId: run.runId, model: MODEL };
    try {
      const { running } = await startDaemon(run, "sleep 10; echo FAILING >&2; exit 3", evidence);
      const failed = await run.until(run.taskWith("failed", running.task_id), 90_000);
      evidence.failed = failed ?? null;
      expect(failed, "failed BACKGROUND_TASK_UPDATED").toBeDefined();
      expect(failed!.summary ?? "").toMatch(/exited with code 3/u);
      expect(run.tasks().map((task) => task.status)).toEqual(["running", "failed"]);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("l-agy-02-exit-3.json", evidence); }
  }, 300_000);

  it("(c) a never-exiting daemon shows running and becomes stopped when the run is terminated", async () => {
    const port = await freePort(); ports.push(port);
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "L-AGY-03", runId: run.runId, port, model: MODEL };
    try {
      const { running } = await startDaemon(run, `python3 -m http.server ${port} --bind 127.0.0.1`, evidence);
      expect(await waitListening(port, true, 10_000), "daemon is listening").toBe(true);
      await wait(5_000);
      expect(run.tasks().map((task) => task.status)).toEqual(["running"]);
      expect(await terminate(run.runId)).toBe(true);
      // RR-001: the stopped snapshot is written to the stream before the terminate mutation resolves.
      evidence.stoppedReceivedByMutationResponse = run.taskWith("stopped", running.task_id)() !== undefined;
      const stopped = await run.until(run.taskWith("stopped", running.task_id), 5_000);
      evidence.stopped = stopped ?? null;
      expect(stopped, "stopped BACKGROUND_TASK_UPDATED").toBeDefined();
      expect(stopped!.summary).toBeNull();
      expect(run.tasks().map((task) => task.status)).toEqual(["running", "stopped"]);
      expect(await waitListening(port, false, 10_000), "daemon stopped with AGY").toBe(true);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("l-agy-03-terminate.json", evidence); }
  }, 300_000);

  it("a non-daemon background command keeps the turn open and produces no background-task entry", async () => {
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "L-AGY-04", runId: run.runId, model: MODEL };
    try {
      const from = run.send("Use run_command to run `sleep 40 && echo FINISHED_MARKER` in the background with WaitMsBeforeAsync 1000 "
        + "(it must go to the background; it is NOT a daemon, so leave IsDaemon false). Do NOT wait for it, do NOT check its status. "
        + "Immediately reply STARTED and end your turn.");
      const end = await run.until(() => run.turnEnd(from), 240_000);
      evidence.turn = run.messages.slice(from).map((m) => ({ at: m.at, type: m.type, command: command(m) || null }));
      expect(end?.type).toBe("TURN_COMPLETED");
      const start = run.messages.slice(from).find((m) => m.type === "TOOL_EXECUTION_STARTED" && command(m).includes("sleep 40"));
      expect(start).toBeDefined();
      expect(run.messages.find((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === start!.payload["invocation_id"])
        ?.payload["result"]).toMatchObject({ provider_state: "DONE" });
      await wait(5_000);
      expect(run.tasks()).toEqual([]);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("l-agy-04-non-daemon.json", evidence); }
  }, 300_000);

  it("a daemon whose exit report exceeds the 64 KiB read bound never shows a false status and ends by the fail-safe", async () => {
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "L-AGY-05", runId: run.runId, model: MODEL };
    try {
      const { running } = await startDaemon(run, "sleep 5; python3 -c \"print('x' * 200000)\"; exit 0", evidence);
      await wait(40_000);
      const beforeTerminate = run.tasks().map((task) => task.status);
      evidence.statusesBeforeTerminate = beforeTerminate;
      expect(beforeTerminate).not.toContain("failed");
      await terminate(run.runId);
      const final = await run.until(() => {
        const latest = run.tasks().filter((task) => task.task_id === running.task_id).at(-1);
        return latest && latest.status !== "running" ? latest : undefined;
      }, 5_000);
      evidence.final = final ?? null;
      // Readable report -> completed; oversized (unread) report -> running until AGY stops -> stopped.
      expect(["completed", "stopped"]).toContain(final?.status);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("l-agy-05-large-output.json", evidence); }
  }, 300_000);
});
