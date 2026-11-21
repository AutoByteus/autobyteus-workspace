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
import { recordProbeTimeouts, withProbeEvidence } from "../helpers/probe-timeout-evidence.js";

import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
// Antigravity's `read_file` and a spilled long output in the Work Journal on a real (scripted) runtime path (agy-journal-reads-and-e2e-flake,
// autobyteus-561: AC-001, AC-003, AC-005, AC-006, AC-007). The scripted AGY CLI (case `journal_reads`) calls `read_file` with a range and a
// size-only result, runs a command whose result is recorded as Antigravity's spill sentence (a preview and the file that holds the full
// output), then reads that file with `read_file`. The real server records the steps and the real Work Journal service renders them.
//   JR-01 the journal reads `Command: sed -n '1,40p' <path> -> ok (content not recorded: 40 lines, 1234 bytes)` for the range read, the
//         command's preview followed by `...[full output was saved outside the raw trace: <path>]` with neither runtime sentence nor
//         `file://`, and an ordinary `Command: cat <path>` for the later read of the saved file (no read is hidden); the raw file still
//         holds the recorded sentence and `read_file` calls; the manifest counts the raw records.
//   JR-02 a journal of the previous renderer revision (`Tool: read_file ...` lines and the runtime sentence, revision 3 in the manifest) is
//         rendered again at the next turn: those lines are gone and the manifest records the current revision.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/work-journal-agy-read-file-spill-scripted-agy.e2e.test.ts --no-watch

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
  const probes = recordProbeTimeouts();
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    // A discovery time-out says which probe and bound ended it (autobyteus-561, D-6).
    if (!response.ok || !body.data || body.errors?.length) throw new Error(withProbeEvidence(JSON.stringify(body.errors ?? body), probes));
    return body.data;
  };

  beforeAll(async () => {
    // Set before the first run so the scripted CLI answers `CALL_TOOL:{…}` with the real platform tool's result.
    process.env["AGY_FAKE_CASE"] = "journal_reads";
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
    probes.stop();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
    
  });

  const SPILL = "/home/user/.gemini/antigravity-cli/brain/abc/.system_generated/steps/2/output.txt";

  it("JR-01..02: read_file reads like view_file, a spilled output shows the preview and the marker, the later read is ordinary, an old-revision journal is re-rendered", async () => {
    process.env["AGY_FAKE_SPILL_PATH"] = SPILL;
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
    socket.on("message", (rawFrame: unknown) => {
      try { messages.push(...agentStreamFramesOf(JSON.parse(String(rawFrame)) as { type?: unknown; payload?: unknown })); } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 30_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(50);
      expect(await predicate(), `${label}: ${JSON.stringify(messages.filter((m) => m.type === "ERROR").map((m) => m.payload))}`).toBe(true);
    };
    const dir = async () => { const found = await findRunMemoryDir(path.join(dataDir, "memory"), id); expect(found, "run memory folder").toBeTruthy(); return found!; };
    const journalFile = async () => path.join(await dir(), "work_journal", "work_journal_active.md");
    const manifestFile = async () => path.join(await dir(), "work_journal", "work_journal_manifest.json");
    const journal = async () => fs.readFile(await journalFile(), "utf8").catch(() => "");
    const raw = async () => fs.readFile(path.join(await dir(), "raw_traces_active.jsonl"), "utf8");
    const turn = async (content: string, expectedTurns: number) => {
      sendE2eSendMessageCommand(socket, { agent_run_id: id, content });
      await until(() => messages.filter((m) => m.type === "TURN_COMPLETED").length === expectedTurns, `turn ${expectedTurns} ended`);
      await until(async () => (await journal()).includes("saved outside the raw trace") || (await journal()).includes("Tool: read_file"), `turn ${expectedTurns} journalled`);
    };

    // JR-01
    await turn("Read the files.", 1);
    const text = await journal();
    const rawText = await raw();
    const heads = text.split("\n");
    expect(text, "the range read reads like view_file").toContain("Command: sed -n '1,40p' /home/user/project/src/index.ts → ok");
    expect(text).toContain("content not recorded: 40 lines, 1234 bytes");
    expect(text, "the preview, then the neutral marker").toMatch(/src\/util\.ts[\s\S]*…\[120 lines not recorded\][\s\S]*tests\/util\.test\.ts\n\s*…\[full output was saved outside the raw trace: \/home\/user\/\.gemini\/antigravity-cli\/brain\/abc\/\.system_generated\/steps\/2\/output\.txt\]/);
    expect(text, "neither runtime sentence nor the file URL").not.toMatch(/output was truncated due to being too long|Here is a preview|file:\/\//);
    expect(text, "the later read of the saved file is an ordinary read line").toContain(`Command: cat ${SPILL} → ok`);
    expect(heads.filter((line) => /read_file/.test(line)), "no generic read_file line").toEqual([]);
    expect(rawText, "the raw file keeps the recorded sentence").toContain("The tool's output was truncated due to being too long");
    expect(rawText.split("\n").filter((line) => line.includes('"tool_name":"read_file"')).length, "and the read_file calls").toBeGreaterThanOrEqual(2);
    const manifest = JSON.parse(await fs.readFile(await manifestFile(), "utf8")) as { renderer_revision: number; files: Array<{ source_record_count: number }> };
    expect(manifest.renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
    expect(manifest.files[0]!.source_record_count).toBe(rawText.split("\n").filter(Boolean).length);

    // JR-02: what revision 3 wrote
    const old = text
      .replace("Command: sed -n '1,40p' /home/user/project/src/index.ts → ok", "Tool: read_file Path=\"/home/user/project/src/index.ts\" StartLine=1 EndLine=40 → ok")
      .replace(/…\[full output was saved outside the raw trace: [^\]]+\]/, "The tool's output was truncated due to being too long. You can find the full output in a file at file://" + SPILL);
    expect(old).not.toBe(text);
    await fs.writeFile(await journalFile(), old);
    await fs.writeFile(await manifestFile(), JSON.stringify({ ...manifest, renderer_revision: WORK_JOURNAL_RENDERER_REVISION - 1 }));
    await turn("Read the files again.", 2);
    const again = await journal();
    expect(again, "the stale lines are gone after the next render").not.toMatch(/Tool: read_file|output was truncated due to being too long|file:\/\//);
    expect(again).toContain("saved outside the raw trace");
    expect(JSON.parse(await fs.readFile(await manifestFile(), "utf8")).renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
  }, 120_000);
});
