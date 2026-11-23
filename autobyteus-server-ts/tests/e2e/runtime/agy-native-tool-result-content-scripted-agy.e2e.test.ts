// autobyteus-377: the real content of AGY's native read/search results, from the CLI's transcript, through the real Studio server, run
// recorder, raw trace and Work Journal; only the external CLI is scripted (case `native_tool_results`). A skip is not proof. From the
// package folder (a test-owned HOME is created by this file):
//   RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" \
//   pnpm exec vitest run tests/e2e/runtime/agy-native-tool-result-content-scripted-agy.e2e.test.ts --no-watch
//   NR-01 FULL: every read/search/write result in the success event and the raw trace is the transcript row's text (header included);
//         a result already in the stream is kept; the journal shows cat -n lines, no timestamps, no wrapper lines.
//   NR-02 PARALLEL: the two calls of one planner response each get their own row.
//   NR-03 NO_TRANSCRIPT / GAP: the stream's result stays, one AGY_TOOL_RESULT_UNRECOVERED warning names the reason, the journal keeps
//         `content not recorded`.
import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { nativeToolResultCalls } from "../../fixtures/agy-native-tool-results-turn.mjs";

// Hoisting is essential: the production provider resolves HOME at module import.
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "agy-results-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" && spawnSync(fakeCommand, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("AGY native tool results: recovered from the transcript, in the run record and the Work Journal", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
  const warn = vi.spyOn(console, "warn");
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(home, "app-data-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    process.env["AGY_FAKE_CASE"] = "native_tool_results";
    process.env["AGY_FAKE_RESULT_HOME"] = home;
    process.env["AGY_FAKE_RESULT_WORKSPACE"] = workspace;
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-result-" + randomUUID(), role: "assistant", description: "native result E2E",
        instructions: "Use native tools when requested.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterEach(() => warn.mockClear());
  afterAll(async () => {
    warn.mockRestore();
    for (const socket of sockets) socket.close();
    if (url) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (home) await fs.rm(home, { recursive: true, force: true });
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_RESULT_HOME", "AGY_FAKE_RESULT_WORKSPACE"]) delete process.env[key];
    if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
  });

  const runTurn = async (mode: string) => {
    const created = (await graphql<{ createAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const id = created.runId; runIds.push(id);
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${id}`); sockets.push(socket);
    socket.on("message", (data: unknown) => { messages.push(JSON.parse(String(data)) as Wire); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: id, content: mode });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED")) await wait(25);
    expect(messages.some((m) => m.type === "TURN_COMPLETED"), JSON.stringify(messages.filter((m) => m.type === "ERROR"))).toBe(true);
    const memory = path.join(dataDir, "memory", "agents", id);
    const raw = async () => (await fs.readFile(path.join(memory, "raw_traces_active.jsonl"), "utf8")).trim().split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const journalFile = path.join(memory, "work_journal", "work_journal_active.md");
    const journal = async (needle: string) => {
      const until = Date.now() + 20_000;
      let text = "";
      while (Date.now() < until && !text.includes(needle)) { text = await fs.readFile(journalFile, "utf8").catch(() => ""); await wait(50); }
      return text;
    };
    const results = () => messages.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")
      .map((m) => ({ tool: m.payload["tool_name"], result: m.payload["result"] as { output: unknown } }));
    return { id, messages, raw, journal, results };
  };
  const cat = (n: number, text: string) => `${String(n).padStart(6)}\t${text}`;
  const calls = () => nativeToolResultCalls(workspace);
  const file = () => path.join(workspace, "result.txt");

  it("NR-01 FULL: real content in the success event and the raw trace; the journal shows cat -n lines without timestamps", async () => {
    const run = await runTurn("FULL");
    const expected = calls().map((call) => ({ tool: call.name, output: call.name === "run_command" ? call.streamOutput : call.content }));
    // The first observation of each step records the full arguments of its call.
    expect(run.messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => m.payload["arguments"])).toEqual(calls().map((c) => c.args));
    expect(run.results().map(({ tool, result }) => ({ tool, output: result.output }))).toEqual(expected);
    const rawResults = (await run.raw()).filter((r) => r["trace_type"] === "tool_result");
    expect(rawResults.map((r) => (r["tool_result"] as { output: unknown }).output)).toEqual(expected.map((e) => e.output));
    const text = await run.journal("Command: echo STREAM_RESULT");
    expect(text).toContain(`Command: sed -n '2,3p' ${file()} → ok`);
    expect(text).toContain(cat(2, "second line 🙂"));
    expect(text).toContain(cat(3, "third line"));
    expect(text).toContain(`Command: cat ${file()} → ok`);
    expect(text).toContain(cat(1, "first line"));
    expect(text).toContain(`${file()}:third line`);
    expect(text).toContain("STREAM_RESULT");
    // The current tool names read like the older ones; the CLI's own confirmations and its exit-code wrapper are not shown.
    expect(text).toMatch(/Write file: [^\n]+new\.txt \(2 lines\) → ok\n\s+first\n\s+second/);
    expect(text).toMatch(/Edit file: [^\n]+result\.txt \(\+1 −1\) → ok\n\s+-second line\n\s+\+2nd line/);
    expect(text).toContain("Command: echo STREAM_RESULT → exit 2");
    for (const absent of ["Created At:", "Completed At:", "Showing lines", "Total Lines:", "content not recorded", "ROW_MUST_NOT_BE_USED", "Created file.", "Made 1 replacements", "Command exited", "Command output:", "Tool: "])
      expect(text, absent).not.toContain(absent);
    expect(warn.mock.calls.filter(([message]) => String(message).startsWith("AGY_TOOL_RESULT_UNRECOVERED"))).toEqual([]);
  }, 60_000);

  it("NR-02 PARALLEL: the three calls of one planner response each get their own arguments and row", async () => {
    const run = await runTurn("PARALLEL");
    const batch = calls().filter(({ name }) => ["write_file", "edit_file", "grep_search"].includes(name));
    expect(run.messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => m.payload["arguments"])).toEqual(batch.map((c) => c.args));
    expect(run.results().map(({ tool, result }) => ({ tool, output: result.output }))).toEqual(batch.map((c) => ({ tool: c.name, output: c.content })));
    const text = await run.journal("Edit file:");
    expect(text).toMatch(/Write file: [^\n]+new\.txt \(2 lines\)/);
    expect(text).toMatch(/Edit file: [^\n]+result\.txt \(\+1 −1\)/);
    expect(warn.mock.calls.filter(([message]) => String(message).startsWith("AGY_TOOL_RESULT_UNRECOVERED"))).toEqual([]);
  }, 60_000);

  it.each([["NO_TRANSCRIPT", "TRANSCRIPT_UNREADABLE"], ["GAP", "ROW_NOT_FOUND"]])(
    "NR-03 %s: the stream's result stays, one warning names the reason, the journal keeps `content not recorded`", async (mode, reason) => {
      const run = await runTurn(mode);
      expect(run.results().map(({ result }) => result.output)).toEqual(["2 lines, 31 bytes"]);
      expect((await run.raw()).filter((r) => r["trace_type"] === "tool_result").map((r) => (r["tool_result"] as { output: unknown }).output)).toEqual(["2 lines, 31 bytes"]);
      // Without a transcript the call's arguments are the stream's summary (no range); with a gap the planner row still gives them.
      const command = mode === "GAP" ? `sed -n '2,3p' ${file()}` : `cat ${file()}`;
      expect(await run.journal("content not recorded")).toContain(`Command: ${command} → ok (content not recorded: 2 lines, 31 bytes)`);
      const warned = warn.mock.calls.map(([message]) => String(message)).filter((message) => message.startsWith("AGY_TOOL_RESULT_UNRECOVERED"));
      expect(warned).toHaveLength(1);
      expect(warned[0]).toMatch(new RegExp(`^AGY_TOOL_RESULT_UNRECOVERED run=${run.id} step=2 tool=read_file reason=${reason}$`));
    }, 60_000);
});
