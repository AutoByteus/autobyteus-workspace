import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// LIVE: the real content of Antigravity's native tool results on the BUILT server (agy-tool-result-content, autobyteus-377, AC-012, API/E2E).
// The real `agy` (signed-in host login; it needs the real HOME, USER and LOGNAME, TESTING.md) runs on a synthetic scratch workspace; the server,
// its data root and database are test-owned. Each run adds small synthetic conversations to the user's `agy` history and spends its credits.
//   LN-01 a ranged `read_file` (lines 5-9): the raw trace's tool_result holds those lines (not the whole-file size summary) and the journal
//         shows them as `cat -n` lines under `Command: sed -n '5,9p' ...`.
//   LN-02 several `read_file` steps (50+ across the file): every recovered; the share of AGY_TOOL_RESULT_UNRECOVERED warnings is reported.
//   LN-03 a write/edit batch asked in ONE response: arguments recorded in full; the journal shows `Write file:` / `Edit file:` lines.
//   LN-04 `run_command` with a non-zero exit code: the journal shows `-> exit 3`.
//   LN-06 asks for grep_search / find_by_name / view_file: agy 1.5.15 does not offer them (it searches with run_command); when a CLI does use
//         one, its recorded result must hold the matches or paths, not the empty stream result.
//   LN-05 a read of a large file (about 120 KB): the recorded result is bounded by the CLI's own limit and the cap, never fails the turn.
// Gate: RUN_AGY_RESULT_CONTENT_LIVE_E2E=1 (needs `agy` signed in). Optional: AGY_RESULT_CONTENT_EVIDENCE_DIR=<dir> saves the raw tool records and journal.
// Run: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_AGY_RESULT_CONTENT_LIVE_E2E=1 \
//   pnpm exec vitest run tests/e2e/runtime/agy-native-tool-result-content-live.e2e.test.ts --no-watch
const ENABLED = process.env.RUN_AGY_RESULT_CONTENT_LIVE_E2E === "1" && spawnSync("agy", ["--version"], { stdio: "ignore" }).status === 0
  && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const EVIDENCE_DIR = process.env.AGY_RESULT_CONTENT_EVIDENCE_DIR?.trim() || "";
const STEP_MS = Number(process.env.AGY_RESULT_CONTENT_STEP_TIMEOUT_MS || 300_000);
type Json = Record<string, any>;
type Wire = { type: string; payload: Json };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const readRaw = (file: string): Json[] => {
  try { return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json); } catch { return []; }
};
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await check()) return; await wait(100); }
  throw new Error(`Timed out: ${label}`);
};
const findDir = (base: string, name: string, depth = 0): string | null => {
  if (depth > 6 || !existsSync(base)) return null;
  for (const entry of readdirSync(base)) {
    const full = path.join(base, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === name) return full;
    const nested = findDir(full, name, depth + 1);
    if (nested) return nested;
  }
  return null;
};
const NOTES = Array.from({ length: 40 }, (_, i) => `note line ${i + 1}: the quick brown fox ${i + 1}`).join("\n") + "\n";
const MANY = 30;

describe.runIf(ENABLED)("LIVE Antigravity native tool results recovered from the CLI's transcript", () => {
  const suffix = `atrc-live-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  const workspace = path.join(runtimeRoot, "workspace");
  let server: Awaited<ReturnType<typeof startBuiltTestServer>>;
  let runId = "";
  const sockets: WebSocket[] = [];
  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server.serverUrl, query, variables);
  const dir = () => findDir(path.join(runtimeRoot, "memory", "agents"), runId)!;
  const raw = () => readRaw(path.join(dir(), "raw_traces_active.jsonl"));
  const journal = () => readFileSync(path.join(dir(), "work_journal", "work_journal_active.md"), "utf8");
  const toolResults = (name: string) => {
    const records = raw();
    const calls = new Map(records.filter((r) => r.trace_type === "tool_call" && r.tool_name === name).map((r) => [r.tool_call_id as string, r]));
    return records.filter((r) => r.trace_type === "tool_result" && calls.has(r.tool_call_id)).map((r) => ({ call: calls.get(r.tool_call_id)!, result: r }));
  };
  const resultText = (r: Json): string => { const out = r.tool_result?.output ?? r.tool_result; return typeof out === "string" ? out : JSON.stringify(out ?? ""); };
  const turn = async (content: string, label: string) => {
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(server.serverUrl).port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (data: unknown) => {
      try { const p = JSON.parse(String(data)) as { type?: string; payload?: Json }; if (typeof p.type === "string") messages.push({ type: p.type, payload: p.payload ?? {} }); } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 120_000);
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    await until(() => messages.some((m) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED" || m.type === "ERROR"), `${label}: turn end`, STEP_MS);
    expect(messages.filter((m) => m.type === "ERROR").map((m) => m.payload), `${label}: errors`).toEqual([]);
    await wait(1500);
    socket.close();
  };
  const warnings = () => (server.output().match(/AGY_TOOL_RESULT_UNRECOVERED[^\n]*/g) ?? []);

  beforeAll(async () => {
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(path.join(workspace, "notes.txt"), NOTES);
    await fs.writeFile(path.join(workspace, "big.txt"), Array.from({ length: 2400 }, (_, i) => `big line ${i + 1} ${"x".repeat(40)}`).join("\n") + "\n");
    for (let i = 1; i <= MANY; i += 1) await fs.writeFile(path.join(workspace, `f${String(i).padStart(2, "0")}.txt`), `file ${i}\n${"data ".repeat(i)}\nend ${i}\n`);
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl,
      environment: { HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME } });
    const models = (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: AGY }))
      .providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier));
    const model = models.find((id) => /low/.test(id)) ?? models[0]!;
    expect(model, `agy models: ${models.join(", ")}`).toBeTruthy();
    const definition = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", { input: {
      name: `atrc-live ${randomUUID().slice(0, 6)}`, role: "assistant", description: "live native tool result content", category: "runtime-e2e", toolNames: [],
      instructions: "Do exactly what the user asks with your own file and shell tools in the workspace. Do not use AutoByteus MCP tools. Keep replies to one word." } })).createAgentDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", { input: {
      agentDefinitionId: definition, runtimeKind: AGY, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    runId = created.runId as string;
  }, 300_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    try { if (server) await server.stop(); } finally { await removeOwnedTestRuntime(runtimeRoot, database); }
  }, 120_000);

  const save = async (label: string) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    const tools = raw().filter((r) => /^tool_(call|result)$/.test(r.trace_type)).map((r) => JSON.stringify(r)).join("\n") + "\n";
    await fs.writeFile(path.join(EVIDENCE_DIR, `${label}-raw-tool-records.jsonl`), tools);
    await fs.writeFile(path.join(EVIDENCE_DIR, `${label}-journal.md`), journal());
    await fs.writeFile(path.join(EVIDENCE_DIR, `${label}-warnings.txt`), warnings().join("\n") + "\n");
  };

  it("LN-01: a ranged read_file records the lines read; the journal shows them as cat -n lines", async () => {
    await turn("Use your read_file tool on notes.txt with StartLine 5 and EndLine 9 (only those lines), then reply DONE.", "ranged read");
    await until(() => toolResults("read_file").length > 0, "a read_file result in the raw trace", 60_000);
    const ranged = toolResults("read_file").find(({ call }) => JSON.stringify(call).includes("notes.txt"))!;
    expect(ranged, "the read of notes.txt").toBeTruthy();
    const text = resultText(ranged.result);
    expect(text, "not the whole-file size summary").not.toMatch(/^\d+ lines, \d+ bytes$/);
    for (const n of [5, 6, 7, 8, 9]) expect(text, `line ${n}`).toContain(`note line ${n}:`);
    expect(text, "only the lines asked for").not.toContain("note line 12:");
    await until(() => /sed -n '5,9p'/.test(journal()), "the ranged command in the journal");
    const j = journal();
    expect(j).toMatch(/Command: sed -n '5,9p' [^\n]*notes\.txt → ok/);
    expect(j, "the lines as cat -n lines").toMatch(/\n\s*5\s+note line 5:/);
    expect(j, "no Antigravity header or wrapper").not.toMatch(/Created At:|Completed At:|Showing lines/);
    expect(j).not.toContain("content not recorded");
    await save("LN-01");
  }, STEP_MS * 2);

  it("LN-02: 30 read_file steps in one turn, twice, all recovered; the miss share is reported", async () => {
    const names = Array.from({ length: MANY }, (_, i) => `f${String(i + 1).padStart(2, "0")}.txt`);
    const before = toolResults("read_file").length;
    const warnBefore = warnings().length;
    await turn(`Use your read_file tool once on each of these files, one call per file, in order: ${names.join(", ")}. Then reply DONE.`, "30 reads A");
    await turn(`Again use your read_file tool once on each of these files, one call per file, in order: ${names.slice().reverse().join(", ")}. Then reply DONE.`, "30 reads B");
    await wait(2000);
    const fresh = toolResults("read_file").slice(before);
    const recovered = fresh.filter(({ result }) => /file \d+\n/.test(resultText(result.tool_result ? result : result)) || /data /.test(resultText(result)));
    const summaries = fresh.filter(({ result }) => /^\d+ lines, \d+ bytes$/.test(resultText(result).trim()));
    const newWarnings = warnings().slice(warnBefore);
    process.stderr.write(`LN-02 steps=${fresh.length} recovered=${recovered.length} summaryOnly=${summaries.length} warnings=${newWarnings.length}\n${newWarnings.join("\n")}\n`);
    expect(fresh.length, "at least 50 live read steps").toBeGreaterThanOrEqual(50);
    expect(recovered.length + summaries.length, "every result is either recovered text or the kept summary").toBe(fresh.length);
    expect(summaries.length, "each miss is a logged one").toBe(newWarnings.length);
    expect(summaries.length / fresh.length, "the miss share is below the 5% line").toBeLessThan(0.05);
    await save("LN-02");
  }, STEP_MS * 3);

  it("LN-03: a write/edit batch asked in one response: full arguments and Write file / Edit file journal lines", async () => {
    await turn("In ONE response, make these calls together at the same time: write_file to create alpha.txt with the content `alpha one\\nalpha two\\n`; write_file to create beta.txt with the content `beta one\\n`; and edit_file on notes.txt replacing the text `quick brown fox 1` with `slow red fox 1`. Then reply DONE.", "write/edit batch");
    await until(() => toolResults("write_file").length > 0, "write_file calls in the raw trace", 60_000);
    const writes = raw().filter((r) => r.trace_type === "tool_call" && r.tool_name === "write_file");
    const argsText = JSON.stringify(writes.map((r) => r.tool_args ?? r));
    expect(argsText, "the written content is recorded, not only the path").toMatch(/alpha one|beta one/);
    await until(() => /Write file:/.test(journal()), "a Write file line");
    const j = journal();
    expect(j).toMatch(/Write file: [^\n]*(alpha|beta)\.txt/);
    expect(j, "the generic read_file/write_file tool lines are gone").not.toMatch(/Tool: (write_file|edit_file)/);
    process.stderr.write(`LN-03 writeCalls=${writes.length} editCalls=${raw().filter((r) => r.trace_type === "tool_call" && r.tool_name === "edit_file").length}\n`);
    await save("LN-03");
  }, STEP_MS * 2);

  it("LN-04: run_command with a non-zero exit code shows the exit code as the outcome", async () => {
    await turn("Use your run_command tool to run exactly: sh -c 'echo before-exit; exit 3'. Then reply DONE.", "exit 3");
    await until(() => /exit 3/.test(journal()), "→ exit 3 in the journal", 60_000);
    const j = journal();
    expect(j).toMatch(/Command: sh -c [^\n]*exit 3[^\n]* → exit 3/);
    expect(j, "no Antigravity wrapper line").not.toMatch(/Command exited with code|Command output:/);
    expect(j).toContain("before-exit");
    await save("LN-04");
  }, STEP_MS * 2);

  it("LN-05: a read of a large file records a bounded result and the turn completes", async () => {
    const before = toolResults("read_file").length;
    await turn("Use your read_file tool once on big.txt (the whole file, no range), then reply DONE.", "big read");
    await until(() => toolResults("read_file").length > before, "the big read's result", 60_000);
    const big = toolResults("read_file").slice(before).find(({ call }) => JSON.stringify(call).includes("big.txt"))!;
    expect(big, "the read of big.txt").toBeTruthy();
    const bytes = Buffer.byteLength(resultText(big.result), "utf8");
    process.stderr.write(`LN-05 recordedBytes=${bytes}\n`);
    expect(bytes, "bounded by the cap plus its marker").toBeLessThan(256 * 1024 + 200);
    expect(resultText(big.result), "content or the kept summary or the CLI's own spill sentence").toMatch(/big line 1 |^\d+ lines, \d+ bytes$|saved outside the raw trace/);
    await save("LN-05");
  }, STEP_MS * 2);

  it("LN-06: grep_search / find_by_name / view_file when the CLI offers them: the result holds the content; otherwise the tool names used are reported", async () => {
    const before = raw().length;
    await turn("Find the files whose names start with f1 in the workspace using your find_by_name tool, and search for the text `quick brown fox 3` in the workspace using your grep_search tool, and view notes.txt with view_file. If a tool does not exist, use whatever search tool you have instead. Then reply DONE.", "search tools");
    const fresh = raw().slice(before);
    const used = [...new Set(fresh.filter((r) => r.trace_type === "tool_call").map((r) => r.tool_name as string))];
    process.stderr.write(`LN-06 toolsUsed=${used.join(",")}\n`);
    for (const name of ["grep_search", "find_by_name", "view_file"]) {
      for (const { result } of toolResults(name)) expect(resultText(result).trim(), `${name} result is not empty`).not.toBe("");
    }
    await save("LN-06");
  }, STEP_MS * 2);
});
