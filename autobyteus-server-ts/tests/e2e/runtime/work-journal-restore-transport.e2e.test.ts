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

// Work Journal through the real server, with no model (REQ-W5, REQ-W6; SCN-W5, SCN-W6). The scripted
// AGY CLI tests/fixtures/agy-failure-cli.mjs (case auto_compaction) streams an automatic compaction on
// turn 2, so the run's raw traces rotate. Checks:
//   - after each turn the open journal includes that turn (AC-W6);
//   - the rotation writes a closed journal file;
//   - an older run whose folder has raw traces but no `work_journal/` (simulated by deleting the folder
//     after terminate) gets every journal file again at its first turn end after restore, and the closed
//     file is byte-identical to the first rendering (AC-W5).
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type Manifest = { runtime_kind: string; files: Array<{ journal_file: string; source_file: string; state: string }> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The run's memory folder: the folder holding `raw_traces_active.jsonl` whose path names the run. */
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

suite("Work Journal kept current, closed files written once, and rebuilt for an older run on restore", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  let runId = "";
  const sockets: WebSocket[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    // Set before the first run so the server's cached version probe reads the 1.2.16 fake.
    process.env["AGY_FAKE_CASE"] = "auto_compaction";
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "work-journal-restore-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "work-journal-restore-" + randomUUID(), role: "assistant", description: "journal probe",
        instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      if (runId) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  });

  it("updates the open file per turn, writes the closed file once, and regenerates both after restore", async () => {
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    runId = created.createAgentRun.runId!;
    const messages: Wire[] = [];
    const connect = async () => {
      const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
      sockets.push(socket);
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") messages.push({ type: parsed.type,
            payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* Ignore only malformed diagnostic transport rows. */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
      return socket;
    };
    let socket = await connect();
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(50);
      expect(await predicate(), `${label}: ${JSON.stringify(messages.map((m) => m.type).slice(-20))}`).toBe(true);
    };
    const completedTurns = () => messages.filter((m) => m.type === "TURN_COMPLETED").length;
    const memoryDir = async () => {
      const found = await findRunMemoryDir(path.join(dataDir, "memory"), runId);
      expect(found, "run memory folder").toBeTruthy();
      return found!;
    };
    const journal = async (file: string) => fs.readFile(path.join(await memoryDir(), "work_journal", file), "utf8").catch(() => "");
    const manifest = async (): Promise<Manifest> =>
      JSON.parse(await fs.readFile(path.join(await memoryDir(), "work_journal", "work_journal_manifest.json"), "utf8")) as Manifest;

    // Turn 1: the open file includes it (AC-W6).
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "First message before compaction." });
    await until(() => completedTurns() === 1, "first turn");
    await until(async () => (await journal("work_journal_active.md")).includes("BEFORE_COMPACTION_REPLY"), "open file has turn 1");
    const open1 = await journal("work_journal_active.md");
    expect(open1).toContain("# Work Journal — run " + runId);
    expect(open1).toContain("Runtime Antigravity CLI · file active (open)");
    expect(open1).toContain("This journal records past work.");
    expect(open1).toContain("User: First message before compaction.");
    expect(open1).toContain("Agent: BEFORE_COMPACTION_REPLY");

    // Turn 2: AGY compacts, the raw traces rotate, a closed journal file is written (SCN-W5).
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Second message; AGY compacts here." });
    await until(() => completedTurns() === 2, "compacting turn");
    await until(async () => (await journal("work_journal_000001.md")).length > 0, "closed journal file", 20_000);
    await until(async () => (await journal("work_journal_active.md")).includes("AFTER_COMPACTION_REPLY"), "open file has turn 2");
    const closed = await journal("work_journal_000001.md");
    expect(closed).toContain("file 000001 (closed)");
    expect(closed).toContain("source ../raw_traces_000001.jsonl");
    expect(closed).toContain("User: First message before compaction.");
    expect(closed).toContain("Agent: BEFORE_COMPACTION_REPLY");
    // Runtime machinery is not journalled (D5): no compaction line anywhere.
    // (The scripted messages themselves mention compaction, so User/Agent entries are excluded.)
    const markerIds = (await fs.readFile(path.join(await memoryDir(), "raw_traces_active.jsonl"), "utf8")).split("\n")
      .filter(Boolean).map((line) => JSON.parse(line) as { id: string; trace_type: string })
      .filter((record) => record.trace_type === "provider_compaction_boundary").map((record) => record.id);
    expect(markerIds.length, "the rotation left its compaction marker in the active raw file").toBeGreaterThan(0);
    for (const text of [closed, await journal("work_journal_active.md")]) {
      const entryLines = text.split("\n").filter((line) => /^\[\d\d:\d\d:\d\d\] /.test(line));
      expect(entryLines.filter((line) => /compaction/i.test(line) && !/^\[[\d:]+\] (User|Agent): /.test(line)),
        "machinery lines").toEqual([]);
      for (const id of markerIds) expect(text.includes(`#${id})`), `compaction marker ${id} journalled`).toBe(false);
    }
    expect((await manifest()).files.map((file) => [file.journal_file, file.source_file, file.state])).toEqual([
      ["work_journal_000001.md", "raw_traces_000001.jsonl", "closed"],
      ["work_journal_active.md", "raw_traces_active.jsonl", "open"],
    ]);
    const closedStat = await fs.stat(path.join(await memoryDir(), "work_journal", "work_journal_000001.md"));

    // Turn 3: the closed file is not rewritten.
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Third message." });
    await until(() => completedTurns() === 3, "later turn");
    await until(async () => (await journal("work_journal_active.md")).includes("User: Third message."), "open file has turn 3");
    expect(await journal("work_journal_000001.md")).toBe(closed);
    expect((await fs.stat(path.join(await memoryDir(), "work_journal", "work_journal_000001.md"))).mtimeMs).toBe(closedStat.mtimeMs);

    // An older run: raw traces but no work_journal/. Terminate, remove the folder, restore, continue.
    expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
      "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }))
      .terminateAgentRun.success).toBe(true);
    socket.close();
    await fs.rm(path.join(await memoryDir(), "work_journal"), { recursive: true, force: true });
    const restored = (await graphql<{ restoreAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message runId } }",
      { agentRunId: runId })).restoreAgentRun;
    expect(restored, restored.message).toMatchObject({ success: true, runId });
    socket = await connect();
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Fourth message after restore." });
    await until(() => completedTurns() === 4, "turn after restore");
    await until(async () => (await journal("work_journal_active.md")).includes("User: Fourth message after restore."),
      "open file regenerated with the restored turn");
    // The closed file is rendered again from the same raw traces: byte-identical (AC-W5, SCN-W6).
    expect(await journal("work_journal_000001.md")).toBe(closed);
    const regeneratedOpen = await journal("work_journal_active.md");
    expect(regeneratedOpen).toContain("User: Third message.");
    expect(regeneratedOpen).toContain("Agent: AFTER_COMPACTION_REPLY");
    expect((await manifest()).files.map((file) => file.state)).toEqual(["closed", "open"]);

    // Every link resolves to a record of the named raw file (AC-W4).
    const dir = await memoryDir();
    for (const [file, text] of [["work_journal_000001.md", closed], ["work_journal_active.md", regeneratedOpen]] as const) {
      const links = [...text.matchAll(/\]\(\.\.\/(raw_traces_[a-z0-9]+\.jsonl)#([^)]+)\)/g)];
      expect(links.length, `${file} links`).toBeGreaterThan(0);
      for (const [, rawFile, id] of links) {
        const raw = await fs.readFile(path.join(dir, rawFile!), "utf8");
        expect(raw.includes(`"id":"${id}"`), `${file} → ${rawFile}#${id}`).toBe(true);
      }
    }
    expect(messages.some((m) => m.type === "ERROR")).toBe(false);
  }, 90_000);
});
