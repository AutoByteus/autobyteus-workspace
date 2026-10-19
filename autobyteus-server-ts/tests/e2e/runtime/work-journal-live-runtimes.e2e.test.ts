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
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Live Work Journal through the real Studio server and each real runtime (REQ-W1, W4, W6, W7; SCN-W1).
// Every runtime gets the same small task (a command, a read, a write, an edit). After its turn ends,
// `work_journal_active.md` must include the turn, every tool call must have exactly one journal entry,
// no built-in tool may appear as a generic `Tool:` line, and every link must resolve. The journal and
// raw traces of each run are copied to WORK_JOURNAL_E2E_EVIDENCE_DIR (when set) for the cross-runtime
// AC-W1 comparison. Extra checks:
//   - AutoByteus (native): the turn's raw records are on disk when TURN_COMPLETED is observed (design
//     escalation trigger 1).
//   - Claude: `/compact` closes a journal file, which a later turn leaves byte-identical (AC-W5, SCN-W5).
// One gate per runtime; each run spends the user's credits or local compute:
//   AutoByteus: RUN_DEEPSEEK_E2E=1 with DEEPSEEK_API_KEY (saved into the test-owned vault; DEEPSEEK_E2E_MODEL,
//     default deepseek-v4-flash), or RUN_LMSTUDIO_E2E=1 (LMSTUDIO_TARGET_TEXT_MODEL, default qwen3.6-35b-a3b)
//   RUN_CLAUDE_E2E=1, RUN_CODEX_E2E=1, RUN_AGY_E2E=1 (host agy login; adds to the user's agy history).
// Signed-in CLIs need the real HOME, USER and LOGNAME (TESTING.md). Grok Build is not covered live here.
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const gate = (flag: string, command?: string) => process.env[flag] === "1" && (!command || commandReady(command));
const AUTOBYTEUS_PROVIDER = process.env.RUN_DEEPSEEK_E2E === "1" && process.env.DEEPSEEK_API_KEY?.trim() ? "DEEPSEEK"
  : process.env.RUN_LMSTUDIO_E2E === "1" ? "LMSTUDIO" : null;
const AUTOBYTEUS_MODEL = AUTOBYTEUS_PROVIDER === "DEEPSEEK" ? process.env.DEEPSEEK_E2E_MODEL?.trim() || "deepseek-v4-flash"
  : process.env.LMSTUDIO_TARGET_TEXT_MODEL?.trim() || "qwen3.6-35b-a3b";
const STEP_TIMEOUT_MS = Number(process.env.WORK_JOURNAL_E2E_STEP_TIMEOUT_MS || 300_000);
const EVIDENCE_DIR = process.env.WORK_JOURNAL_E2E_EVIDENCE_DIR?.trim() || "";
const TASK = [
  "Use your tools for each step below, one tool call per step, in this order:",
  "1) run the shell command `ls`;",
  "2) read the file notes.txt;",
  "3) create a new file out.txt whose content is exactly the word alpha;",
  "4) edit out.txt to replace alpha with beta.",
  "Then reply with exactly: DONE",
].join("\n");
const BUILT_INS: Record<string, string[]> = JSON.parse(readFileSync(
  new URL("../../fixtures/agent-work-journal/work-journal-builtin-tools.json", import.meta.url), "utf8")) as never;
const builtInNames = (runtimeKind: string) => Object.keys(BUILT_INS[runtimeKind] ?? {});

type Wire = { type: string; payload: Record<string, unknown> };
type RawRecord = { id: string; trace_type: string; content?: string | null; tool_name?: string | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
const readRaw = (file: string): RawRecord[] => {
  try {
    return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as RawRecord);
  } catch {
    return [];
  }
};
/** Entry lines of a journal: `[hh:mm:ss] <line>` (continuation lines are indented). */
const entries = (journal: string) => journal.split("\n").filter((line) => /^\[\d\d:\d\d:\d\d\] /.test(line))
  .map((line) => line.slice(11));
const TOOL_ENTRY = /^(Command|Write file|Edit file|Search web|Tool|Tool result)\b/;

describe("Work Journal on each live runtime", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
  const definitionIds: string[] = [];
  const previousLmStudioHosts = process.env.LMSTUDIO_HOSTS;

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const models = async (runtimeKind: string): Promise<string[]> => (await graphql<{ providerModelCatalogSnapshots:
    Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
    "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
    { runtimeKind })).providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((m) => m.modelIdentifier));
  const pickModel = async (runtimeKind: string, preferred: string[]): Promise<string> => {
    const available = await models(runtimeKind);
    const chosen = preferred.map((fragment) => available.find((id) => id.includes(fragment))).find(Boolean) ?? available[0];
    expect(chosen, `${runtimeKind} models: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "work-journal-live-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    process.env.LMSTUDIO_HOSTS ??= "http://127.0.0.1:1234";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    // Provider keys present in the environment (DEEPSEEK_API_KEY) go into the test database's vault.
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      for (const id of definitionIds) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id })
        .catch(() => undefined);
      await app.close();
    }
    await closeLiveRuntimeSecretVault();
    if (previousLmStudioHosts === undefined) delete process.env.LMSTUDIO_HOSTS; else process.env.LMSTUDIO_HOSTS = previousLmStudioHosts;
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  /** Creates a run, sends the task, and checks the journal after the turn; returns helpers for more turns. */
  const runTask = async (input: { label: string; runtimeKind: string; model: string; toolNames?: string[];
    onTurnCompleted?: (memoryDir: string) => void }) => {
    const workspace = path.join(dataDir, `workspace-${input.label}`);
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(path.join(workspace, "notes.txt"), "first line\nsecond line\nthird line\n");
    const definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `work-journal-${input.label}-${randomUUID()}`, role: "assistant", description: "Work Journal live check",
        instructions: "Do exactly what the user asks with your tools. Keep replies short.", category: "runtime-e2e",
        toolNames: input.toolNames ?? [] } })).createAgentDefinition.id;
    definitionIds.push(definitionId);
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: input.model,
        llmConfig: null, autoExecuteTools: true, runtimeKind: input.runtimeKind } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.push(runId);
    let memoryDir = "";
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type !== "string") return;
        messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
        if (parsed.type === "TURN_COMPLETED" && memoryDir) input.onTurnCompleted?.(memoryDir);
      } catch { /* Ignore malformed diagnostic rows only. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = STEP_TIMEOUT_MS) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(200);
      expect(await predicate(), `${input.label} ${label}: ${JSON.stringify(messages.map((m) => m.type).slice(-25))}`).toBe(true);
    };
    const turnsEnded = () => messages.filter((m) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED").length;
    const journal = async (file = "work_journal_active.md") =>
      memoryDir ? fs.readFile(path.join(memoryDir, "work_journal", file), "utf8").catch(() => "") : "";
    const send = async (content: string, journalMarker: string, journalFile = "work_journal_active.md") => {
      const before = turnsEnded();
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      if (!memoryDir) {
        await until(async () => (memoryDir = (await findRunMemoryDir(path.join(dataDir, "memory"), runId)) ?? "") !== "",
          "memory folder", 60_000);
      }
      const errorsBefore = messages.filter((m) => m.type === "ERROR").length;
      const errors = () => messages.filter((m) => m.type === "ERROR").slice(errorsBefore);
      // Stop at a runtime ERROR instead of waiting out the step timeout, and show its payload.
      await until(() => turnsEnded() > before || errors().length > 0, "turn end");
      expect(errors().map((m) => m.payload), `${input.label} runtime errors`).toEqual([]);
      // AC-W6: after the turn ends, the open journal file includes it.
      await until(async () => (await journal(journalFile)).includes(journalMarker), `${journalFile} includes the turn`, 30_000);
    };

    await send(TASK, "DONE");
    const text = await journal();
    const raw = readRaw(path.join(memoryDir, "raw_traces_active.jsonl"));
    const calls = raw.filter((record) => record.trace_type === "tool_call");
    const results = raw.filter((record) => record.trace_type === "tool_result");
    const toolEntries = entries(text).filter((line) => TOOL_ENTRY.test(line));
    // Evidence first, so a failing assertion still leaves the files to inspect.
    if (EVIDENCE_DIR) {
      const out = path.join(EVIDENCE_DIR, input.label);
      await fs.mkdir(out, { recursive: true });
      await fs.cp(path.join(memoryDir, "work_journal"), path.join(out, "work_journal"), { recursive: true });
      await fs.copyFile(path.join(memoryDir, "raw_traces_active.jsonl"), path.join(out, "raw_traces_active.jsonl"));
      await fs.writeFile(path.join(out, "summary.json"), JSON.stringify({ runId, runtimeKind: input.runtimeKind, model: input.model,
        toolCalls: calls.map((call) => call.tool_name), toolResults: results.length, toolEntries }, null, 2));
    }
    // Every tool call has exactly one journal entry (unpaired results get their own entry).
    const callIds = new Set(calls.map((call) => call.id));
    expect(calls.length, `${input.label} tool calls`).toBeGreaterThan(0);
    expect(toolEntries.length, `${input.label}: entries ${JSON.stringify(toolEntries)}`).toBeGreaterThanOrEqual(callIds.size);
    // No built-in tool of this runtime is shown through the generic rule.
    for (const name of builtInNames(input.runtimeKind)) {
      expect(toolEntries.some((line) => line.startsWith(`Tool: ${name} `) || line === `Tool: ${name}`),
        `${input.label}: built-in ${name} shown as a generic Tool line`).toBe(false);
    }
    // A one-line message stays on the entry line; a multi-line one starts on the next, indented line.
    expect(text, `${input.label} user entry`).toMatch(/\] User:\s+Use your tools for each step below/);
    expect(text, `${input.label} agent entry`).toMatch(/\] Agent:\s+DONE/);
    expect(text).toContain(`# Work Journal — run ${runId}`);
    expect(text).toContain("This journal records past work.");
    // Every link resolves to a record of its raw file (AC-W4).
    const links = [...text.matchAll(/\]\(\.\.\/(raw_traces_[a-z0-9]+\.jsonl)#([^)]+)\)/g)];
    expect(links.length).toBeGreaterThanOrEqual(toolEntries.length);
    for (const [, rawFile, id] of links) {
      expect(readRaw(path.join(memoryDir, rawFile!)).some((record) => record.id === id), `${input.label} link ${rawFile}#${id}`).toBe(true);
    }
    // The agent really did the work it reports.
    expect((await fs.readFile(path.join(workspace, "out.txt"), "utf8").catch(() => "")).trim(), `${input.label} out.txt`).toBe("beta");
    return { runId, memoryDir, messages, send, journal, until };
  };

  it.runIf(AUTOBYTEUS_PROVIDER !== null)(`AutoByteus (native, ${AUTOBYTEUS_PROVIDER}): raw records on disk at TURN_COMPLETED; journal current`, async () => {
    await graphql("mutation($providerId: String!, $runtimeKind: String) { ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { providerId: AUTOBYTEUS_PROVIDER, runtimeKind: "autobyteus" });
    const model = (await models("autobyteus")).find((id) => id.includes(AUTOBYTEUS_MODEL));
    expect(model, `autobyteus model ${AUTOBYTEUS_MODEL}`).toBeTruthy();
    const atTurnCompleted: string[][] = [];
    const run = await runTask({ label: "autobyteus", runtimeKind: "autobyteus", model: model!,
      toolNames: ["run_bash", "read_file", "write_file", "edit_file"],
      // Read synchronously at the moment the TURN_COMPLETED message arrives (escalation trigger 1).
      onTurnCompleted: (memoryDir) => atTurnCompleted.push(readRaw(path.join(memoryDir, "raw_traces_active.jsonl"))
        .map((record) => `${record.trace_type}:${record.trace_type === "assistant" ? String(record.content ?? "").slice(0, 40) : record.id}`)),
    });
    expect(atTurnCompleted.length).toBeGreaterThan(0);
    const finalRaw = readRaw(path.join(run.memoryDir, "raw_traces_active.jsonl"));
    const lastAssistant = [...finalRaw].reverse().find((record) => record.trace_type === "assistant" && /DONE/.test(String(record.content)));
    expect(lastAssistant, "final assistant record").toBeTruthy();
    expect(atTurnCompleted[0]!.some((entry) => entry.startsWith("assistant:") && entry.includes("DONE")),
      `raw records at TURN_COMPLETED: ${JSON.stringify(atTurnCompleted[0])}`).toBe(true);
    expect(atTurnCompleted[0]!.length, "every record of the turn is on disk at TURN_COMPLETED").toBe(finalRaw.length);
    if (EVIDENCE_DIR) await fs.writeFile(path.join(EVIDENCE_DIR, "autobyteus", "raw-at-turn-completed.json"),
      JSON.stringify({ atTurnCompleted: atTurnCompleted[0], finalRecordCount: finalRaw.length }, null, 2));
  }, STEP_TIMEOUT_MS * 3);

  it.runIf(gate("RUN_CLAUDE_E2E", "claude"))("Claude: journal current; /compact closes a journal file written once", async () => {
    const model = await pickModel("claude_agent_sdk", ["haiku"]);
    const run = await runTask({ label: "claude", runtimeKind: "claude_agent_sdk", model });
    // The /compact message precedes the compaction boundary, so it lands in the closed file.
    await run.send("/compact", "User: /compact", "work_journal_000001.md");
    const closed = await run.journal("work_journal_000001.md");
    if (EVIDENCE_DIR) await fs.cp(path.join(run.memoryDir, "work_journal"), path.join(EVIDENCE_DIR, "claude", "work_journal-at-compact"), { recursive: true });
    expect(closed).toContain("file 000001 (closed)");
    expect(closed).toMatch(/\] User:\s+Use your tools for each step below/);
    const closedPath = path.join(run.memoryDir, "work_journal", "work_journal_000001.md");
    const closedMtime = (await fs.stat(closedPath)).mtimeMs;
    await run.send("Reply with exactly: AFTER", "AFTER");
    expect(await run.journal("work_journal_000001.md")).toBe(closed);
    expect((await fs.stat(closedPath)).mtimeMs).toBe(closedMtime);
    const manifest = JSON.parse(await fs.readFile(path.join(run.memoryDir, "work_journal", "work_journal_manifest.json"), "utf8")) as {
      files: Array<{ journal_file: string; state: string }> };
    expect(manifest.files.map((file) => [file.journal_file, file.state])).toEqual([
      ["work_journal_000001.md", "closed"], ["work_journal_active.md", "open"]]);
    if (EVIDENCE_DIR) await fs.cp(path.join(run.memoryDir, "work_journal"), path.join(EVIDENCE_DIR, "claude", "work_journal-after-compact"), { recursive: true });
    // Runtime machinery is not journalled (D5): no non-message line mentions compaction, and no entry
    // links to a compaction record of the raw trace (the compaction summary text included).
    const active = await run.journal();
    expect(entries(active).filter((line) => /compaction/i.test(line) && !/^(User|Agent):/.test(line))).toEqual([]);
    const machineryIds = [...readRaw(path.join(run.memoryDir, "raw_traces_active.jsonl")),
      ...readRaw(path.join(run.memoryDir, "raw_traces_000001.jsonl"))]
      .filter((record) => /compaction/i.test(record.trace_type)).map((record) => record.id);
    for (const id of machineryIds) expect(active + closed, `link to compaction record ${id}`).not.toContain(`#${id})`);
  }, STEP_TIMEOUT_MS * 4);

  it.runIf(gate("RUN_CODEX_E2E", "codex"))("Codex: journal current after the turn", async () => {
    const model = await pickModel("codex_app_server", [process.env.CODEX_E2E_MODEL?.trim() || "gpt-5.6-luna", "mini"]);
    await runTask({ label: "codex", runtimeKind: "codex_app_server", model });
  }, STEP_TIMEOUT_MS * 2);

  it.runIf(gate("RUN_AGY_E2E", "agy"))("Antigravity: journal current after the turn", async () => {
    const model = await pickModel("antigravity_cli", [process.env.AGY_E2E_MODEL?.trim() || "flash-low", "flash"]);
    await runTask({ label: "antigravity", runtimeKind: "antigravity_cli", model });
  }, STEP_TIMEOUT_MS * 2);

});
