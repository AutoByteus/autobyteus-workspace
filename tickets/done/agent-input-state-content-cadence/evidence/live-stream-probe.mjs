#!/usr/bin/env node
// Temporary ticket probe (PB-001, cases LIVE-01..LIVE-04). Not durable coverage.
//
// Starts the built server (`autobyteus-server-ts/dist/app.js`) on a test-owned data root
// and free port with a clean environment, creates a native AutoByteus agent on the local
// LM Studio model through GraphQL, and records every `/ws/agent/:runId` frame with a
// monotonic timestamp:
//   socket A connects first and sends message 1 (a long plain-text answer);
//   while turn 1 streams, A sends message 2 (it is queued: SCN-002 / AC-003);
//   then socket B subscribes mid-reply (snapshot on subscribe: SCN-003 / AC-004a);
//   the run is left to finish both turns, then terminated.
// Output: <out>/frames-A.jsonl, frames-B.jsonl, summary.json, server.log.
//
// Usage: node live-stream-probe.mjs --server-dir <autobyteus-server-ts> --out <dir> --label <name>
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const serverDir = path.resolve(arg("--server-dir"));
const outDir = path.resolve(arg("--out"));
const label = arg("--label") ?? "run";
const modelFragment = arg("--model") ?? "qwen3.6-35b-a3b";
await mkdir(outDir, { recursive: true });

const now = () => performance.now();
const t0 = now();
const rel = () => Math.round((now() - t0) * 10) / 10;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, labelText, timeoutMs = 60_000, stepMs = 50) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { const v = await fn(); if (v) return v; await wait(stepMs); }
  throw new Error(`Timed out: ${labelText}`);
};

const root = await mkdtemp(path.join(os.tmpdir(), "pb001-live-stream-"));
await mkdir(path.join(root, "home"), { recursive: true });
await mkdir(path.join(root, "workspace"), { recursive: true });
await writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");

const env = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
  .flatMap((k) => (process.env[k] === undefined ? [] : [[k, process.env[k]]])));
Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
  AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1234" });
let serverLog = "";
const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
  { env, cwd: serverDir, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", (d) => { serverLog += d.toString(); });
child.stderr.on("data", (d) => { serverLog += d.toString(); });

const sockets = {};
const frames = { A: [], B: [] };
const sent = [];
let runId = null;
let origin = null;
let failure = null;

const gql = async (query, variables = {}) => {
  const res = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }) });
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(body.errors)}`);
  return body.data;
};
const openSocket = (name) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${origin.replace("http", "ws")}/ws/agent/${runId}`);
  ws.addEventListener("message", (ev) => {
    const at = rel();
    let msg; try { msg = JSON.parse(String(ev.data)); } catch { return; }
    frames[name].push({ at, type: msg.type, payload: msg.payload });
  });
  ws.addEventListener("open", () => { sockets[name] = ws; resolve(ws); }, { once: true });
  ws.addEventListener("error", (e) => reject(new Error(`socket ${name} error ${e.message ?? ""}`)), { once: true });
});
const sendMessage = (name, content) => {
  const messageId = `probe-${randomUUID()}`;
  sent.push({ at: rel(), socket: name, content, messageId });
  sockets[name].send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: messageId,
    dedupe_key: `agent_run_input:probe:${messageId}`, context_file_paths: [], image_urls: [], content } }));
};
const turnsCompleted = (name) => frames[name].filter((f) => f.type === "TURN_COMPLETED").length;

try {
  origin = await waitFor(() => {
    if (child.exitCode !== null) throw new Error(`server exited: ${serverLog.slice(-2000)}`);
    const m = [...serverLog.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1);
    return m?.[1];
  }, "server listening", 120_000);
  await waitFor(async () => (await fetch(`${origin}/rest/health`)).ok, "health");

  // LM Studio is a discovered (local) provider: its catalog loads on demand, as the model picker does.
  const catalog = await gql(`mutation($p:String!,$r:String){ensureProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}`,
    { p: "LMSTUDIO", r: "autobyteus" });
  const ids = catalog.ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier);
  const model = ids.find((id) => id.includes(modelFragment));
  if (!model) throw new Error(`model ${modelFragment} not in catalog: ${ids.join(", ")}`);

  const def = await gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`, { i: {
    name: `pb001-live-stream-${randomUUID().slice(0, 8)}`, role: "assistant", description: "PB-001 live stream probe",
    instructions: "Answer in plain prose paragraphs. Do not use tools.", category: "probe", toolNames: [], skillNames: [] } });
  const created = await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`, { i: {
    agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: path.join(root, "workspace"),
    llmModelIdentifier: model, autoExecuteTools: false, llmConfig: null, runtimeKind: "autobyteus" } });
  if (!created.createAgentRun.success) throw new Error(`createAgentRun: ${created.createAgentRun.message}`);
  runId = created.createAgentRun.runId;

  await openSocket("A");
  await waitFor(() => frames.A.some((f) => f.type === "AGENT_INPUT_STATE"), "A snapshot", 10_000);
  sendMessage("A", "Write a plain-prose essay of about 350 words about how lighthouses work and their history. No headings, no lists.");
  // Queue message 2 once turn 1 has streamed text for ~1.5 s (still mid-reply).
  const firstContent = await waitFor(() => frames.A.find((f) => f.type === "SEGMENT_CONTENT"), "first content on A", 240_000);
  await waitFor(() => rel() - firstContent.at > 1_500, "1.5 s of streaming", 10_000);
  if (turnsCompleted("A") > 0) throw new Error("turn 1 finished before message 2 could be queued; use a longer prompt");
  sendMessage("A", "Now write a plain-prose paragraph of about 200 words about tides. No headings, no lists.");
  await wait(1_200);
  await openSocket("B");
  await waitFor(() => turnsCompleted("A") >= 2, "two completed turns on A", 480_000, 200);
  await wait(1_500);
} catch (error) {
  failure = String(error?.stack ?? error);
} finally {
  if (runId && origin) {
    try { await gql(`mutation($a:String!){terminateAgentRun(agentRunId:$a){success message}}`, { a: runId }); } catch (e) { failure ??= `terminate: ${e}`; }
  }
  await wait(500);
  for (const ws of Object.values(sockets)) { try { ws.close(); } catch { /* closing */ } }
  const exited = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  await exited; clearTimeout(force);
}

// ---- Analysis ----
const short = (f) => ({ ...f, payload: f.type === "SEGMENT_CONTENT" ? { ...f.payload, delta: undefined, delta_length: String(f.payload.delta ?? "").length } : f.payload });
for (const name of ["A", "B"]) {
  await writeFile(path.join(outDir, `frames-${name}.jsonl`), frames[name].map((f) => JSON.stringify(f)).join("\n") + "\n");
}
await writeFile(path.join(outDir, "server.log"), serverLog);

const analyze = (name) => {
  const list = frames[name];
  const inputStates = list.filter((f) => f.type === "AGENT_INPUT_STATE");
  const revisions = inputStates.map((f) => f.payload.revision);
  const repeats = revisions.filter((r, i) => i > 0 && r <= revisions[i - 1]).length;
  const content = list.filter((f) => f.type === "SEGMENT_CONTENT");
  // For each content frame: the gap from the previous content frame of the same segment, and
  // what (if anything) followed it within 5 ms (a FLUSH_THEN_FORWARD boundary forwards right after the flush).
  const bySegment = new Map();
  const flushes = [];
  list.forEach((f, i) => {
    if (f.type !== "SEGMENT_CONTENT") return;
    const id = f.payload.id;
    const prev = bySegment.get(id);
    bySegment.set(id, f);
    const next = list[i + 1];
    const trigger = next && next.type !== "SEGMENT_CONTENT" && next.at - f.at <= 5 ? next.type : "window";
    flushes.push({ at: f.at, segment: id, segment_type: f.payload.segment_type ?? null, gapFromPrevContentMs: prev ? Math.round(f.at - prev.at) : null,
      deltaLength: String(f.payload.delta ?? "").length, followedBy: trigger,
      followedByRevision: trigger === "AGENT_INPUT_STATE" ? next.payload.revision : undefined });
  });
  const triggerCounts = flushes.reduce((m, x) => ({ ...m, [x.followedBy]: (m[x.followedBy] ?? 0) + 1 }), {});
  const gaps = flushes.map((x) => x.gapFromPrevContentMs).filter((g) => g !== null);
  const windowGaps = flushes.filter((x) => x.gapFromPrevContentMs !== null && x.followedBy === "window").map((x) => x.gapFromPrevContentMs);
  const textBySegment = {};
  for (const f of content) textBySegment[f.payload.id] = (textBySegment[f.payload.id] ?? "") + String(f.payload.delta ?? "");
  const typeCounts = list.reduce((m, f) => ({ ...m, [f.type]: (m[f.type] ?? 0) + 1 }), {});
  const stat = (arr) => arr.length ? { n: arr.length, min: Math.min(...arr), median: [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)], max: Math.max(...arr),
    under350: arr.filter((g) => g < 350).length } : { n: 0 };
  return { frames: list.length, typeCounts, inputStateRevisions: revisions, inputStateRepeats: repeats,
    inputStates: inputStates.map((f) => ({ at: f.at, revision: f.payload.revision, entries: (f.payload.entries ?? []).map((e) => ({ state: e.state, content: String(e.content ?? "").slice(0, 40) })) })),
    contentFrames: content.length, contentGapStats: stat(gaps), windowGapStats: stat(windowGaps), flushTriggerCounts: triggerCounts,
    earlyFlushes: flushes.filter((x) => x.gapFromPrevContentMs !== null && x.gapFromPrevContentMs < 350),
    textLengthBySegment: Object.fromEntries(Object.entries(textBySegment).map(([k, v]) => [k, v.length])), textBySegment };
};
const A = analyze("A"), B = analyze("B");
// Message 2's queued revision on A: delay after send, and the frame immediately before it.
const send2 = sent[1];
const queuedFrameIndex = send2 ? frames.A.findIndex((f) => f.type === "AGENT_INPUT_STATE" && f.at >= send2.at
  && (f.payload.entries ?? []).some((e) => String(e.content ?? "").includes("tides"))) : -1;
const queued = queuedFrameIndex >= 0 ? frames.A[queuedFrameIndex] : null;
const beforeQueued = queuedFrameIndex > 0 ? frames.A[queuedFrameIndex - 1] : null;
const bFirst = frames.B[0] ?? null;
const bSnapshot = frames.B.find((f) => f.type === "AGENT_INPUT_STATE") ?? null;
const aRevisionsAfterBJoin = B.inputStateRevisions.length ? A.inputStateRevisions.filter((r) => r > B.inputStateRevisions[0]) : [];
const bRevisionsAfterSnapshot = B.inputStateRevisions.slice(1);
const sharedSegments = Object.keys(B.textBySegment).filter((id) => A.textBySegment[id] !== undefined);
const textMatches = sharedSegments.map((id) => ({ segment: id, aLen: A.textBySegment[id].length, bLen: B.textBySegment[id].length,
  bIsSuffixOfA: A.textBySegment[id].endsWith(B.textBySegment[id]), identical: A.textBySegment[id] === B.textBySegment[id] }));
const drop = (x) => { const { textBySegment, ...rest } = x; return rest; };
const summary = {
  label, failure, runId, origin, model: modelFragment, sent,
  socketA: drop(A), socketB: drop(B),
  queuedMessage: queued ? { sentAt: send2.at, inputStateAt: queued.at, delayMs: Math.round(queued.at - send2.at), revision: queued.payload.revision,
    entries: queued.payload.entries.map((e) => ({ state: e.state, content: String(e.content ?? "").slice(0, 40) })),
    frameBefore: beforeQueued ? { type: beforeQueued.type, at: beforeQueued.at, gapMs: Math.round((queued.at - beforeQueued.at) * 10) / 10 } : null } : null,
  reconnect: { firstFrameOnB: bFirst ? { type: bFirst.type, at: bFirst.at } : null, snapshotRevision: bSnapshot?.payload.revision ?? null,
    snapshotEntries: bSnapshot ? bSnapshot.payload.entries.map((e) => ({ state: e.state, content: String(e.content ?? "").slice(0, 40) })) : null,
    aRevisionsAfterBJoin, bRevisionsAfterSnapshot, bGotEveryLaterRevision: JSON.stringify(aRevisionsAfterBJoin) === JSON.stringify(bRevisionsAfterSnapshot) },
  textConsistencyAB: textMatches,
};
await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
await rm(root, { recursive: true, force: true });
console.log(JSON.stringify({ label, failure, A: { frames: A.frames, revisions: A.inputStateRevisions, repeats: A.inputStateRepeats, contentFrames: A.contentFrames, gaps: A.contentGapStats, triggers: A.flushTriggerCounts, early: A.earlyFlushes.length },
  B: { frames: B.frames, revisions: B.inputStateRevisions, repeats: B.inputStateRepeats, contentFrames: B.contentFrames, gaps: B.contentGapStats, triggers: B.flushTriggerCounts, early: B.earlyFlushes.length },
  queued: summary.queuedMessage, reconnect: summary.reconnect, text: textMatches, rootRemoved: true }, null, 2));
process.exit(failure ? 1 : 0);
