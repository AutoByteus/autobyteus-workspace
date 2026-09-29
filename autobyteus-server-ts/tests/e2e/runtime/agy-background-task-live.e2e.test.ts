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

// Real AGY background-task liveness through the real server (opt-in; about 10+ minutes; uses the local `agy` login).
// Run: RUN_AGY_BACKGROUND_E2E=1 [AGY_BACKGROUND_EVIDENCE_DIR=<dir>] vitest run tests/e2e/runtime/agy-background-task-live.e2e.test.ts
const live = process.env["RUN_AGY_BACKGROUND_E2E"] === "1" &&
  spawnSync("agy", ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = live ? describe : describe.skip;
const evidenceDir = path.resolve(process.env["AGY_BACKGROUND_EVIDENCE_DIR"] ?? path.join(os.tmpdir(), "agy-background-e2e-evidence"));
const MODEL = "gemini-3.8-flash-high";
const BACKGROUND_RESULT = { provider_state: "RUNNING",
  output: "Started as a background task; still running when the turn ended." };
type Wire = { at: number; type: string; payload: Record<string, unknown> };
type Projection = { conversation: Array<Record<string, unknown>>; activities: Array<Record<string, unknown>> };
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
  return listening(port);
};
/** pid/ppid/pgid of the process listening on the port, to prove the daemon runs in its own background group. */
const portOwner = (port: number) => {
  const pid = spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).stdout.split(/\s+/).find(Boolean);
  if (!pid) return null;
  const [ppid, pgid] = spawnSync("ps", ["-o", "ppid=,pgid=", "-p", pid], { encoding: "utf8" }).stdout.trim().split(/\s+/).map(Number);
  return { pid: Number(pid), ppid, pgid };
};
/** Time until the port stops listening (AC-A1/A2 "within a few seconds"). */
const msUntilClosed = async (port: number, ms: number) => {
  const started = Date.now();
  return await waitListening(port, false, ms) ? null : Date.now() - started;
};
/** Last-resort cleanup of the daemon this test asked AGY to start on its private port. */
const killPortOwner = (port: number) => {
  const pids = spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).stdout.split(/\s+/).filter(Boolean);
  for (const pid of pids) spawnSync("kill", [pid]);
  return pids;
};
const args = (m: Wire) => (m.payload["arguments"] as Record<string, unknown> | undefined) ?? {};
const command = (m: Wire) => String(args(m)["CommandLine"] ?? "");
const terminalTypes = ["TOOL_EXECUTION_SUCCEEDED", "TOOL_EXECUTION_FAILED", "TOOL_DENIED", "TOOL_EXECUTION_INTERRUPTED"];

suite("real AGY background tasks keep the AutoByteus turn alive", () => {
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
  const projection = async (runId: string): Promise<Projection> => (await graphql<{ getRunProjection: Projection }>(
    "query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }", { runId })).getRunProjection;
  const terminate = async (runId: string) => (await graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
    { agentRunId: runId })).terminateAgentRun.success;
  const writeEvidence = async (name: string, value: unknown) => {
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, name), JSON.stringify(value, null, 2));
  };

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-background-live-"));
    await fs.writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-background-live-" + randomUUID(), role: "assistant", category: "runtime-e2e",
        description: "Real AGY background task liveness agent", toolNames: [],
        instructions: "Follow the user's command steps exactly with your run_command tool." } });
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
    for (const port of ports) killPortOwner(port);
    if (appDataDir) await fs.rm(appDataDir, { recursive: true, force: true });
  });

  const openRun = async () => {
    const workspace = await fs.mkdtemp(path.join(appDataDir, "workspace-"));
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: {}, autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "antigravity_cli" } });
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
    const untilTurnEnd = async (from: number, ms: number) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !turnEnd(from)) await wait(500);
      return turnEnd(from);
    };
    const simplified = (list: Wire[]) => list.map((m) => ({ at_ms: m.at, type: m.type, tool_name: m.payload["tool_name"] ?? null,
      invocation_id: m.payload["invocation_id"] ?? null, command: command(m) || null,
      result: m.type.startsWith("TOOL_EXECUTION_S") ? m.payload["result"] ?? null : null, code: m.payload["code"] ?? null,
      delta: m.type === "SEGMENT_CONTENT" ? String(m.payload["delta"] ?? "").slice(0, 300) : null }));
    return { runId, socket, workspace, messages, send, untilTurnEnd, simplified };
  };
  /** Every started tool invocation received exactly one terminal event. */
  const expectNoDanglingTools = (list: Wire[]) => {
    for (const start of list.filter((m) => m.type === "TOOL_EXECUTION_STARTED"))
      expect(list.filter((m) => terminalTypes.includes(m.type) && m.payload["invocation_id"] === start.payload["invocation_id"]),
        `terminal events for ${command(start) || String(start.payload["tool_name"])}`).toHaveLength(1);
  };

  it("SCN-001: daemon then continued work completes; daemon card closes as background; no late event after result; next turn is clean; terminate stops the daemon", async () => {
    const port = await freePort(); ports.push(port);
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "LIVE-BG-001", runId: run.runId, port, model: MODEL };
    try {
      const from = run.send("Do exactly these steps in order, using your run_command tool for each: "
        + `1) start \`python3 -m http.server ${port} --bind 127.0.0.1\` in the project directory as a long-running background daemon (it never exits). `
        + "2) after it is started, run `echo AFTER_ONE`. 3) run `sleep 5 && echo AFTER_TWO`. "
        + "4) write a file named done.txt containing OK. Then reply DONE and end the turn. Do not stop the server.");
      const end = await run.untilTurnEnd(from, 300_000);
      const turn = run.messages.slice(from);
      evidence.turn = run.simplified(turn);
      evidence.turnEnd = end?.type ?? null;
      expect(end?.type, JSON.stringify(evidence.turn)).toBe("TURN_COMPLETED");
      expect(turn.some((m) => m.type === "ERROR" || m.type === "TURN_INTERRUPTED")).toBe(false);
      const daemonStarts = turn.filter((m) => m.type === "TOOL_EXECUTION_STARTED" && command(m).includes(`http.server ${port}`));
      expect(daemonStarts).toHaveLength(1);
      const daemonId = daemonStarts[0]!.payload["invocation_id"];
      const daemonDone = turn.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === daemonId);
      expect(daemonDone).toHaveLength(1);
      expect(daemonDone[0]!.payload).toMatchObject({ tool_name: "run_command", result: BACKGROUND_RESULT,
        turn_id: daemonStarts[0]!.payload["turn_id"], arguments: args(daemonStarts[0]!) });
      expect(turn.indexOf(daemonDone[0]!)).toBeLessThan(turn.indexOf(end!));
      // Steps AGY withheld behind the running daemon are delivered and finished normally.
      for (const marker of ["echo AFTER_ONE", "AFTER_TWO"]) {
        const start = turn.find((m) => m.type === "TOOL_EXECUTION_STARTED" && command(m).includes(marker));
        expect(start, marker).toBeDefined();
        expect(turn.find((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === start!.payload["invocation_id"])
          ?.payload["result"]).toMatchObject({ provider_state: "DONE" });
      }
      expectNoDanglingTools(turn);
      // The write step ran after the daemon (its file location depends on the model's chosen tool/cwd).
      const write = turn.find((m) => m.type === "TOOL_EXECUTION_STARTED" && JSON.stringify(args(m)).includes("done.txt"));
      expect(write, "a step writing done.txt").toBeDefined();
      expect(turn.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === write!.payload["invocation_id"])).toBe(true);
      expect(await waitListening(port, true, 5_000)).toBe(true);

      // Quiet window: the daemon keeps running, AGY sends nothing outside a turn, the run stays usable.
      const quietFrom = run.messages.length;
      await wait(130_000);
      const quiet = run.messages.slice(quietFrom);
      evidence.quietWindow = { ms: 130_000, events: run.simplified(quiet) };
      expect(quiet.filter((m) => m.type.startsWith("TOOL_") || m.type.startsWith("TURN_") || m.type === "ERROR")).toEqual([]);
      expect(await listening(port)).toBe(true);

      const nextFrom = run.send("Reply with only the text NEXT_TURN_OK. Do not use any tool.");
      const nextEnd = await run.untilTurnEnd(nextFrom, 180_000);
      const next = run.messages.slice(nextFrom);
      evidence.nextTurn = run.simplified(next);
      expect(nextEnd?.type).toBe("TURN_COMPLETED");
      expect(next.some((m) => m.type === "ERROR")).toBe(false);
      expect(next.filter((m) => m.type.startsWith("TOOL_"))).toEqual([]);
      expect(next.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => m.payload["delta"]).join("")).toContain("NEXT_TURN_OK");

      const history = await projection(run.runId);
      evidence.historyDaemonRow = history.conversation.find((row) => row["invocationId"] === daemonId) ?? null;
      expect(evidence.historyDaemonRow).toMatchObject({ kind: "tool_call", toolName: "run_command", toolResult: BACKGROUND_RESULT });
      expect(history.activities.find((row) => row["invocationId"] === daemonId)).toMatchObject({ status: "success", result: BACKGROUND_RESULT });

      // AC-A2: Terminate stops AGY together with its background process groups; the daemon's port is freed.
      evidence.daemonOwnerBeforeTerminate = portOwner(port);
      expect(await terminate(run.runId)).toBe(true);
      evidence.daemonClosedAfterTerminateMs = await msUntilClosed(port, 15_000);
      expect(evidence.daemonClosedAfterTerminateMs, "daemon still listening after terminate").not.toBeNull();
      expect(evidence.daemonClosedAfterTerminateMs as number).toBeLessThanOrEqual(5_000);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-bg-001-scn-001.json", evidence); }
  }, 720_000);

  it("SCN-002: a non-daemon background task running longer than five minutes keeps the silent turn alive until it completes", async () => {
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "LIVE-BG-002", runId: run.runId, model: MODEL };
    try {
      const from = run.send("Use run_command to run `sleep 330 && echo FINISHED_MARKER` in the background with WaitMsBeforeAsync 1000 "
        + "(it must go to the background). Do NOT wait for it, do NOT check its status. Immediately reply STARTED and end your turn.");
      const end = await run.untilTurnEnd(from, 540_000);
      const turn = run.messages.slice(from);
      const times = turn.map((m) => m.at);
      const gaps = times.slice(1).map((at, i) => at - times[i]!);
      evidence.turn = run.simplified(turn);
      evidence.turnEnd = end?.type ?? null;
      evidence.maxSilentGapMs = Math.max(0, ...gaps);
      evidence.turnDurationMs = times.length ? times[times.length - 1]! - times[0]! : 0;
      expect(end?.type, JSON.stringify(evidence.turn)).toBe("TURN_COMPLETED");
      expect(turn.some((m) => m.type === "ERROR" || m.type === "TURN_INTERRUPTED")).toBe(false);
      expect(evidence.maxSilentGapMs as number).toBeGreaterThan(300_000);
      const sleepStart = turn.find((m) => m.type === "TOOL_EXECUTION_STARTED" && command(m).includes("sleep 330"));
      expect(sleepStart).toBeDefined();
      expect(turn.find((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === sleepStart!.payload["invocation_id"])
        ?.payload["result"]).toMatchObject({ provider_state: "DONE" });
      expectNoDanglingTools(turn);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally {
      await terminate(run.runId).catch(() => undefined);
      await writeEvidence("live-bg-002-scn-002.json", evidence);
    }
  }, 600_000);

  it("Stop during a turn with a backgrounded daemon interrupts the turn, stops the daemon and never closes it as a background success", async () => {
    const port = await freePort(); ports.push(port);
    const run = await openRun();
    const evidence: Record<string, unknown> = { case: "LIVE-BG-003", runId: run.runId, port, model: MODEL };
    try {
      const from = run.send("Do exactly these steps in order, using your run_command tool for each: "
        + `1) start \`python3 -m http.server ${port} --bind 127.0.0.1\` in the project directory as a long-running background daemon (it never exits). `
        + "2) then run `sleep 240 && echo LATE_MARKER` and wait for it to finish. Then reply DONE. Do not stop the server.");
      const deadline = Date.now() + 180_000;
      const daemonStart = () => run.messages.slice(from).find((m) => m.type === "TOOL_EXECUTION_STARTED" && command(m).includes(`http.server ${port}`));
      while (Date.now() < deadline && !(daemonStart() && await listening(port))) await wait(500);
      expect(daemonStart()).toBeDefined();
      expect(await listening(port)).toBe(true);
      // Stop only after AGY has backgrounded the daemon (well past WaitMsBeforeAsync), the case that used to leak.
      await wait(10_000);
      evidence.daemonOwnerBeforeStop = portOwner(port);
      expect(run.messages.slice(from).some((m) => m.type === "TURN_COMPLETED")).toBe(false);
      const commandId = `interrupt-${randomUUID()}`;
      run.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: commandId } }));
      const end = await run.untilTurnEnd(from, 30_000);
      await wait(500);
      const turn = run.messages.slice(from);
      evidence.turn = run.simplified(turn);
      evidence.ack = turn.find((m) => m.type === "AGENT_COMMAND_ACK" && m.payload["command_id"] === commandId)?.payload ?? null;
      expect(evidence.ack).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
      expect(end?.type).toBe("TURN_INTERRUPTED");
      const daemonId = daemonStart()!.payload["invocation_id"];
      expect(turn.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["invocation_id"] === daemonId)).toBe(false);
      expect(turn.some((m) => m.type === "ERROR" && m.payload["code"] === "AGY_PROCESS_ERROR")).toBe(false);
      // AC-A1: Stop stops AGY together with its background process groups; the daemon's port is freed.
      evidence.daemonClosedAfterStopMs = await msUntilClosed(port, 15_000);
      expect(evidence.daemonClosedAfterStopMs, "daemon still listening after Stop").not.toBeNull();
      expect(evidence.daemonClosedAfterStopMs as number).toBeLessThanOrEqual(5_000);
      const history = await projection(run.runId);
      evidence.historyDaemonActivity = history.activities.find((row) => row["invocationId"] === daemonId) ?? null;
      expect((evidence.historyDaemonActivity as Record<string, unknown> | null)?.["status"]).not.toBe("success");
      expect(JSON.stringify(history)).not.toContain(BACKGROUND_RESULT.output);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-bg-003-stop.json", evidence); }
  }, 300_000);
});
