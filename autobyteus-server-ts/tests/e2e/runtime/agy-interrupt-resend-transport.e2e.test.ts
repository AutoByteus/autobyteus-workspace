import "reflect-metadata";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// A standalone Antigravity run interrupted mid-turn, then sent a new message, through the real server and
// WebSocket (fake AGY transport: tests/fixtures/agy-failure-cli.mjs, case interrupt_resend). AGY's interrupt
// stops its process, so the next send must release that process and restore the same conversation.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type ProcessEvent = { event: "launch" | "sigterm" | "exit"; pid: number; conversation_id: string; at: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** The interrupted AGY process keeps running this long after SIGTERM (below the server's 1.5 s SIGKILL escalation). */
const SIGTERM_EXIT_DELAY_MS = 1_000;
const isAlive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

suite("AGY interrupt followed by a new message through the app WebSocket", () => {
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
  const terminate = async (runId: string) => (await graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
    { agentRunId: runId })).terminateAgentRun.success;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-interrupt-resend-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    process.env["AGY_FAKE_CASE"] = "interrupt_resend";
    process.env["AGY_FAKE_SIGTERM_EXIT_DELAY_MS"] = String(SIGTERM_EXIT_DELAY_MS);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-interrupt-resend-" + randomUUID(), role: "assistant", description: "interrupt resend probe",
        instructions: "Answer briefly.", category: "runtime-e2e", toolNames: [] } });
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
    delete process.env["AGY_FAKE_SIGTERM_EXIT_DELAY_MS"];
    delete process.env["AGY_FAKE_PROCESS_LOG"];
  });

  const openRun = async () => {
    const processLog = path.join(dataDir, `agy-processes-${randomUUID()}.jsonl`);
    process.env["AGY_FAKE_PROCESS_LOG"] = processLog;
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
        autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
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
      while (Date.now() < deadline && !predicate()) await wait(25);
      expect(predicate(), JSON.stringify(messages)).toBe(true);
    };
    const processes = (): ProcessEvent[] => {
      try {
        return readFileSync(processLog, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as ProcessEvent);
      } catch { return []; }
    };
    const send = (content: string) => {
      const ids = buildE2eClientCommandIds();
      socket.send(JSON.stringify({ type: "SEND_MESSAGE",
        payload: { ...ids, context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
      return ids.message_id;
    };
    const ack = (commandId: string) => messages.find((m) => m.type === "AGENT_COMMAND_ACK"
      && (m.payload["command_id"] === commandId || m.payload["message_id"] === commandId));
    const replyText = (from = 0) => messages.slice(from).filter((m) => m.type === "SEGMENT_CONTENT")
      .map((m) => String(m.payload["delta"] ?? "")).join("");
    /** Starts a turn that keeps running, then presses Stop and waits until the interrupt takes effect. */
    const interruptRunningTurn = async () => {
      send("HOLD the long task");
      await until(() => messages.some((m) => m.type === "TOOL_EXECUTION_STARTED"));
      const interruptId = `interrupt-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: interruptId } }));
      await until(() => messages.some((m) => m.type === "TURN_INTERRUPTED"));
      return interruptId;
    };
    return { runId, messages, until, processes, send, ack, replyText, interruptRunningTurn };
  };

  const expectSameConversationAndOneLiveProcess = (run: Awaited<ReturnType<typeof openRun>>) => {
    const events = run.processes();
    const launches = events.filter((e) => e.event === "launch");
    expect(launches, JSON.stringify(events)).toHaveLength(2);
    const [previous, replacement] = launches as [ProcessEvent, ProcessEvent];
    expect(replacement.conversation_id).toBe(previous.conversation_id);
    // The replacement started only after the interrupted process had exited (REQ-003).
    const previousExit = events.findIndex((e) => e.event === "exit" && e.pid === previous.pid);
    expect(previousExit, JSON.stringify(events)).toBeGreaterThanOrEqual(0);
    expect(previousExit).toBeLessThan(events.indexOf(replacement));
    expect(isAlive(previous.pid)).toBe(false);
    expect(isAlive(replacement.pid)).toBe(true);
  };

  const expectNoStuckError = (run: Awaited<ReturnType<typeof openRun>>) => {
    const text = JSON.stringify(run.messages);
    expect(text).not.toContain("retired cleanup");
    expect(text).not.toContain("AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING");
    expect(run.messages.some((m) => m.type === "AGENT_COMMAND_ACK" && m.payload["accepted"] === false)).toBe(false);
    const statuses = run.messages.filter((m) => m.type === "AGENT_STATUS");
    expect(String(statuses.at(-1)?.payload["status"] ?? "").toLowerCase(), JSON.stringify(statuses)).not.toBe("error");
  };

  it("answers messages sent while the interrupted process is still stopping, with one restart (AC-001, AC-005)", async () => {
    const run = await openRun();
    const interruptId = await run.interruptRunningTurn();
    // Send in the window after the interrupt took effect and before the old AGY process has exited.
    const first = run.send("first after interrupt");
    const second = run.send("second after interrupt");
    expect(run.processes().some((e) => e.event === "exit"), JSON.stringify(run.processes())).toBe(false);
    expect(run.ack(interruptId)).toBeUndefined();

    await run.until(() => run.replyText().includes("REPLY:first after interrupt"));
    await run.until(() => Boolean(run.ack(first)) && Boolean(run.ack(second)));
    expect(run.ack(first)!.payload).toMatchObject({ accepted: true });
    expect(run.ack(second)!.payload).toMatchObject({ accepted: true });
    await run.until(() => run.replyText().includes("REPLY:second after interrupt"));
    await wait(200);

    expect(run.ack(interruptId)?.payload).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    expectSameConversationAndOneLiveProcess(run);
    expectNoStuckError(run);
  }, 60_000);

  it("restarts a Team member interrupted on AGY when it immediately receives new work (AC-006)", async () => {
    // A Team member is a configured agent execution (not the standalone lifecycle): its readiness releases the
    // exact previous run before re-activating. This drives it through the real Team WebSocket.
    const processLog = path.join(dataDir, `agy-team-processes-${randomUUID()}.jsonl`);
    process.env["AGY_FAKE_PROCESS_LOG"] = processLog;
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: "agy-interrupt-resend-team-" + randomUUID(), description: "interrupt resend team probe",
        instructions: "Answer briefly.", coordinatorMemberName: "alpha",
        nodes: [{ memberName: "alpha", ref: definitionId, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    let teamRunId = "";
    try {
      const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
        "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
        { input: { teamDefinitionId,
          teamConfigs: [{ teamAddress: "/", llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: {},
            autoExecuteTools: true, runtimeKind: "antigravity_cli", workspaceRootPath: workspace }],
          memberConfigs: [{ memberAddress: "/alpha", agentDefinitionId: definitionId,
            llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: {}, autoExecuteTools: true,
            runtimeKind: "antigravity_cli", workspaceRootPath: workspace }] } });
      expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
      teamRunId = created.createAgentTeamRun.teamRunId!;
      const tree = (await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
        "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: teamRunId }))
        .getTeamRunResumeConfig.executionTree;
      const alpha = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberName === "alpha")!.agentRunId;

      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRunId}`);
      sockets.push(socket);
      const frames: Wire[] = [];
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") frames.push({ type: parsed.type,
            payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* Ignore only malformed diagnostic transport rows. */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
      const until = async (predicate: () => boolean, ms = 20_000) => {
        const deadline = Date.now() + ms;
        while (Date.now() < deadline && !predicate()) await wait(25);
        expect(predicate(), JSON.stringify(frames)).toBe(true);
      };
      const ofAlpha = (type: string) => frames.filter((f) => f.type === type && f.payload["agent_run_id"] === alpha);
      const send = (content: string) => {
        const ids = buildE2eClientCommandIds();
        socket.send(JSON.stringify({ type: "SEND_MESSAGE",
          payload: { ...ids, context_file_paths: [], image_urls: [], agent_run_id: alpha, content } }));
        return ids.message_id;
      };
      const replyText = () => ofAlpha("SEGMENT_CONTENT").map((f) => String(f.payload["delta"] ?? "")).join("");
      const processes = (): ProcessEvent[] => {
        try {
          return readFileSync(processLog, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as ProcessEvent);
        } catch { return []; }
      };

      send("HOLD the long task");
      await until(() => ofAlpha("TOOL_EXECUTION_STARTED").length > 0);
      const interruptId = `interrupt-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: interruptId, agent_run_id: alpha } }));
      await until(() => ofAlpha("TURN_INTERRUPTED").length > 0);
      // New work arrives while the interrupted member process is still stopping.
      send("work after interrupt");
      expect(processes().some((e) => e.event === "exit"), JSON.stringify(processes())).toBe(false);
      await until(() => replyText().includes("REPLY:work after interrupt"));
      await wait(200);

      const text = JSON.stringify(frames);
      expect(text).not.toContain("retired cleanup");
      expect(text).not.toContain("AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING");
      expect(frames.some((f) => f.type === "AGENT_COMMAND_ACK" && (f.payload["state"] === "rejected"
        || f.payload["state"] === "failed" || f.payload["accepted"] === false)), text).toBe(false);
      const events = processes();
      const launches = events.filter((e) => e.event === "launch");
      expect(launches, JSON.stringify(events)).toHaveLength(2);
      const [previous, replacement] = launches as [ProcessEvent, ProcessEvent];
      expect(replacement.conversation_id).toBe(previous.conversation_id);
      const previousExit = events.findIndex((e) => e.event === "exit" && e.pid === previous.pid);
      expect(previousExit, JSON.stringify(events)).toBeGreaterThanOrEqual(0);
      expect(previousExit).toBeLessThan(events.indexOf(replacement));
      expect(isAlive(previous.pid)).toBe(false);
      expect(isAlive(replacement.pid)).toBe(true);
    } finally {
      if (teamRunId) await graphql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }",
        { id: teamRunId }).catch(() => undefined);
      await graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }",
        { id: teamDefinitionId }).catch(() => undefined);
    }
  }, 60_000);

  it("answers a message sent after the interrupted process has fully stopped (AC-002)", async () => {
    const run = await openRun();
    const interruptId = await run.interruptRunningTurn();
    await run.until(() => Boolean(run.ack(interruptId)));
    await run.until(() => run.processes().some((e) => e.event === "exit"));
    await wait(500);

    const later = run.send("later after interrupt");
    await run.until(() => run.replyText().includes("REPLY:later after interrupt"));
    expect(run.ack(later)?.payload).toMatchObject({ accepted: true });
    await wait(200);

    expectSameConversationAndOneLiveProcess(run);
    expectNoStuckError(run);
  }, 60_000);
});
