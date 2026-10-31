import "reflect-metadata";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Agent runtime switch on a real server and real agent runtimes (autobyteus-316, AC-001, AC-002, AC-008, AC-009;
// invariants I-1, I-3, I-5, I-7, I-8). One run, one chat, on an isolated server (its own data root, a throwaway workspace):
//   1. Claude Agent SDK does a small multi-step task and is stopped by hand (a usage limit cannot be produced on demand;
//      the switch path is the same because no stop reason is recorded);
//   2. the run's settings are saved with Codex App Server (a pending switch, nothing archived yet), one message is sent:
//      the marker, the archive, the hand-over notice before the user's text, journals opened by the new agent;
//   3. stopped again, switched to a scripted Antigravity CLI (tests/fixtures/agy-failure-cli.mjs), one message more.
// After each switch the archived segment must hold exactly the previous agent runtime's records (I-7): the records that
// were in the active file before the save, none written after the marker.
// Gates (each real run spends the user's credits and adds conversations to the user's CLI histories, TESTING.md):
//   RUN_RUNTIME_SWITCH_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 (signed-in CLIs need the real HOME, USER and LOGNAME);
//   the scripted Antigravity step runs when ANTIGRAVITY_CLI_COMMAND is the absolute path of tests/fixtures/agy-failure-cli.mjs
//   (with AGY_FAKE_CASE=auto_compaction, whose first turn is a plain reply; the CLI's default case is a terminal error).
// RUNTIME_SWITCH_E2E_EVIDENCE_DIR (optional): copies the run's manifests, markers and journals there (synthetic task only).
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const ENABLED = process.env.RUN_RUNTIME_SWITCH_E2E === "1" && process.env.RUN_CLAUDE_E2E === "1" && process.env.RUN_CODEX_E2E === "1"
  && commandReady("claude") && commandReady("codex");
const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const SCRIPTED_AGY = ENABLED && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY) && commandReady(FAKE_AGY);
const STEP_TIMEOUT_MS = Number(process.env.RUNTIME_SWITCH_E2E_STEP_TIMEOUT_MS || 300_000);
const EVIDENCE_DIR = process.env.RUNTIME_SWITCH_E2E_EVIDENCE_DIR?.trim() || "";
const TASK = [
  "Use your tools for each step below, one tool call per step, in this order:",
  "1) run the shell command `ls`;",
  "2) read the file notes.txt;",
  "3) create a new file out.txt whose content is exactly the word alpha;",
  "4) edit out.txt to replace alpha with beta.",
  "Then reply with exactly: DONE",
].join("\n");
const FOLLOW_UP = [
  "You are continuing this run. Using the work journal you were told about, open it with a shell command and",
  "find the name of the file the previous agent edited at the end. Reply with that file name, then the word DONE.",
].join(" ");

type Wire = { type: string; payload: Record<string, unknown> };
type RawRecord = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const readRaw = (file: string): RawRecord[] => {
  try {
    return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as RawRecord);
  } catch {
    return [];
  }
};
const findRunMemoryDir = async (root: string, runId: string): Promise<string | null> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  if (path.basename(root) === runId && entries.some((entry) => entry.name === "raw_traces_active.jsonl")) return root;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findRunMemoryDir(path.join(root, entry.name), runId);
    if (found) return found;
  }
  return null;
};

describe.runIf(ENABLED)("agent runtime switch on real agent runtimes", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
  const definitionIds: string[] = [];
  const previousAgyCommand = process.env.ANTIGRAVITY_CLI_COMMAND;

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const pickModel = async (runtimeKind: string, preferred: string[]): Promise<string> => {
    const snapshots = (await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind })).providerModelCatalogSnapshots;
    const available = snapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
    const chosen = preferred.map((fragment) => available.find((id) => id.includes(fragment))).find(Boolean) ?? available[0];
    expect(chosen, `${runtimeKind} models: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-switch-live-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }).catch(() => undefined);
      for (const id of definitionIds) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
      await app.close();
    }
    await closeLiveServerVault();
    if (previousAgyCommand === undefined) delete process.env.ANTIGRAVITY_CLI_COMMAND; else process.env.ANTIGRAVITY_CLI_COMMAND = previousAgyCommand;
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it("Claude Agent SDK, then Codex App Server, then a scripted Antigravity CLI: one run, one chat", async () => {
    const workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(path.join(workspace, "notes.txt"), "first line\nsecond line\nthird line\n");
    const definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `runtime-switch-${randomUUID()}`, role: "assistant", description: "Agent runtime switch live check",
        instructions: "Do exactly what the user asks with your tools. Keep replies short.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
    definitionIds.push(definitionId);
    const claudeModel = await pickModel("claude_agent_sdk", ["haiku"]);
    const codexModel = await pickModel("codex_app_server", [process.env.CODEX_E2E_MODEL?.trim() || "gpt-5.6-luna", "mini"]);
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: claudeModel, llmConfig: null,
        autoExecuteTools: true, runtimeKind: "claude_agent_sdk" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.push(runId);

    const messages: Wire[] = [];
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = STEP_TIMEOUT_MS) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(200);
      expect(await predicate(), `${label}: ${JSON.stringify(messages.map((m) => m.type).slice(-25))}`).toBe(true);
    };
    const connect = async (): Promise<WebSocket> => {
      const connectedBefore = messages.filter((m) => m.type === "CONNECTED").length;
      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      sockets.push(socket);
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
            && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* Ignore malformed diagnostic rows only. */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      // A message sent before the server's CONNECTED is refused (SESSION_NOT_READY); a stopped run is restored first.
      await until(() => messages.filter((m) => m.type === "CONNECTED").length > connectedBefore, "websocket CONNECTED", 120_000);
      return socket;
    };
    const turnsEnded = () => messages.filter((m) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED").length;
    let memoryDir = "";
    const send = async (content: string, label: string) => {
      const socket = await connect();
      const before = turnsEnded();
      const errorsBefore = messages.filter((m) => m.type === "ERROR").length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      if (!memoryDir) await until(async () => (memoryDir = (await findRunMemoryDir(path.join(dataDir, "memory"), runId)) ?? "") !== "", "memory folder", 60_000);
      await until(() => turnsEnded() > before || messages.filter((m) => m.type === "ERROR").length > errorsBefore, `${label} turn end`);
      expect(messages.filter((m) => m.type === "ERROR").slice(errorsBefore).map((m) => m.payload), `${label} runtime errors`).toEqual([]);
      socket.close();
    };
    const metadataFile = () => path.join(memoryDir, "run_metadata.json");
    const metadata = async () => JSON.parse(await fs.readFile(metadataFile(), "utf8")) as RawRecord;
    const manifest = async () => JSON.parse(await fs.readFile(path.join(memoryDir, "raw_traces_manifest.json"), "utf8")) as { segments: RawRecord[] };
    const activeIds = () => readRaw(path.join(memoryDir, "raw_traces_active.jsonl")).map((record) => record.id as string);
    const stopAndSwitch = async (runtimeKind: string, llmModelIdentifier: string) => {
      expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
        "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId })).terminateAgentRun.success).toBe(true);
      const saved = (await graphql<{ updateStoppedAgentRunSelection: RawRecord }>(
        `mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) { success outcome message fieldErrors { path message } canonicalSelection { runtimeKind llmModelIdentifier } } }`,
        { input: { agentRunId: runId, runtimeKind, llmModelIdentifier, llmConfig: null } })).updateStoppedAgentRunSelection;
      expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED", canonicalSelection: { runtimeKind, llmModelIdentifier } });
      // The save only records a pending switch: nothing is archived, no marker yet (DEC-9).
      const pending = await metadata();
      expect(pending).toMatchObject({ runtimeKind, platformAgentRunId: null, pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: expect.any(String) }) } });
      return pending;
    };

    // --- 1. Claude Agent SDK does the work.
    await send(TASK, "claude task");
    expect((await fs.readFile(path.join(workspace, "out.txt"), "utf8").catch(() => "")).trim(), "out.txt").toBe("beta");
    const initial = await metadata();
    expect(initial).toMatchObject({ runtimeKind: "claude_agent_sdk" });
    expect(Object.hasOwn(initial, "pendingRuntimeSwitch")).toBe(false);
    const claudeRecordIds = activeIds();
    expect(claudeRecordIds.length).toBeGreaterThan(4);

    // --- 2. Switch to Codex App Server, one message.
    const pendingToCodex = await stopAndSwitch("codex_app_server", codexModel);
    expect(activeIds(), "the save changed no raw trace").toEqual(claudeRecordIds);
    const firstKey = `runtime_switch:${runId}:${pendingToCodex.pendingRuntimeSwitch.requestedAt}`;
    const noticesBefore = messages.filter((m) => m.type === "SYSTEM_TASK_NOTIFICATION").length;
    await send(FOLLOW_UP, "codex follow-up");

    const afterCodex = await metadata();
    expect(afterCodex).toMatchObject({ runId, runtimeKind: "codex_app_server", llmModelIdentifier: codexModel, startedAt: initial.startedAt, workspaceRootPath: initial.workspaceRootPath });
    expect(Object.hasOwn(afterCodex, "pendingRuntimeSwitch"), "the activation commit removed the pending switch").toBe(false);
    expect(afterCodex.platformAgentRunId).toEqual(expect.any(String));
    const segmentOne = readRaw(path.join(memoryDir, "raw_traces_000001.jsonl"));
    // I-7 (Claude -> Codex): the archived segment holds exactly the records the Claude agent wrote, none of Codex's.
    expect(segmentOne.map((record) => record.id), "I-7: segment 1 = the Claude agent's records").toEqual(claudeRecordIds);
    const active = readRaw(path.join(memoryDir, "raw_traces_active.jsonl"));
    expect(active[0], "I-3: the marker starts the new file").toMatchObject({
      trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: firstKey,
      content: expect.stringMatching(/^Agent runtime changed from Claude Agent SDK \(.+\) to Codex App Server \(.+\)\.$/) });
    expect(active.filter((record) => record.correlation_id === firstKey), "I-5: one marker").toHaveLength(1);
    const firstManifest = await manifest();
    expect(firstManifest.segments).toEqual([expect.objectContaining({ file_name: "raw_traces_000001.jsonl", boundary_type: "runtime_switch",
      boundary_key: firstKey, boundary_trace_id: active[0]!.id, runtime_kind: "claude_agent_sdk", status: "complete" })]);
    // The hand-over notice reached the chat before the answer; the new agent opened the journals it was told about (AC-008).
    expect(messages.filter((m) => m.type === "SYSTEM_TASK_NOTIFICATION").length).toBeGreaterThan(noticesBefore);
    const handover = messages.filter((m) => m.type === "SYSTEM_TASK_NOTIFICATION" && m.payload.sender_id === "system.runtime_handover");
    expect(handover.at(-1)?.payload.content).toMatch(/^Agent runtime changed from Claude Agent SDK/);
    const codexToolCalls = active.filter((record) => record.trace_type === "tool_call");
    expect(codexToolCalls.some((record) => JSON.stringify(record.tool_args ?? {}).includes("work_journal")),
      `the new agent opened a journal file: ${JSON.stringify(codexToolCalls.map((record) => record.tool_args))}`).toBe(true);
    // Each journal file reads with the agent runtime that wrote it (AC-006).
    const journalManifest = JSON.parse(await fs.readFile(path.join(memoryDir, "work_journal", "work_journal_manifest.json"), "utf8")) as { files: Array<{ journal_file: string; runtime_kind: string | null }> };
    expect(journalManifest.files.map((file) => [file.journal_file, file.runtime_kind])).toEqual([
      ["work_journal_000001.md", "claude_agent_sdk"], ["work_journal_active.md", "codex_app_server"]]);
    const closedJournal = await fs.readFile(path.join(memoryDir, "work_journal", "work_journal_000001.md"), "utf8");
    expect(closedJournal).toContain("Runtime Claude Agent SDK");
    expect(closedJournal).not.toMatch(/^\[\d\d:\d\d:\d\d\] Tool: (Bash|Read|Write|Edit) /m);
    expect(await fs.readFile(path.join(memoryDir, "work_journal", "work_journal_active.md"), "utf8")).toContain("Notice: Agent runtime changed from Claude Agent SDK");

    // --- 3. Switch to the scripted Antigravity CLI, one message.
    if (SCRIPTED_AGY) {
      process.env.ANTIGRAVITY_CLI_COMMAND = FAKE_AGY;
      const agyModel = await pickModel("antigravity_cli", ["flash"]);
      const codexRecordIds = activeIds();
      const pendingToAgy = await stopAndSwitch("antigravity_cli", agyModel);
      expect(activeIds()).toEqual(codexRecordIds);
      const secondKey = `runtime_switch:${runId}:${pendingToAgy.pendingRuntimeSwitch.requestedAt}`;
      await send("Reply with exactly: AGY-AFTER", "antigravity follow-up");
      const afterAgy = await metadata();
      expect(afterAgy).toMatchObject({ runId, runtimeKind: "antigravity_cli", startedAt: initial.startedAt });
      expect(Object.hasOwn(afterAgy, "pendingRuntimeSwitch")).toBe(false);
      const secondManifest = await manifest();
      expect(secondManifest.segments.map((segment) => [segment.file_name, segment.boundary_type, segment.runtime_kind])).toEqual([
        ["raw_traces_000001.jsonl", "runtime_switch", "claude_agent_sdk"], ["raw_traces_000002.jsonl", "runtime_switch", "codex_app_server"]]);
      // I-7 (Codex -> Antigravity): segment 2 = the marker of the first switch and exactly the Codex agent's records.
      expect(readRaw(path.join(memoryDir, "raw_traces_000002.jsonl")).map((record) => record.id), "I-7: segment 2 = the Codex agent's records").toEqual(codexRecordIds);
      // I-8: the first archive is byte-identical to its records before.
      expect(readRaw(path.join(memoryDir, "raw_traces_000001.jsonl")).map((record) => record.id)).toEqual(claudeRecordIds);
      const activeAgy = readRaw(path.join(memoryDir, "raw_traces_active.jsonl"));
      expect(activeAgy[0]).toMatchObject({ trace_type: "system_task_notification", correlation_id: secondKey,
        content: expect.stringMatching(/^Agent runtime changed from Codex App Server \(.+\) to Antigravity CLI \(.+\)\.$/) });
      const journalAfter = JSON.parse(await fs.readFile(path.join(memoryDir, "work_journal", "work_journal_manifest.json"), "utf8")) as { files: Array<{ runtime_kind: string | null }> };
      expect(journalAfter.files.map((file) => file.runtime_kind)).toEqual(["claude_agent_sdk", "codex_app_server", "antigravity_cli"]);
    }

    if (EVIDENCE_DIR) {
      const out = path.join(EVIDENCE_DIR, "runtime-switch-live");
      await fs.mkdir(out, { recursive: true });
      await fs.cp(path.join(memoryDir, "work_journal"), path.join(out, "work_journal"), { recursive: true });
      await fs.copyFile(path.join(memoryDir, "raw_traces_manifest.json"), path.join(out, "raw_traces_manifest.json"));
      await fs.writeFile(path.join(out, "summary.json"), JSON.stringify({ runId, models: { claudeModel, codexModel }, scriptedAntigravity: SCRIPTED_AGY,
        segments: (await manifest()).segments.map((segment) => [segment.file_name, segment.boundary_type, segment.runtime_kind, segment.record_count]),
        finalMetadata: await metadata() }, null, 2));
    }
  }, STEP_TIMEOUT_MS * 8);
});
