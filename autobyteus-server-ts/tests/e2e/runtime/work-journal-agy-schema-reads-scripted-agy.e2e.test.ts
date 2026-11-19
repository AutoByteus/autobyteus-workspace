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
import { agentStreamFramesOf } from "../helpers/agent-stream-frames.js";

import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
// Antigravity's own MCP schema reads are left out of the Work Journal on a real (scripted) runtime path (journal-omit-agy-schema-reads,
// autobyteus-560: AC-001, AC-003, AC-004, AC-005, AC-006). The scripted AGY CLI (case `mcp_calls`) opens a schema file with `view_file`
// and then calls `delegate_task` through `call_mcp_tool`; the real server records the steps and the real Work Journal service renders
// them when the turn ends.
//   JS-01 the schema path is real-shaped (`<home>/.gemini/antigravity-cli/mcp/<server>/<tool>.json`, synthetic home): the journal has the
//         MCP call (`Delegate task to /researcher -> ok`) and no line for the read, while the raw trace file still holds the `view_file`
//         call and its result and the manifest counts the raw records.
//   JS-02 a second run whose read opens a path outside Antigravity's data folder (`/agy/mcp/...`, the fixture's default): the read stays
//         in the journal (the rule matches Antigravity's own folder only).
//   JS-03 a journal of the previous renderer revision (the read as a line, revision 2 in the manifest) is rendered again at the next
//         turn: the line is gone and the manifest records the current revision; the raw file is unchanged.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/work-journal-agy-schema-reads-scripted-agy.e2e.test.ts --no-watch

const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
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

suite("Antigravity MCP schema reads in the Work Journal on a real (scripted) runtime", () => {
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

  beforeAll(async () => {
    // Set before the first run so the scripted CLI answers `CALL_TOOL:{…}` with the real platform tool's result.
    process.env["AGY_FAKE_CASE"] = "mcp_calls";
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "work-journal-neutral-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "work-journal-neutral-" + randomUUID(), role: "assistant", description: "journal probe",
        instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
    delete process.env["AGY_FAKE_MCP_SCHEMA_PATH"];
  });

  const SCHEMA_REAL = "/home/user/.gemini/antigravity-cli/mcp/autobyteus_agent_tools/delegate_task.json";
  const SCHEMA_OTHER = "/agy/mcp/autobyteus_agent_tools/delegate_task.json";

  /** Starts a run, sends one message, waits for the turn end and returns what the test reads afterwards. */
  const startRun = async (schemaPath: string) => {
    process.env["AGY_FAKE_MCP_SCHEMA_PATH"] = schemaPath;
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const id = created.createAgentRun.runId!;
    runIds.push(id);
    const messages: Wire[] = [];
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + id);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        messages.push(...agentStreamFramesOf(parsed));
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const completedTurns = () => messages.filter((m) => m.type === "TURN_COMPLETED").length;
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 30_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(50);
      expect(await predicate(), `${label}: ${JSON.stringify(messages.filter((m) => m.type === "ERROR").map((m) => m.payload).concat(messages.map((m) => m.type).slice(-20) as never))}`).toBe(true);
    };
    const dir = async () => {
      const found = await findRunMemoryDir(path.join(dataDir, "memory"), id);
      expect(found, "run memory folder").toBeTruthy();
      return found!;
    };
    const journalFile = async () => path.join(await dir(), "work_journal", "work_journal_active.md");
    const manifestFile = async () => path.join(await dir(), "work_journal", "work_journal_manifest.json");
    const journal = async () => fs.readFile(await journalFile(), "utf8").catch(() => "");
    const raw = async () => fs.readFile(path.join(await dir(), "raw_traces_active.jsonl"), "utf8");
    const turn = async (content: string, expectedTurns: number) => {
      sendE2eSendMessageCommand(socket, { agent_run_id: id, content });
      await until(() => completedTurns() === expectedTurns, `turn ${expectedTurns} ended`);
      await until(async () => (await journal()).includes("Delegate task to /researcher"), "the journal has the MCP call");
    };
    return { id, turn, journal, raw, journalFile, manifestFile, until };
  };

  it("JS-01..03: a real-shaped schema read is omitted and the raw trace keeps it; another path is kept; an old-revision journal is re-rendered", async () => {
    // JS-01
    const run = await startRun(SCHEMA_REAL);
    await run.turn("Do the scripted calls.", 1);
    const text = await run.journal();
    const rawText = await run.raw();
    expect(text, "the MCP call is journalled").toContain("Delegate task to /researcher");
    // the journal words a `view_file` as `Command: cat <path>`; none of that for the schema file
    expect(text, "no line for the schema read").not.toMatch(/Command: cat|view_file|\.gemini/);
    const rawRecords = rawText.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, any>);
    const readCall = rawRecords.find((record) => record.trace_type === "tool_call" && JSON.stringify(record).includes(SCHEMA_REAL));
    expect(readCall, "the raw file holds the schema read's call").toBeTruthy();
    expect(readCall!.tool_name).toBe("view_file");
    expect(rawRecords.some((record) => record.trace_type === "tool_result" && record.tool_call_id === readCall!.tool_call_id), "and its result").toBe(true);
    const manifest = JSON.parse(await fs.readFile(await run.manifestFile(), "utf8")) as { renderer_revision: number; files: Array<{ source_record_count: number }> };
    expect(manifest.renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
    expect(manifest.files[0]!.source_record_count, "the manifest counts the raw records").toBe(rawText.split("\n").filter(Boolean).length);

    // JS-03 (same run): the previous revision's journal had the read as a line
    const withRead = text.replace(/^(\[\d\d:\d\d:\d\d\] )Delegate task/m, `$1Command: cat ${SCHEMA_REAL} → ok\n$1Delegate task`);
    expect(withRead, "the old-revision line was inserted").toContain(`cat ${SCHEMA_REAL}`);
    await fs.writeFile(await run.journalFile(), withRead);
    await fs.writeFile(await run.manifestFile(), JSON.stringify({ ...manifest, renderer_revision: WORK_JOURNAL_RENDERER_REVISION - 1 }));
    await run.turn("Do the scripted calls again.", 2);
    const again = await run.journal();
    expect(again, "the stale line is gone after the next render").not.toContain(".gemini");
    expect(JSON.parse(await fs.readFile(await run.manifestFile(), "utf8")).renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
    expect((await run.raw()).startsWith(rawText), "the raw file only grew (the first turn's records are unchanged)").toBe(true);

    // JS-02: a read outside Antigravity's data folder stays visible
    const other = await startRun(SCHEMA_OTHER);
    await other.turn("Do the scripted calls.", 1);
    expect(await other.journal(), "a read of a path outside .gemini/antigravity* is kept").toContain(`Command: cat ${SCHEMA_OTHER}`);
  }, 120_000);
});
