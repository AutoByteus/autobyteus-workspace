// TEMPORARY PROBE for autobyteus-583 AC-005 (API/E2E; not committed to the suite, a copy is kept in the ticket's evidence).
// One run on an isolated in-process server: era 1 is one real turn on the scripted Antigravity CLI, then the stopped run's
// raw traces gain synthetic turns (one Bash command each) so that the previous era's journal has more than 2,000 lines,
// with markers MARK-<code>-<n> every 100 turns and END-<code> in the last line. The run is switched to a live runtime
// (PROBE_TARGET = claude_agent_sdk | codex_app_server | autobyteus) and gets one neutral message. The probe records which
// markers the new agent's tool results held before its first and its last text reply, and every tool call.
// Gates: RUN_HANDOVER_READ_PROBE=1, ANTIGRAVITY_CLI_COMMAND=<abs agy-failure-cli.mjs> with AGY_FAKE_CASE=auto_compaction,
// PROBE_TARGET, the target's login (Claude/Codex: real HOME) or AUTOBYTEUS_TEST_VAULT (native). PROBE_EVIDENCE_DIR keeps files.
import "reflect-metadata";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const ENABLED = process.env.RUN_HANDOVER_READ_PROBE === "1";
const TARGET = process.env.PROBE_TARGET ?? "";
const EVIDENCE = process.env.PROBE_EVIDENCE_DIR?.trim() || "";
const TURNS = Number(process.env.PROBE_TURNS || 600);
const STEP_MS = 600_000;
type Rec = Record<string, any>;
type Wire = { type: string; payload: Rec };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readRaw = (file: string): Rec[] => { try { return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const findRunDir = async (root: string, runId: string): Promise<string | null> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  if (path.basename(root) === runId && entries.some((e) => e.name === "raw_traces_active.jsonl")) return root;
  for (const e of entries) { if (!e.isDirectory()) continue; const f = await findRunDir(path.join(root, e.name), runId); if (f) return f; }
  return null;
};

describe.runIf(ENABLED)(`AC-005 live hand-over read: ${TARGET}`, () => {
  let dataDir = ""; let app: FastifyInstance | null = null; let url: URL;
  const sockets: WebSocket[] = []; const runIds: string[] = []; const defs: string[] = [];
  const graphql = async <T>(query: string, variables?: Rec): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown };
    if (!response.ok || !body.data || (body as Rec).errors?.length) throw new Error(JSON.stringify((body as Rec).errors ?? body));
    return body.data;
  };
  const pickModel = async (runtimeKind: string, preferred: string[]) => {
    const snaps = (await graphql<Rec>("query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { runtimeKind })).providerModelCatalogSnapshots as Rec[];
    const ids = snaps.flatMap((s) => s.llmModels.map((m: Rec) => m.modelIdentifier as string));
    const chosen = preferred.map((f) => ids.find((id) => id.includes(f))).find(Boolean) ?? ids[0];
    expect(chosen, `${runtimeKind} models: ${ids.join(", ")}`).toBeTruthy();
    return chosen!;
  };
  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "handover-read-probe-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
  }, 180_000);
  afterAll(async () => {
    for (const s of sockets) if (s.readyState === WebSocket.OPEN) s.close();
    if (app) {
      for (const id of runIds) await graphql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id }).catch(() => undefined);
      for (const id of defs) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
      await app.close();
    }
    await closeLiveServerVault();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  it("the new agent reads the named journal file to its last line before replying", async () => {
    const code = randomUUID().slice(0, 8);
    const workspace = path.join(dataDir, "workspace"); await fs.mkdir(workspace, { recursive: true });
    const definitionId = (await graphql<Rec>("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `handover-read-${randomUUID()}`, role: "assistant", description: "Hand-over read probe",
        instructions: "You help the user with their work in this workspace. Keep replies short.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id as string;
    defs.push(definitionId);
    const agyModel = await pickModel("antigravity_cli", ["flash"]);
    const created = (await graphql<Rec>("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: agyModel, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string; runIds.push(runId);
    const messages: Wire[] = [];
    const until = async (pred: () => boolean | Promise<boolean>, label: string, ms = STEP_MS) => {
      const deadline = Date.now() + ms; while (Date.now() < deadline && !(await pred())) await wait(250);
      expect(await pred(), `${label}: ${JSON.stringify(messages.map((m) => m.type).slice(-20))}`).toBe(true);
    };
    const connect = async () => {
      const before = messages.filter((m) => m.type === "CONNECTED").length;
      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`); sockets.push(socket);
      socket.on("message", (raw: unknown) => { try { const p = JSON.parse(String(raw)); if (typeof p.type === "string") messages.push({ type: p.type, payload: p.payload ?? {} }); } catch { /* ignore */ } });
      await new Promise<void>((res, rej) => { socket.once("open", () => res()); socket.once("error", rej); });
      await until(() => messages.filter((m) => m.type === "CONNECTED").length > before, "CONNECTED", 120_000);
      return socket;
    };
    const ended = () => messages.filter((m) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED").length;
    let runDir = "";
    const send = async (content: string, label: string) => {
      const socket = await connect(); const before = ended(); const errs = messages.filter((m) => m.type === "ERROR").length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      if (!runDir) await until(async () => (runDir = (await findRunDir(path.join(dataDir, "memory"), runId)) ?? "") !== "", "memory folder", 60_000);
      await until(() => ended() > before || messages.filter((m) => m.type === "ERROR").length > errs, `${label} turn end`);
      expect(messages.filter((m) => m.type === "ERROR").slice(errs).map((m) => m.payload), `${label} errors`).toEqual([]);
      socket.close();
    };

    // Era 1: one real turn on the scripted Antigravity CLI, then the run is stopped.
    await send("Hello.", "era 1");
    expect((await graphql<Rec>("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId })).terminateAgentRun.success).toBe(true);
    await wait(1000);

    // Grow era 1 with synthetic turns: markers every 100 turns, END in the last turn's reply.
    const active = path.join(runDir, "raw_traces_active.jsonl");
    const existing = readRaw(active);
    let seq = Math.max(0, ...existing.map((r) => Number(r.seq) || 0));
    const baseTs = Math.max(...existing.map((r) => Number(r.ts) || 0)) || Math.floor(Date.now() / 1000) - 7200;
    const recs: Rec[] = []; const markers: string[] = [];
    for (let i = 0; i < TURNS; i++) {
      const turn = `syn_${code}_${i}`; const call = `call_${code}_${i}`;
      const marker = i % 100 === 0 ? `MARK-${code}-${i / 100}` : null; if (marker) markers.push(marker);
      const command = marker ? `echo ${marker}` : `echo step ${i}`;
      const reply = i === TURNS - 1 ? `Ran ${command}. END-${code}` : `Ran ${command}.`;
      const add = (r: Rec) => { seq += 1; recs.push({ id: `rt_syn_${code}_${seq}`, seq, ts: baseTs + seq, turn_id: turn, ...r }); };
      add({ trace_type: "user", content: `Run ${command}` });
      add({ trace_type: "tool_call", tool_name: "Bash", tool_call_id: call, tool_args: { command } });
      add({ trace_type: "tool_result", tool_name: "Bash", tool_call_id: call, tool_result: marker ?? `step ${i}` });
      add({ trace_type: "assistant", content: reply });
    }
    markers.push(`END-${code}`);
    await fs.appendFile(active, recs.map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");

    // The switch to the live target, then one neutral message.
    const override = process.env.PROBE_MODEL?.trim();
    const targetModel = override ? await pickModel(TARGET, [override])
      : TARGET === "claude_agent_sdk" ? await pickModel(TARGET, ["haiku"])
      : TARGET === "codex_app_server" ? await pickModel(TARGET, [process.env.CODEX_E2E_MODEL?.trim() || "gpt-5.6-luna", "mini"])
      : await pickModel(TARGET, ["haiku", "claude"]);
    const saved = (await graphql<Rec>(`mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) { success outcome message } }`,
      { input: { agentRunId: runId, runtimeKind: TARGET, llmModelIdentifier: targetModel, llmConfig: null } })).updateStoppedAgentRunSelection;
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    await send("Please continue with the work.", `${TARGET} first message`);

    // What the agent was told and what it read.
    const journalDir = path.join(runDir, "work_journal");
    const named = await fs.readFile(path.join(journalDir, "work_journal_000001.md"), "utf8");
    const namedLines = named.split("\n").filter((l) => l.length > 0);
    const after = readRaw(active);
    const notice = after.find((r) => typeof r.content === "string" && r.content.startsWith("[System: runtime hand-over]"))?.content
      ?? messages.map((m) => JSON.stringify(m.payload)).find((p) => p.includes("runtime hand-over")) ?? null;
    const events = after.filter((r) => ["tool_call", "tool_result", "assistant"].includes(r.trace_type));
    const firstText = events.findIndex((r) => r.trace_type === "assistant" && String(r.content ?? "").trim().length > 0);
    const lastText = events.map((r) => r.trace_type === "assistant" && String(r.content ?? "").trim().length > 0).lastIndexOf(true);
    const resultsBefore = (index: number) => events.slice(0, index < 0 ? events.length : index).filter((r) => r.trace_type === "tool_result")
      .map((r) => typeof r.tool_result === "string" ? r.tool_result : JSON.stringify(r.tool_result ?? "")).join("\n");
    const seen = (text: string) => markers.filter((m) => text.includes(m));
    const summary = {
      target: TARGET, model: targetModel, code, namedFile: { lines: namedLines.length, bytes: Buffer.byteLength(named), lastLine: namedLines.at(-1)?.slice(0, 160) },
      noticeNamesFile: typeof notice === "string" ? notice.includes("work_journal_000001.md") : null,
      noticeHasReadInstruction: typeof notice === "string" ? /completely, from its first line to its last/.test(notice) : null,
      markers, seenBeforeFirstText: seen(resultsBefore(firstText)), seenBeforeLastText: seen(resultsBefore(lastText)), seenInAllResults: seen(resultsBefore(-1)),
      toolCalls: events.filter((r) => r.trace_type === "tool_call").map((r) => `${r.tool_name} ${JSON.stringify(r.tool_args ?? {})}`.slice(0, 300)),
      texts: events.filter((r) => r.trace_type === "assistant").map((r) => String(r.content ?? "").slice(0, 300)),
      resultSizes: events.filter((r) => r.trace_type === "tool_result").map((r) => (typeof r.tool_result === "string" ? r.tool_result : JSON.stringify(r.tool_result ?? "")).length),
    };
    console.log("HANDOVER_READ_PROBE", JSON.stringify(summary, null, 1));
    if (EVIDENCE) {
      await fs.mkdir(EVIDENCE, { recursive: true });
      const tag = `${TARGET}${process.env.PROBE_TAG ? `-${process.env.PROBE_TAG}` : ""}`;
      await fs.writeFile(path.join(EVIDENCE, `${tag}-summary.json`), JSON.stringify(summary, null, 2));
      if (typeof notice === "string") await fs.writeFile(path.join(EVIDENCE, `${tag}-notice.txt`), notice.replaceAll(dataDir, "<DATA>"));
      await fs.writeFile(path.join(EVIDENCE, `${tag}-new-era-raw-traces.jsonl`), after.map((r) => JSON.stringify(r).replaceAll(dataDir, "<DATA>")).join("\n"));
    }
    expect(namedLines.length, "the previous era's journal needs more than one read").toBeGreaterThan(2000);
  }, 1_800_000);
});
