import "reflect-metadata";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Real AGY: AutoByteus-initiated stops also stop AGY's background process groups, and Agent Org / Agent Team
// roots recover from a member whose AGY runtime died (crash via kill -9, or user Stop).
// Opt-in (about 15 minutes; uses the local `agy` login):
//   RUN_AGY_RECOVERY_E2E=1 [AGY_RECOVERY_EVIDENCE_DIR=<dir>] vitest run tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts
const live = process.env["RUN_AGY_RECOVERY_E2E"] === "1" &&
  spawnSync("agy", ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = live ? describe : describe.skip;
const evidenceDir = path.resolve(process.env["AGY_RECOVERY_EVIDENCE_DIR"] ?? path.join(os.tmpdir(), "agy-recovery-e2e-evidence"));
const MODEL = "gemini-3.8-flash-high";
const INSTRUCTIONS = "Follow the user's instructions exactly. When asked to remember a code, reply with exactly OK. "
  + "When asked which code you were asked to remember, reply with that code only. Use your own run_command tool "
  + "for shell commands. Do not use AutoByteus MCP tools.";
type Frame = { at: number; type: string; payload: Record<string, unknown> };
type Json = Record<string, unknown>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- OS helpers (only ever touch processes this test created) ----
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
const msUntilClosed = async (port: number, ms: number): Promise<number | null> => {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (!await listening(port)) return Date.now() - started;
    await wait(200);
  }
  return null;
};
const waitListening = async (port: number, ms: number) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await listening(port)) return true; await wait(500); }
  return false;
};
const killPortOwner = (port: number) => {
  for (const pid of spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).stdout.split(/\s+/).filter(Boolean))
    spawnSync("kill", ["-9", pid]);
};
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
/** AGY processes this server spawned for one AgentRun (argv `--agent autobyteus-<sha256(runId)[:16]>`). */
const agyProcesses = (runId: string) => {
  const agent = `autobyteus-${createHash("sha256").update(runId).digest("hex").slice(0, 16)}`;
  return spawnSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8" }).stdout.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (!match || Number(match[2]) !== process.pid || !match[3]!.includes(`--agent ${agent} `)) return [];
    return [{ pid: Number(match[1]), command: match[3]! }];
  });
};
const waitAgyProcess = async (runId: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const found = agyProcesses(runId); if (found.length) return found; await wait(250); }
  return [];
};
const waitGone = async (pid: number, ms = 10_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline && alive(pid)) await wait(100);
  return !alive(pid);
};
/** Simulated member crash: SIGKILL the member's AGY process. */
const crashMember = async (runId: string) => {
  const processes = agyProcesses(runId);
  expect(processes, `one live AGY process for ${runId}`).toHaveLength(1);
  process.kill(processes[0]!.pid, "SIGKILL");
  expect(await waitGone(processes[0]!.pid)).toBe(true);
  await wait(1_500);
  return processes[0]!;
};

suite("real AGY stop cleanup and Org/Team member recovery", () => {
  let appDataDir = "";
  let workspace = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const definitions: Array<{ kind: "agent" | "team" | "org"; id: string }> = [];
  const orgRuns = new Set<string>();
  const teamRuns = new Set<string>();
  const agentRuns = new Set<string>();
  const sockets: WebSocket[] = [];
  const ports: number[] = [];
  let directorDefinitionId = "";
  let workerDefinitionId = "";
  let orgDefinitionId = "";
  let pairTeamDefinitionId = "";

  const graphql = async <T>(query: string, variables?: Json): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const writeEvidence = async (name: string, value: unknown) => {
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, name), JSON.stringify(value, null, 2));
  };
  const record = async <T>(evidence: Json, key: string, fn: () => Promise<T>): Promise<T> => {
    try { const value = await fn(); evidence[key] = value; return value; }
    catch (error) { evidence[key] = { error: String(error) }; throw error; }
  };

  // ---- Org GraphQL ----
  const terminateOrg = async (orgRunId: string) => (await graphql<{ terminateAgentOrgRun: { success: boolean; message: string } }>(
    "mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId })).terminateAgentOrgRun;
  const restoreOrg = async (orgRunId: string) => (await graphql<{ restoreAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
    "mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message agentOrgRunId } }", { id: orgRunId })).restoreAgentOrgRun;
  const orgConfig = async (orgRunId: string) => (await graphql<{ getAgentOrgRunConfig: { isActive: boolean; executionTree: Json } }>(
    "query($id: String!) { getAgentOrgRunConfig(orgRunId: $id) { isActive executionTree } }", { id: orgRunId })).getAgentOrgRunConfig;
  /** REQ-B4: the inspection's active flag, or the error it reports for a non-running Org. */
  const orgInspectionActive = async (orgRunId: string): Promise<boolean | string> => {
    try {
      const inspection = (await graphql<{ getAgentOrgRunInspection: Json }>(
        "query($id: String!) { getAgentOrgRunInspection(orgRunId: $id) }", { id: orgRunId })).getAgentOrgRunInspection;
      const root = inspection["root_org"] as Json | undefined;
      return Boolean(root?.["is_active"] ?? inspection["is_active"]);
    } catch (error) { return `error: ${String(error).slice(0, 300)}`; }
  };
  const orgState = async (orgRunId: string) => ({ configIsActive: (await orgConfig(orgRunId)).isActive,
    inspectionIsActive: await orgInspectionActive(orgRunId) });
  const orgMembers = (tree: Json) => {
    const members = (tree["rootOrg"] as { members: Json[] }).members;
    const director = members.find((member) => member["address"] === "/director")!;
    const team = members.find((member) => member["address"] === "/team")!;
    const worker = (team["members"] as Json[]).find((member) => member["address"] === "/team/worker")!;
    return { director, worker };
  };
  const createOrg = async () => {
    const created = await graphql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: orgDefinitionId, agentOverrides: [], teamOverrides: [],
        rootConfiguration: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: null,
          autoExecuteTools: true, skillAccessMode: "NONE", workspaceRootPath: workspace } } });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    orgRuns.add(orgRunId);
    const { director, worker } = orgMembers((await orgConfig(orgRunId)).executionTree);
    return { orgRunId, directorRunId: String(director["agentRunId"]), workerRunId: String(worker["agentRunId"]) };
  };

  /** Org WebSocket session (`/ws/agent-org/<id>`), per-member attribution via ROOT_EXECUTION_EVENT agent_presentation. */
  const openOrgSession = async (orgRunId: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-org/${orgRunId}`);
    sockets.push(socket);
    const t0 = Date.now();
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type: string; payload: Json };
        frames.push({ at: Date.now() - t0, type: parsed.type, payload: parsed.payload ?? {} });
      } catch { /* ignore malformed diagnostic frames */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const readyDeadline = Date.now() + 15_000;
    while (Date.now() < readyDeadline && !frames.some((f) => f.type === "ROOT_LIFECYCLE" && f.payload["is_active"] === true)) await wait(100);
    expect(frames.some((f) => f.type === "ROOT_LIFECYCLE" && f.payload["is_active"] === true), JSON.stringify(frames)).toBe(true);
    await wait(100);
    const memberEvent = (f: Frame, runId: string) => {
      if (f.type !== "ROOT_EXECUTION_EVENT") return null;
      const event = f.payload["event"] as Json | undefined;
      if (event?.["kind"] !== "agent_presentation" || event["agent_run_id"] !== runId) return null;
      return event["message"] as Json;
    };
    const command = (type: "SEND_MESSAGE" | "INTERRUPT_GENERATION", runId: string, content?: string) => {
      const commandId = randomUUID();
      const start = frames.length;
      socket.send(JSON.stringify({ type, payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
        target_agent_run_id: runId, command_id: commandId,
        ...(type === "SEND_MESSAGE" ? { content, context_file_paths: [], image_urls: [],
          message_id: randomUUID(), dedupe_key: randomUUID() } : {}) } }));
      return { commandId, start };
    };
    const ack = (commandId: string) => frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload["command_id"] === commandId)?.payload;
    const until = async (predicate: () => boolean, ms: number) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !predicate()) await wait(250);
      return predicate();
    };
    const turnEnd = (start: number, runId: string) => frames.slice(start).map((f) => memberEvent(f, runId))
      .find((m) => m?.["type"] === "TURN_COMPLETED" || m?.["type"] === "TURN_INTERRUPTED");
    /** Sends a message to a member and waits for its ACK and turn end. */
    const ask = async (runId: string, content: string, ms = 180_000) => {
      const { commandId, start } = command("SEND_MESSAGE", runId, content);
      await until(() => Boolean(ack(commandId)?.["state"] === "rejected" || ack(commandId)?.["state"] === "failed" || turnEnd(start, runId)), ms);
      const text = frames.slice(start).map((f) => memberEvent(f, runId))
        .filter((m) => m?.["type"] === "SEGMENT_CONTENT")
        .map((m) => String((m!["payload"] as Json | undefined)?.["delta"] ?? "")).join("");
      return { ack: ack(commandId) ?? null, turnEnd: (turnEnd(start, runId)?.["type"] as string | undefined) ?? null, text, start };
    };
    /** Starts a long foreground command, waits until its tool started, then sends Stop for that member. */
    const stopMidTurn = async (runId: string) => {
      const { start } = command("SEND_MESSAGE", runId,
        "Use run_command to run `sleep 120 && echo LATE_MARKER` and wait for it to finish, then reply DONE.");
      const toolStarted = await until(() => frames.slice(start).some((f) => memberEvent(f, runId)?.["type"] === "TOOL_EXECUTION_STARTED"), 120_000);
      const agy = agyProcesses(runId);
      const stop = command("INTERRUPT_GENERATION", runId);
      await until(() => Boolean(turnEnd(stop.start, runId)), 30_000);
      return { toolStarted, agyBeforeStop: agy, stopAck: ack(stop.commandId) ?? null,
        turnEnd: (turnEnd(start, runId)?.["type"] as string | undefined) ?? null,
        agyGone: agy.length === 1 ? await waitGone(agy[0]!.pid) : null };
    };
    const close = () => { if (socket.readyState === WebSocket.OPEN) socket.close(); };
    return { frames, ask, stopMidTurn, close, command, ack };
  };

  const startDaemonPrompt = (port: number) => "Use run_command to start "
    + `\`python3 -m http.server ${port} --bind 127.0.0.1\` in the project directory as a long-running background daemon `
    + "(IsDaemon, it never exits). After it has started, reply with exactly DAEMON_STARTED and end your turn. Do not stop the server.";

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-recovery-live-"));
    workspace = path.join(appDataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const unique = randomUUID();
    const createAgent = async (name: string) => {
      const id = (await graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
        { input: { name: `agy-recovery-${name}-${unique}`, role: "assistant", description: "Live AGY recovery member",
          instructions: INSTRUCTIONS, category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
      definitions.push({ kind: "agent", id });
      return id;
    };
    directorDefinitionId = await createAgent("director");
    workerDefinitionId = await createAgent("worker");
    const alphaId = await createAgent("alpha");
    const betaId = await createAgent("beta");
    const team = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `agy-recovery-team-${unique}`, description: "Nested AGY team", instructions: INSTRUCTIONS,
        coordinatorMemberName: "worker", nodes: [{ memberName: "worker", ref: workerDefinitionId, refScope: "SHARED" }] } }))
      .createAgentTeamDefinition.id;
    definitions.push({ kind: "team", id: team });
    orgDefinitionId = (await graphql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `agy-recovery-org-${unique}`, description: "Live AGY recovery Org", instructions: INSTRUCTIONS,
        members: [
          { memberName: "director", ref: directorDefinitionId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "team", ref: team, refType: "AGENT_TEAM", refScope: "SHARED" },
        ], handoffs: [] } })).createAgentOrgDefinition.id;
    definitions.push({ kind: "org", id: orgDefinitionId });
    pairTeamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `agy-recovery-pair-${unique}`, description: "Standalone AGY pair", instructions: INSTRUCTIONS,
        coordinatorMemberName: "alpha", nodes: [
          { memberName: "alpha", ref: alphaId, refScope: "SHARED" },
          { memberName: "beta", ref: betaId, refScope: "SHARED" },
        ] } })).createAgentTeamDefinition.id;
    definitions.push({ kind: "team", id: pairTeamDefinitionId });
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      const quiet = <T>(query: string, variables: Json) => graphql<T>(query, variables).catch(() => undefined);
      for (const id of orgRuns) await quiet("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id });
      for (const id of teamRuns) await quiet("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id });
      for (const id of agentRuns) await quiet("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id });
      for (const { kind, id } of [...definitions].reverse()) {
        if (kind === "org") await quiet("mutation($id: String!) { deleteAgentOrgDefinition(id: $id) }", { id });
        if (kind === "team") await quiet("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id });
        if (kind === "agent") await quiet("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id });
      }
      await app.close();
    }
    for (const port of ports) killPortOwner(port);
    if (appDataDir) await fs.rm(appDataDir, { recursive: true, force: true });
  }, 180_000);

  it("LIVE-ORG-B1: Org Terminate succeeds after a root member's AGY crashed; the Org restores and the member resumes its conversation", async () => {
    const evidence: Json = { case: "LIVE-ORG-B1", model: MODEL };
    try {
      const org = await createOrg();
      Object.assign(evidence, org);
      const code = `CODE-D-${randomUUID().slice(0, 8)}`;
      let session = await openOrgSession(org.orgRunId);
      const first = await record(evidence, "remember", () => session.ask(org.directorRunId, `Remember the code ${code}. Reply with exactly OK.`));
      expect(first.turnEnd).toBe("TURN_COMPLETED");
      evidence.crashed = await crashMember(org.directorRunId);
      evidence.stateAfterCrash = await orgState(org.orgRunId);
      session.close();

      const terminated = await record(evidence, "terminate", () => terminateOrg(org.orgRunId));
      expect(terminated.success, terminated.message).toBe(true);
      evidence.stateAfterTerminate = await orgState(org.orgRunId);
      expect((evidence.stateAfterTerminate as Json)["configIsActive"]).toBe(false);
      expect((evidence.stateAfterTerminate as Json)["inspectionIsActive"]).not.toBe(true);
      // AC-B1 (SR-004): Terminate on an already-stopped Org changes nothing and keeps its existing response.
      const again = await record(evidence, "secondTerminate", () => terminateOrg(org.orgRunId));
      expect(again).toEqual({ success: false, message: "Agent organization run not found." });
      evidence.stateAfterSecondTerminate = await orgState(org.orgRunId);
      expect(evidence.stateAfterSecondTerminate).toEqual(evidence.stateAfterTerminate);

      const restored = await record(evidence, "restore", () => restoreOrg(org.orgRunId));
      expect(restored.success, restored.message).toBe(true);
      expect(restored.agentOrgRunId).toBe(org.orgRunId);
      evidence.stateAfterRestore = await orgState(org.orgRunId);
      expect((evidence.stateAfterRestore as Json)["configIsActive"]).toBe(true);
      session = await openOrgSession(org.orgRunId);
      const recall = await record(evidence, "recall", () => session.ask(org.directorRunId,
        "Which code did I ask you to remember earlier in this conversation? Reply with the code only."));
      expect(recall.ack?.["state"], JSON.stringify(recall.ack)).toBe("accepted");
      expect(recall.turnEnd).toBe("TURN_COMPLETED");
      expect(recall.text).toContain(code);
      const resumedAgy = agyProcesses(org.directorRunId);
      evidence.resumedAgy = resumedAgy;
      expect(resumedAgy).toHaveLength(1);
      expect(resumedAgy[0]!.command).toContain("--conversation ");
      evidence.directorNode = orgMembers((await orgConfig(org.orgRunId)).executionTree).director;
      session.close();
      const finalStop = await terminateOrg(org.orgRunId);
      expect(finalStop.success, finalStop.message).toBe(true);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-org-b1.json", evidence); }
  }, 600_000);

  it("LIVE-ORG-B3 + LIVE-ORG-A2: a crashed Team member inside an active Org resumes by message; other members untouched; Org Terminate stops a member daemon", async () => {
    const evidence: Json = { case: "LIVE-ORG-B3+A2", model: MODEL };
    const port = await freePort(); ports.push(port);
    try {
      const org = await createOrg();
      Object.assign(evidence, org, { port });
      const code = `CODE-W-${randomUUID().slice(0, 8)}`;
      const session = await openOrgSession(org.orgRunId);
      expect((await session.ask(org.workerRunId, `Remember the code ${code}. Reply with exactly OK.`)).turnEnd).toBe("TURN_COMPLETED");
      expect((await session.ask(org.directorRunId, "Reply with exactly READY.")).turnEnd).toBe("TURN_COMPLETED");
      const directorAgy = agyProcesses(org.directorRunId);
      expect(directorAgy).toHaveLength(1);
      evidence.directorAgyBefore = directorAgy;
      evidence.crashed = await crashMember(org.workerRunId);
      evidence.stateAfterCrash = await orgState(org.orgRunId);

      const recall = await record(evidence, "recall", () => session.ask(org.workerRunId,
        "Which code did I ask you to remember earlier in this conversation? Reply with the code only."));
      expect(recall.ack?.["state"], JSON.stringify(recall.ack)).toBe("accepted");
      expect(recall.turnEnd).toBe("TURN_COMPLETED");
      expect(recall.text).toContain(code);
      const resumedAgy = agyProcesses(org.workerRunId);
      evidence.resumedAgy = resumedAgy;
      expect(resumedAgy).toHaveLength(1);
      expect(resumedAgy[0]!.command).toContain("--conversation ");
      expect(alive(directorAgy[0]!.pid)).toBe(true);
      expect(agyProcesses(org.directorRunId).map((p) => p.pid)).toEqual([directorAgy[0]!.pid]);
      expect((await orgConfig(org.orgRunId)).isActive).toBe(true);

      // LIVE-ORG-A2: the director backgrounds a daemon; a normal turn end keeps it (AC-A3); Org Terminate stops it (AC-A2).
      const daemon = await record(evidence, "daemonTurn", () => session.ask(org.directorRunId, startDaemonPrompt(port)));
      expect(daemon.turnEnd).toBe("TURN_COMPLETED");
      expect(await waitListening(port, 20_000)).toBe(true);
      await wait(3_000);
      expect(await listening(port)).toBe(true);
      session.close();
      const terminated = await record(evidence, "terminate", () => terminateOrg(org.orgRunId));
      expect(terminated.success, terminated.message).toBe(true);
      evidence.daemonClosedAfterOrgTerminateMs = await msUntilClosed(port, 15_000);
      expect(evidence.daemonClosedAfterOrgTerminateMs, "daemon still listening after Org Terminate").not.toBeNull();
      expect(evidence.daemonClosedAfterOrgTerminateMs as number).toBeLessThanOrEqual(5_000);
      expect(await waitGone(directorAgy[0]!.pid)).toBe(true);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-org-b3-a2.json", evidence); }
  }, 600_000);

  it("LIVE-ORG-R7: user Stop as the cause of a dead member (root agent and Team member): message resumes; Org Terminate succeeds and restore resumes", async () => {
    const evidence: Json = { case: "LIVE-ORG-R7", model: MODEL };
    try {
      const org = await createOrg();
      Object.assign(evidence, org);
      const directorCode = `CODE-SD-${randomUUID().slice(0, 8)}`;
      const workerCode = `CODE-SW-${randomUUID().slice(0, 8)}`;
      let session = await openOrgSession(org.orgRunId);
      expect((await session.ask(org.directorRunId, `Remember the code ${directorCode}. Reply with exactly OK.`)).turnEnd).toBe("TURN_COMPLETED");
      expect((await session.ask(org.workerRunId, `Remember the code ${workerCode}. Reply with exactly OK.`)).turnEnd).toBe("TURN_COMPLETED");

      // (a) Org root agent: Stop mid-turn, then message the stopped member.
      const directorStop = await record(evidence, "directorStop", () => session.stopMidTurn(org.directorRunId));
      expect(directorStop.toolStarted).toBe(true);
      expect(directorStop.stopAck?.["state"], JSON.stringify(directorStop.stopAck)).toBe("accepted");
      expect(directorStop.turnEnd).toBe("TURN_INTERRUPTED");
      expect(directorStop.agyGone).toBe(true);
      evidence.stateAfterDirectorStop = await orgState(org.orgRunId);
      const directorRecall = await record(evidence, "directorRecall", () => session.ask(org.directorRunId,
        "Which code did I ask you to remember earlier in this conversation? Reply with the code only."));
      expect(directorRecall.ack?.["state"], JSON.stringify(directorRecall.ack)).toBe("accepted");
      expect(directorRecall.turnEnd).toBe("TURN_COMPLETED");
      expect(directorRecall.text).toContain(directorCode);

      // (b) Team member inside the Org: Stop mid-turn, then Org Terminate, restore, message the member.
      const workerStop = await record(evidence, "workerStop", () => session.stopMidTurn(org.workerRunId));
      expect(workerStop.toolStarted).toBe(true);
      expect(workerStop.stopAck?.["state"], JSON.stringify(workerStop.stopAck)).toBe("accepted");
      expect(workerStop.turnEnd).toBe("TURN_INTERRUPTED");
      expect(workerStop.agyGone).toBe(true);
      evidence.stateAfterWorkerStop = await orgState(org.orgRunId);
      session.close();
      const terminated = await record(evidence, "terminate", () => terminateOrg(org.orgRunId));
      expect(terminated.success, terminated.message).toBe(true);
      evidence.stateAfterTerminate = await orgState(org.orgRunId);
      expect((evidence.stateAfterTerminate as Json)["configIsActive"]).toBe(false);
      // AC-B1 (SR-004): Terminate on an already-stopped Org changes nothing and keeps its existing response.
      const again = await record(evidence, "secondTerminate", () => terminateOrg(org.orgRunId));
      expect(again).toEqual({ success: false, message: "Agent organization run not found." });
      evidence.stateAfterSecondTerminate = await orgState(org.orgRunId);
      expect(evidence.stateAfterSecondTerminate).toEqual(evidence.stateAfterTerminate);
      const restored = await record(evidence, "restore", () => restoreOrg(org.orgRunId));
      expect(restored.success, restored.message).toBe(true);
      session = await openOrgSession(org.orgRunId);
      const workerRecall = await record(evidence, "workerRecall", () => session.ask(org.workerRunId,
        "Which code did I ask you to remember earlier in this conversation? Reply with the code only."));
      expect(workerRecall.ack?.["state"], JSON.stringify(workerRecall.ack)).toBe("accepted");
      expect(workerRecall.turnEnd).toBe("TURN_COMPLETED");
      expect(workerRecall.text).toContain(workerCode);
      expect(agyProcesses(org.workerRunId)[0]?.command ?? "").toContain("--conversation ");
      session.close();
      const finalStop = await terminateOrg(org.orgRunId);
      expect(finalStop.success, finalStop.message).toBe(true);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-org-r7.json", evidence); }
  }, 900_000);

  it("LIVE-TEAM-D4: standalone Team with a crashed member terminates (daemon of the live member stopped), restores without 'already managed', and the crashed member resumes", async () => {
    const evidence: Json = { case: "LIVE-TEAM-D4", model: MODEL };
    const port = await freePort(); ports.push(port);
    try {
      const memberConfig = (memberAddress: string) => ({ memberAddress, llmModelIdentifier: MODEL, llmConfig: {},
        autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "antigravity_cli", workspaceRootPath: workspace });
      const definition = (await graphql<{ agentTeamDefinition: { nodes: Array<{ memberName: string; ref: string }> } }>(
        "query($id: String!) { agentTeamDefinition(id: $id) { nodes { memberName ref } } }", { id: pairTeamDefinitionId })).agentTeamDefinition;
      const refOf = (name: string) => definition.nodes.find((node) => node.memberName === name)!.ref;
      const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
        "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
        { input: { teamDefinitionId: pairTeamDefinitionId,
          teamConfigs: [{ teamAddress: "/", llmModelIdentifier: MODEL, llmConfig: {}, autoExecuteTools: true,
            skillAccessMode: "NONE", runtimeKind: "antigravity_cli", workspaceRootPath: workspace }],
          memberConfigs: [{ ...memberConfig("/alpha"), agentDefinitionId: refOf("alpha") },
            { ...memberConfig("/beta"), agentDefinitionId: refOf("beta") }] } });
      expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
      const teamRunId = created.createAgentTeamRun.teamRunId!;
      teamRuns.add(teamRunId);
      const teamConfig = async () => (await graphql<{ getTeamRunResumeConfig: { isActive: boolean; executionTree: Json } }>(
        "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { isActive executionTree } }", { id: teamRunId })).getTeamRunResumeConfig;
      const runIdOf = new Map(flattenE2eConfiguredAgentExecutions((await teamConfig()).executionTree)
        .map((member) => [member.memberName, member.agentRunId]));
      const alpha = runIdOf.get("alpha")!;
      const beta = runIdOf.get("beta")!;
      Object.assign(evidence, { teamRunId, alpha, beta, port });

      const openTeam = async () => {
        const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRunId}`);
        sockets.push(socket);
        const frames: Frame[] = [];
        socket.on("message", (raw: unknown) => {
          try { const parsed = JSON.parse(String(raw)) as { type: string; payload: Json }; frames.push({ at: Date.now(), type: parsed.type, payload: parsed.payload ?? {} }); }
          catch { /* ignore */ }
        });
        await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
        await wait(500);
        const ask = async (runId: string, content: string) => {
          const start = frames.length;
          sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
          const deadline = Date.now() + 180_000;
          const end = () => frames.slice(start).find((f) => (f.type === "TURN_COMPLETED" || f.type === "TURN_INTERRUPTED") && f.payload["agent_run_id"] === runId)
            ?? frames.slice(start).find((f) => f.type === "ERROR");
          while (Date.now() < deadline && !end()) await wait(250);
          const text = frames.slice(start).filter((f) => f.type === "SEGMENT_CONTENT" && f.payload["agent_run_id"] === runId)
            .map((f) => String(f.payload["delta"] ?? "")).join("");
          return { end: end()?.type ?? null, endPayload: end()?.payload ?? null, text };
        };
        return { ask, close: () => socket.close() };
      };

      const code = `CODE-A-${randomUUID().slice(0, 8)}`;
      let team = await openTeam();
      expect((await team.ask(alpha, `Remember the code ${code}. Reply with exactly OK.`)).end).toBe("TURN_COMPLETED");
      expect((await team.ask(beta, startDaemonPrompt(port))).end).toBe("TURN_COMPLETED");
      expect(await waitListening(port, 20_000)).toBe(true);
      const betaAgy = agyProcesses(beta);
      evidence.betaAgy = betaAgy;
      evidence.crashed = await crashMember(alpha);
      evidence.teamActiveAfterCrash = (await teamConfig()).isActive;
      team.close();

      const terminated = await record(evidence, "terminate", async () => (await graphql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId })).terminateAgentTeamRun);
      expect(terminated.success, terminated.message).toBe(true);
      evidence.daemonClosedAfterTeamTerminateMs = await msUntilClosed(port, 15_000);
      expect(evidence.daemonClosedAfterTeamTerminateMs, "daemon still listening after Team Terminate").not.toBeNull();
      expect(evidence.daemonClosedAfterTeamTerminateMs as number).toBeLessThanOrEqual(5_000);
      expect(betaAgy.length === 1 && await waitGone(betaAgy[0]!.pid)).toBe(true);
      evidence.teamActiveAfterTerminate = (await teamConfig()).isActive;
      expect(evidence.teamActiveAfterTerminate).toBe(false);
      const again = await graphql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId });
      evidence.secondTerminate = again.terminateAgentTeamRun;
      // AC-B1 (SR-004, DEC-004): Terminate on an already-stopped Team changes nothing and keeps its existing response.
      expect(again.terminateAgentTeamRun).toEqual({ success: false, message: "Agent team run not found." });
      evidence.teamActiveAfterSecondTerminate = (await teamConfig()).isActive;
      expect(evidence.teamActiveAfterSecondTerminate).toBe(false);

      const restoreTeam = async () => (await graphql<{ restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
        "mutation($id: String!) { restoreAgentTeamRun(teamRunId: $id) { success message teamRunId } }", { id: teamRunId })).restoreAgentTeamRun;
      const restored = await record(evidence, "restore", restoreTeam);
      expect(restored.success, restored.message).toBe(true);
      team = await openTeam();
      const recall = await record(evidence, "recall", () => team.ask(alpha,
        "Which code did I ask you to remember earlier in this conversation? Reply with the code only."));
      expect(recall.end, JSON.stringify(recall.endPayload)).toBe("TURN_COMPLETED");
      expect(recall.text).toContain(code);
      expect(agyProcesses(alpha)[0]?.command ?? "").toContain("--conversation ");
      team.close();

      // A restore issued while a Terminate is still in flight (root registered but no longer active) never
      // answers "already managed": the manager completes the stop first, then restores.
      const race = await record(evidence, "terminateRestoreRace", async () => {
        const terminating = graphql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
          "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId });
        await wait(20);
        const restoring = restoreTeam();
        const [t, r] = await Promise.all([terminating, restoring]);
        return { terminate: t.terminateAgentTeamRun, restore: r, activeAfter: (await teamConfig()).isActive };
      });
      expect(race.terminate.success, race.terminate.message).toBe(true);
      expect(race.restore.message ?? "").not.toMatch(/already managed/i);
      expect(race.restore.success, race.restore.message).toBe(true);
      expect(race.activeAfter).toBe(true);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-team-d4.json", evidence); }
  }, 900_000);

  it("LIVE-SHUTDOWN-A2: graceful server shutdown stops daemons of an idle standalone AGY run and of an Org member", async () => {
    const evidence: Json = { case: "LIVE-SHUTDOWN-A2", model: MODEL };
    const runPort = await freePort(); ports.push(runPort);
    const orgPort = await freePort(); ports.push(orgPort);
    try {
      const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId: directorDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
          llmConfig: {}, autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "antigravity_cli" } });
      expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
      const runId = created.createAgentRun.runId!;
      agentRuns.add(runId);
      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      sockets.push(socket);
      const frames: Frame[] = [];
      socket.on("message", (raw: unknown) => {
        try { const parsed = JSON.parse(String(raw)) as { type: string; payload: Json }; frames.push({ at: Date.now(), type: parsed.type, payload: parsed.payload ?? {} }); }
        catch { /* ignore */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: startDaemonPrompt(runPort) });
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline && !frames.some((f) => f.type === "TURN_COMPLETED")) await wait(250);
      expect(frames.some((f) => f.type === "TURN_COMPLETED")).toBe(true);
      expect(await waitListening(runPort, 20_000)).toBe(true);

      const org = await createOrg();
      const session = await openOrgSession(org.orgRunId);
      expect((await session.ask(org.directorRunId, startDaemonPrompt(orgPort))).turnEnd).toBe("TURN_COMPLETED");
      expect(await waitListening(orgPort, 20_000)).toBe(true);
      session.close();
      socket.close();
      const agyBefore = [...agyProcesses(runId), ...agyProcesses(org.directorRunId)];
      evidence.agyBefore = agyBefore;
      expect(agyBefore).toHaveLength(2);

      // Graceful shutdown: the same fastify onClose → supervisor close → stopAll* path as SIGTERM/SIGINT in server-runtime.
      const started = Date.now();
      await app!.close();
      app = null;
      evidence.appCloseMs = Date.now() - started;
      evidence.runDaemonClosedAfterShutdownMs = await msUntilClosed(runPort, 15_000);
      evidence.orgDaemonClosedAfterShutdownMs = await msUntilClosed(orgPort, 15_000);
      evidence.agyGoneAfterShutdown = await Promise.all(agyBefore.map((p) => waitGone(p.pid)));
      expect(evidence.runDaemonClosedAfterShutdownMs, "standalone run daemon still listening after shutdown").not.toBeNull();
      expect(evidence.orgDaemonClosedAfterShutdownMs, "Org member daemon still listening after shutdown").not.toBeNull();
      expect(evidence.runDaemonClosedAfterShutdownMs as number).toBeLessThanOrEqual(5_000);
      expect(evidence.orgDaemonClosedAfterShutdownMs as number).toBeLessThanOrEqual(5_000);
      expect(evidence.agyGoneAfterShutdown).toEqual([true, true]);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally { await writeEvidence("live-shutdown-a2.json", evidence); }
  }, 600_000);
});
