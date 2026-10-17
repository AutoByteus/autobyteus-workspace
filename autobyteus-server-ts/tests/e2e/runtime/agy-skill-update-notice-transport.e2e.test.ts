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
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";

// Skill update notices on a runtime without active-turn append (AC-001 next-turn class, AC-002), through the real
// server and WebSocket with the scripted AGY transport (tests/fixtures/agy-failure-cli.mjs, case interrupt_resend:
// HOLD keeps a turn running; any other input is answered `REPLY:<content>`, so the reply shows exactly what AGY got).
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const SENDER = "system.skill_update_notifier";
const HEADER = "[Platform notice — skill updated]";

suite("AGY skill update notice through the app WebSocket", () => {
  let dataDir = "";
  let workspace = "";
  let skillMdPath = "";
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
  const skillMd = (codeword: string) =>
    `---\nname: notice-probe\ndescription: Holds the probe codeword.\n---\n\nThe current codeword is ${codeword}.\n`;

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-skill-notice-e2e-")));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.mkdir(path.join(dataDir, "skills", "notice-probe"), { recursive: true });
    skillMdPath = path.join(dataDir, "skills", "notice-probe", "SKILL.md");
    await fs.writeFile(skillMdPath, skillMd("APPLE-1111"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    process.env["AGY_FAKE_CASE"] = "interrupt_resend";
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-skill-notice-" + randomUUID(), role: "assistant", description: "skill notice probe",
        instructions: "Answer briefly.", category: "runtime-e2e", toolNames: [], skillNames: ["notice-probe"] } });
    definitionId = created.createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) {
        await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
          { agentRunId: runId }).catch(() => undefined);
      }
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  }, 60_000);

  /** Creates an AGY run with the probe skill and opens its agent socket. */
  const openRun = async () => {
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    const runId = started.createAgentRun.runId!;
    runIds.push(runId);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* ignore */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const until = async (predicate: () => boolean, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !predicate()) await wait(25);
      expect(predicate(), JSON.stringify(messages.slice(-30))).toBe(true);
    };
    const send = (content: string) => {
      socket.send(JSON.stringify({ type: "SEND_MESSAGE",
        payload: { ...buildE2eClientCommandIds(), context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    };
    const notices = () => messages.filter((m) => m.type === "SYSTEM_TASK_NOTIFICATION" && m.payload["sender_id"] === SENDER);
    const count = (type: string) => messages.filter((m) => m.type === type).length;
    const replyText = (from = 0) => messages.slice(from).filter((m) => m.type === "SEGMENT_CONTENT")
      .map((m) => String(m.payload["delta"] ?? "")).join("");
    const conversation = async () => (await graphql<{ getRunProjection: { conversation: Array<Record<string, unknown>> } }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId })).getRunProjection.conversation;
    await until(() => messages.some((m) => m.type === "CONNECTED"));
    return { runId, socket, messages, until, send, notices, count, replyText, conversation };
  };

  it("a busy run gets the notice as its next turn; a stopped turn keeps it pending; an idle run gets it with its next message", async () => {
    await fs.writeFile(skillMdPath, skillMd("APPLE-1111"));
    const { socket, messages, until, send, notices, count, replyText, conversation } = await openRun();

    // Busy: a turn runs (HOLD_MS); the skill changes; AGY cannot append, so the notice is its next turn.
    send("HOLD_MS:8000 the long task");
    await until(() => messages.some((m) => m.type === "TOOL_EXECUTION_STARTED"));
    await fs.writeFile(skillMdPath, skillMd("PLUM-7731"));
    await wait(3_000);
    expect(notices()).toHaveLength(0); // queued behind the running turn
    const beforeEnd = messages.length;
    await until(() => notices().length === 1 && count("TURN_COMPLETED") >= 2, 30_000);
    const noticeTurnId = notices()[0]!.payload["turn_id"];
    expect(messages.slice(beforeEnd).filter((m) => m.type === "TURN_STARTED").map((m) => m.payload["turn_id"]))
      .toEqual([noticeTurnId]); // the notice's own turn, right after the busy turn
    expect(replyText(beforeEnd)).toContain(`REPLY:${HEADER}`);
    expect(replyText(beforeEnd)).toContain(`- notice-probe (${skillMdPath}): SKILL.md`);
    await wait(1_000);

    // Stopped mid-turn (AGY's interrupt stops its process): a notice queued behind that turn is not lost;
    // it returns to pending and goes out with the next message (REQ-013).
    send("HOLD the long task");
    await until(() => messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED").length >= 2);
    await fs.writeFile(skillMdPath, skillMd("KIWI-5555"));
    await wait(3_000);
    socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `interrupt-${randomUUID()}` } }));
    await until(() => messages.some((m) => m.type === "TURN_INTERRUPTED"));
    await wait(1_000);
    expect(notices()).toHaveLength(1);
    const beforeResume = messages.length;
    send("resume");
    await until(() => notices().length === 2, 30_000);
    await until(() => replyText(beforeResume).includes("resume"), 30_000);
    expect(replyText(beforeResume).startsWith(`REPLY:${HEADER}`)).toBe(true);
    expect(replyText(beforeResume)).toContain("\n\nresume");
    await wait(1_000);

    // Idle: the change is only marked; the next message carries it in one dispatch (one turn).
    await fs.writeFile(skillMdPath, skillMd("MANGO-4242"));
    await wait(3_000);
    expect(notices()).toHaveLength(2);
    const turnsBefore = count("TURN_STARTED");
    const beforeIdle = messages.length;
    send("hello");
    await until(() => notices().length === 3 && replyText(beforeIdle).includes("hello"), 30_000);
    await wait(500);
    expect(count("TURN_STARTED")).toBe(turnsBefore + 1);
    const reply = replyText(beforeIdle);
    expect(reply.startsWith(`REPLY:${HEADER}`)).toBe(true);
    expect(reply.endsWith("\n\nhello")).toBe(true);
    const idleTurnId = messages.slice(beforeIdle).find((m) => m.type === "TURN_STARTED")?.payload["turn_id"];
    expect(notices()[2]!.payload["turn_id"]).toBe(idleTurnId);

    // History: every notice is a system notice; the user's messages are recorded as typed.
    const history = await conversation();
    expect(history.filter((e) => e["kind"] === "system_task_notification" && e["senderId"] === SENDER)).toHaveLength(3);
    expect(history.filter((e) => e["role"] === "user").map((e) => e["content"]))
      .toEqual(["HOLD_MS:8000 the long task", "HOLD the long task", "resume", "hello"]);
  }, 120_000);

  it("AC-003: a stopped run is not woken by a change; continued later, its first turn carries one notice", async () => {
    await fs.writeFile(skillMdPath, skillMd("APPLE-1111"));
    const { runId, messages, until, send, notices, count, replyText, conversation } = await openRun();
    send("first");
    await until(() => replyText().includes("REPLY:first") && count("TURN_COMPLETED") >= 1, 30_000);
    await wait(1_000);

    // Stop the run (it leaves memory; only its memory folder keeps what it saw), then change the skill.
    expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
      "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }))
      .terminateAgentRun.success).toBe(true);
    await wait(1_000);
    await fs.writeFile(skillMdPath, skillMd("PEAR-2468"));
    await wait(3_000);
    const startsWhileStopped = count("TURN_STARTED");
    expect(startsWhileStopped).toBe(1); // not woken
    expect(notices()).toHaveLength(0);

    // Continue: the run is restored with the message; one turn carries the notice, then the message.
    const beforeContinue = messages.length;
    send("continue");
    await until(() => notices().length === 1 && replyText(beforeContinue).includes("continue"), 60_000);
    await wait(500);
    expect(count("TURN_STARTED")).toBe(startsWhileStopped + 1);
    expect(replyText(beforeContinue).startsWith(`REPLY:${HEADER}`)).toBe(true);
    expect(replyText(beforeContinue)).toContain(`- notice-probe (${skillMdPath}): SKILL.md`);
    expect(replyText(beforeContinue).endsWith("\n\ncontinue")).toBe(true);
    const history = await conversation();
    expect(history.filter((e) => e["kind"] === "system_task_notification" && e["senderId"] === SENDER)).toHaveLength(1);
    expect(history.filter((e) => e["role"] === "user").map((e) => e["content"])).toEqual(["first", "continue"]);
  }, 120_000);
});
