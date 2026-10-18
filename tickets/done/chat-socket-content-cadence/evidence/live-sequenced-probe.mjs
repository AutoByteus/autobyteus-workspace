#!/usr/bin/env node
// Temporary ticket probe (autobyteus-139, cases LIVE-TEAM / LIVE-ORG / LIVE-COLLAB). Not durable coverage.
//
// Starts the built server (`autobyteus-server-ts/dist/app.js`) on a test-owned data root and free port
// with a clean environment, creates definitions through GraphQL, runs real native-runtime agents on the
// local LM Studio model, and records every frame of the sequenced chat socket with monotonic timestamps.
//   team   : Team with members alpha+beta; both messaged at once (/ws/agent-team); a second socket opens
//            mid-stream (reconnect: its frames must start at its snapshot base + 1).
//   org    : Org with direct members alpha+beta; both messaged at once (/ws/agent-org); the cadence interval
//            is changed to 1000 ms mid-stream; the Org is stopped mid-answer.
//   collab : standalone PM delegates two tasks (delegate_task); /ws/agent-collaboration observes; then both
//            children are messaged at once; the root is stopped mid-answer.
// Output in --out: frames-<socket>.jsonl, summary.json, server.log.
//
// Usage: node live-sequenced-probe.mjs --server-dir <autobyteus-server-ts> --out <dir> --scenario team|org|collab
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const serverDir = path.resolve(arg("--server-dir"));
const outDir = path.resolve(arg("--out"));
const scenario = arg("--scenario");
let MODEL = "qwen/qwen3.6-35b-a3b:lmstudio@";
await mkdir(outDir, { recursive: true });
const t0 = performance.now();
const rel = () => Math.round((performance.now() - t0) * 10) / 10;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, label, timeoutMs = 120_000, step = 100) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { const v = await fn(); if (v) return v; await wait(step); }
  throw new Error(`Timed out: ${label}`);
};
const marks = [];
const soft = async (fn) => { try { return await fn(); } catch (e) { mark("soft-timeout", { error: String(e.message) }); return null; } };
const mark = (what, extra = {}) => { const m = { at: rel(), what, ...extra }; marks.push(m); console.log(JSON.stringify(m)); };

// ---------- server ----------
const root = await mkdtemp(path.join(os.tmpdir(), "abt139-live-"));
await mkdir(path.join(root, "home"), { recursive: true });
const workspace = path.join(root, "workspace");
await mkdir(workspace, { recursive: true });
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
let origin = null;
const gql = async (query, variables = {}, timeoutMs = null) => {
  const res = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}) });
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(body.errors).slice(0, 800)}`);
  return body.data;
};

// ---------- sockets ----------
const sockets = {};
const frames = {};
const openSocket = (name, route) => new Promise((resolve, reject) => {
  frames[name] = [];
  const ws = new WebSocket(`${origin.replace("http", "ws")}${route}`);
  ws.addEventListener("message", (ev) => {
    const at = rel();
    try { const m = JSON.parse(String(ev.data)); frames[name].push({ at, type: m.type, payload: m.payload }); } catch { /* ignore */ }
  });
  ws.addEventListener("open", () => { sockets[name] = ws; resolve(ws); }, { once: true });
  ws.addEventListener("error", () => reject(new Error(`socket ${name} error`)), { once: true });
});

// Normalized view of a sequenced frame: { first, through, kind, agent, items, status, isBatch }
const view = (f) => {
  if (f.type === "ROOT_EXECUTION_EVENT") {
    const p = f.payload; const e = p.event ?? {};
    if (e.kind === "agent_presentation_batch") {
      return { first: p.change_sequence, through: p.change_sequence_through, isBatch: true,
        items: e.items.map((i) => ({ agent: i.agent_run_id, segment: i.message.payload.segment_id, segType: i.message.payload.segment_type, delta: i.message.payload.delta })) };
    }
    if (e.kind === "agent_presentation") {
      const m = e.message;
      return { first: p.change_sequence, through: p.change_sequence, kind: m.type, agent: e.agent_run_id,
        status: m.type === "AGENT_STATUS" ? m.payload : undefined,
        content: m.type === "SEGMENT_CONTENT" ? { segment: m.payload.segment_id, delta: m.payload.delta } : undefined };
    }
    return { first: p.change_sequence, through: p.change_sequence, kind: `event:${e.kind}` };
  }
  if (f.type === "SEGMENT_CONTENT_BATCH") {
    const p = f.payload;
    return { first: p.change_sequence, through: p.change_sequence_through, isBatch: true,
      items: p.items.map((i) => ({ agent: i.agent_run_id, segment: i.segment_id, segType: i.segment_type, delta: i.delta })) };
  }
  const seq = f.payload?.change_sequence;
  if (typeof seq === "number") {
    return { first: seq, through: seq, kind: f.type, agent: f.payload.agent_run_id,
      status: f.type === "AGENT_STATUS" ? (({ change_sequence, ...rest }) => rest)(f.payload) : undefined,
      content: f.type === "SEGMENT_CONTENT" ? { segment: f.payload.segment_id, delta: f.payload.delta } : undefined };
  }
  return null;
};
const deepFind = (obj, key, depth = 0) => {
  if (!obj || typeof obj !== "object" || depth > 6) return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) { const r = deepFind(v, key, depth + 1); if (r !== undefined) return r; }
  return undefined;
};
const isSnapshot = (f) => f.type === "TEAM_EXECUTION_VIEW_SNAPSHOT" || f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT";
const contentDeltas = (name) => frames[name].flatMap((f) => {
  const v = view(f); if (!v) return [];
  if (v.isBatch) return v.items.map((i) => ({ at: f.at, ...i }));
  if (v.content) return [{ at: f.at, agent: v.agent, segment: v.content.segment, delta: v.content.delta }];
  return [];
});
const turnsCompleted = (name, agent) => frames[name].filter((f) => {
  if (f.type === "TURN_COMPLETED") return f.payload.agent_run_id === agent;
  const e = f.payload?.event; return f.type === "ROOT_EXECUTION_EVENT" && e?.kind === "agent_presentation"
    && e.message.type === "TURN_COMPLETED" && e.agent_run_id === agent;
}).length;
const firstContentAt = (name, agent) => contentDeltas(name).find((d) => d.agent === agent)?.at ?? null;

const analyze = (name) => {
  const list = frames[name] ?? [];
  const coverage = { snapshots: [], frames: 0, gaps: [], startsAfterSnapshot: [] };
  let next = null; let justSnap = false;
  for (const f of list) {
    if (isSnapshot(f)) { const base = deepFind(f.payload, "base_change_sequence"); coverage.snapshots.push({ at: f.at, base }); next = base + 1; justSnap = true; continue; }
    const v = view(f); if (!v) continue;
    coverage.frames += 1;
    if (justSnap) { coverage.startsAfterSnapshot.push({ expected: next, first: v.first }); justSnap = false; }
    if (next !== null && v.first !== next) coverage.gaps.push({ at: f.at, expected: next, first: v.first, through: v.through, type: f.type });
    next = v.through + 1;
  }
  // Batches
  const seqFrames = list.map((f, i) => ({ f, i, v: view(f) })).filter((x) => x.v);
  const batches = seqFrames.filter((x) => x.v.isBatch).map(({ f, i, v }) => {
    const nextSeq = seqFrames.find((y) => y.i > i);
    const boundary = nextSeq && nextSeq.f.at - f.at <= 5 ? nextSeq.f.type === "ROOT_EXECUTION_EVENT" ? (nextSeq.v.kind ?? "batch") : nextSeq.f.type : "window";
    const agents = [...new Set(v.items.map((it) => it.agent))];
    return { at: f.at, first: v.first, through: v.through, range: v.through - v.first + 1, items: v.items.length, agents: agents.length,
      chars: v.items.reduce((n, it) => n + it.delta.length, 0), closedBy: boundary, agentIds: agents };
  });
  const perAgent = {};
  for (const b of batches) for (const a of b.agentIds) (perAgent[a] ??= []).push(b);
  const spacing = Object.fromEntries(Object.entries(perAgent).map(([a, bs]) => {
    const windowGaps = []; for (let k = 1; k < bs.length; k++) if (bs[k].closedBy === "window" && bs[k - 1].closedBy === "window") windowGaps.push(Math.round(bs[k].at - bs[k - 1].at));
    const s = [...windowGaps].sort((x, y) => x - y);
    const active = bs.length > 1 ? (bs.at(-1).at - bs[0].at) / 1000 : 0;
    const windowFrames = bs.filter((b) => b.closedBy === "window").length;
    return [a, { batchesWithAgent: bs.length, windowClosed: windowFrames, boundaryClosed: bs.length - windowFrames,
      windowGapMs: s.length ? { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s.at(-1), under350: s.filter((g) => g < 350).length } : null,
      activeSeconds: Math.round(active * 10) / 10, windowFramesPerSecond: active ? Math.round((windowFrames / active) * 100) / 100 : null }];
  }));
  // Standalone (non-absorbed) status frames per agent, and identical repeats among them (UNK-001)
  const statusFrames = {};
  for (const { f, v } of seqFrames) if (v.status) (statusFrames[v.agent] ??= []).push({ at: f.at, status: v.status });
  const statusSummary = Object.fromEntries(Object.entries(statusFrames).map(([a, ss]) => {
    let identicalToPrevious = 0; for (let k = 1; k < ss.length; k++) if (JSON.stringify(ss[k].status) === JSON.stringify(ss[k - 1].status)) identicalToPrevious++;
    const values = ss.reduce((m, s) => ({ ...m, [s.status.status ?? JSON.stringify(s.status).slice(0, 40)]: (m[s.status.status] ?? 0) + 1 }), {});
    return [a, { standaloneStatusFrames: ss.length, identicalToPreviousForwarded: identicalToPrevious, byValue: values }];
  }));
  // Windows per agent vs standalone running statuses during streaming
  const plainContent = seqFrames.filter((x) => x.v.content).length;
  const typeCounts = list.reduce((m, f) => ({ ...m, [f.type === "ROOT_EXECUTION_EVENT" ? `REE:${f.payload.event?.kind}${f.payload.event?.message ? ":" + f.payload.event.message.type : ""}` : f.type]: (m[f.type === "ROOT_EXECUTION_EVENT" ? `REE:${f.payload.event?.kind}${f.payload.event?.message ? ":" + f.payload.event.message.type : ""}` : f.type] ?? 0) + 1 }), {});
  const text = {};
  for (const d of contentDeltas(name)) { const k = `${d.agent}|${d.segment}`; text[k] = (text[k] ?? "") + d.delta; }
  const lifecycle = list.filter((f) => f.type === "ROOT_LIFECYCLE" || f.type === "TEAM_RUN_LIFECYCLE").map((f) => ({ at: f.at, type: f.type, payload: f.payload }));
  const lastBatchBeforeLifecycleEnd = (() => {
    const end = list.findIndex((f) => (f.type === "ROOT_LIFECYCLE" && f.payload.is_active === false));
    if (end < 0) return null;
    const after = list.slice(end + 1).filter((f) => view(f)).length;
    const prev = list.slice(0, end).reverse().find((f) => view(f));
    return { lifecycleAt: list[end].at, framesAfterInactive: after, previousSequencedFrame: prev ? { type: prev.type, at: prev.at, gapMs: Math.round(list[end].at - prev.at), batch: !!view(prev)?.isBatch } : null };
  })();
  return { frames: list.length, typeCounts, coverage, batchCount: batches.length, multiAgentBatches: batches.filter((b) => b.agents > 1).length,
    plainSegmentContentFrames: plainContent, batchRange: (() => { const r = batches.map((b) => b.range).sort((x, y) => x - y); return r.length ? { min: r[0], median: r[Math.floor(r.length / 2)], max: r.at(-1), total: r.reduce((x, y) => x + y, 0) } : null; })(),
    closedByCounts: batches.reduce((m, b) => ({ ...m, [b.closedBy]: (m[b.closedBy] ?? 0) + 1 }), {}),
    spacing, statusSummary, lifecycle, stopCheck: lastBatchBeforeLifecycleEnd, batches, textBySegment: text };
};

const configOf = () => ({ workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: arg("--llm-config") ? JSON.parse(arg("--llm-config")) : null, autoExecuteTools: true, runtimeKind: "autobyteus" });
let config;
const agentDef = async (name, instructions, toolNames = []) => (await gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`,
  { i: { name, role: "assistant", description: `${name} (abt139 probe)`, instructions, category: "probe", toolNames, skillNames: [] } })).createAgentDefinition.id;
const WRITER = "Answer in plain prose paragraphs, no headings, no lists. Do not use tools.";
const PREFIX = arg("--prompt-prefix") ?? "";
const topicA = PREFIX + "Write a plain-prose essay of about 250 words about how lighthouses work. No headings, no lists.";
const topicB = PREFIX + "Write a plain-prose essay of about 250 words about how tides form. No headings, no lists.";
let failure = null;
const result = { scenario, model: MODEL, marks };
let rootTerminate = null;

try {
  origin = await waitFor(() => {
    if (child.exitCode !== null) throw new Error(`server exited: ${serverLog.slice(-1500)}`);
    if (!serverLog.includes("Server listening on")) return null;
    return [...serverLog.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].map((m) => m[1]);
  }, "server listening", 120_000);
  // The process also starts the agent-tools host on its own port; the main server is the one answering /rest/health.
  const candidates = origin;
  origin = await waitFor(async () => { for (const c of candidates) { try { if ((await fetch(`${c}/rest/health`)).ok) return c; } catch { /* next */ } } return null; }, "health", 60_000, 250);
  const cat = await gql(`mutation{ensureProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
  MODEL = cat.ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier).find((id) => id.startsWith(MODEL));
  if (!MODEL) throw new Error(`model missing: ${JSON.stringify(cat)}`);
  result.model = MODEL;
  const interval = await gql(`query{getServerSettings{key value}}`).then((d) => d.getServerSettings.find((s) => s.key === "AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS")?.value ?? "default(500)").catch(() => "unknown");
  config = configOf();
  mark("ready", { origin, interval, model: MODEL });

  if (scenario === "team") {
    const a = await agentDef("abt139 alpha", WRITER); const b = await agentDef("abt139 beta", WRITER);
    const team = (await gql(`mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}`, { i: {
      name: "abt139 team", description: "probe team", instructions: "Members answer the user directly.", coordinatorMemberName: "alpha",
      nodes: [{ memberName: "alpha", ref: a, refScope: "SHARED" }, { memberName: "beta", ref: b, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    const run = (await gql(`mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}`, { i: {
      teamDefinitionId: team, teamConfigs: [{ teamAddress: "/", ...config }],
      memberConfigs: [{ memberAddress: "/alpha", agentDefinitionId: a, ...config }, { memberAddress: "/beta", agentDefinitionId: b, ...config }] } })).createAgentTeamRun;
    if (!run.success) throw new Error(run.message);
    const tree = (await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: run.teamRunId })).getTeamRunResumeConfig.executionTree;
    const members = Object.fromEntries(tree.root_team.members.map((m) => [m.address.split("/").pop(), m.agent_run_id]));
    Object.assign(result, { rootId: run.teamRunId, members });
    rootTerminate = () => gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: run.teamRunId });
    await openSocket("S1", `/ws/agent-team/${run.teamRunId}`);
    await waitFor(() => frames.S1.some(isSnapshot), "S1 snapshot", 30_000);
    const send = (agent, content) => sockets.S1.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: agent,
      message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`, context_file_paths: [], image_urls: [], content } }));
    send(members.alpha, topicA); send(members.beta, topicB); mark("sent both");
    await waitFor(() => firstContentAt("S1", members.alpha) !== null && firstContentAt("S1", members.beta) !== null, "both streaming", 300_000);
    mark("both streaming");
    await wait(3_000);
    await openSocket("S2", `/ws/agent-team/${run.teamRunId}`); mark("S2 opened mid-stream");
    await soft(() => waitFor(() => turnsCompleted("S1", members.alpha) >= 1 && turnsCompleted("S1", members.beta) >= 1, "both turns done", 600_000, 250));
    await wait(1_500);
    // Final text from the server's member projections
    result.projections = {};
    for (const [name, id] of Object.entries(members)) {
      const p = (await gql(`query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}`, { t: run.teamRunId, a: id })).getTeamMemberRunProjection;
      result.projections[id] = JSON.stringify(p.conversation);
    }
  } else if (scenario === "org") {
    const a = await agentDef("abt139 org alpha", WRITER); const b = await agentDef("abt139 org beta", WRITER);
    const org = (await gql(`mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}`, { i: {
      name: "abt139 org", description: "probe org", instructions: "Members answer the user directly.",
      members: [{ memberName: "alpha", ref: a, refType: "AGENT", refScope: "SHARED" }, { memberName: "beta", ref: b, refType: "AGENT", refScope: "SHARED" }], handoffs: [] } })).createAgentOrgDefinition.id;
    const run = (await gql(`mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}`, { i: {
      agentOrgDefinitionId: org, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    if (!run.success) throw new Error(run.message);
    const tree = (await gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: run.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
    const members = Object.fromEntries(tree.rootOrg.members.map((m) => [m.address.split("/").pop(), { id: m.agentRunId, address: m.address }]));
    Object.assign(result, { rootId: run.agentOrgRunId, members });
    rootTerminate = () => gql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}`, { id: run.agentOrgRunId });
    await openSocket("S1", `/ws/agent-org/${run.agentOrgRunId}`);
    await waitFor(() => frames.S1.some(isSnapshot), "S1 snapshot", 30_000);
    const send = (agent, content) => sockets.S1.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org",
      root_run_id: run.agentOrgRunId, target_agent_run_id: agent, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(),
      content, context_file_paths: [], image_urls: [] } }));
    send(members.alpha.id, topicA.replace("250", "400")); send(members.beta.id, topicB.replace("250", "400")); mark("sent both");
    await waitFor(() => firstContentAt("S1", members.alpha.id) !== null && firstContentAt("S1", members.beta.id) !== null, "both streaming", 300_000);
    mark("both streaming");
    await wait(4_000);
    await gql(`mutation{updateServerSetting(key:"AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS", value:"1000")}`); mark("interval -> 1000");
    // Stop mid-answer: wait until text (not only reasoning) streams for both, plus a few seconds.
    const textStarted = () => contentDeltas("S1").filter((d) => frames.S1.length && true);
    await wait(8_000);
    await rootTerminate(); mark("org terminated mid-answer");
    await waitFor(() => frames.S1.some((f) => f.type === "ROOT_LIFECYCLE" && f.payload.is_active === false), "inactive lifecycle", 60_000);
    await wait(1_500);
    result.projections = {};
    for (const [name, m] of Object.entries(members)) {
      try {
        const p = (await gql(`query($o:String!,$ad:String!,$a:String!){getAgentOrgMemberRunProjection(orgRunId:$o,memberAddress:$ad,agentRunId:$a){conversation}}`,
          { o: run.agentOrgRunId, ad: m.address, a: m.id })).getAgentOrgMemberRunProjection;
        result.projections[m.id] = JSON.stringify(p.conversation);
      } catch (e) { result.projections[m.id] = `ERROR ${e.message}`; }
    }
    rootTerminate = null;
  } else if (scenario === "collab") {
    const workerName = "abt139 essay worker";
    await agentDef(workerName, WRITER);
    const pm = await agentDef("abt139 pm", "You coordinate work. When asked to call tools, call exactly the requested tools with the given arguments and nothing else.", ["list_available_agents"]);
    const run = (await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`, { i: { agentDefinitionId: pm, ...config } })).createAgentRun;
    if (!run.success) throw new Error(run.message);
    const pmId = run.runId; Object.assign(result, { rootId: pmId });
    rootTerminate = () => gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: pmId });
    await openSocket("PM", `/ws/agent/${pmId}`);
    await openSocket("S1", `/ws/agent-collaboration/${pmId}`);
    await waitFor(() => frames.S1.some(isSnapshot), "S1 snapshot", 30_000);
    const sendPm = (content) => sockets.PM.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `p-${randomUUID()}`,
      dedupe_key: `agent_run_input:p:${randomUUID()}`, context_file_paths: [], image_urls: [], content } }));
    const toolDone = (tool) => frames.PM.find((f) => f.type === "TOOL_EXECUTION_SUCCEEDED" && f.payload.tool_name === tool);
    sendPm("Call the list_available_agents tool exactly once now, then reply with one short sentence.");
    const listed = await waitFor(() => toolDone("list_available_agents"), "list_available_agents", 300_000);
    const listText = JSON.stringify(listed.payload);
    const addr = /"name\\?":\\?"abt139 essay worker\\?"[^}]*?"address\\?":\\?"([^"\\]+)/.exec(listText)?.[1]
      ?? /"address\\?":\\?"([^"\\]+)\\?"[^}]*?"name\\?":\\?"abt139 essay worker/.exec(listText)?.[1];
    if (!addr) throw new Error(`worker address not found in ${listText.slice(0, 600)}`);
    await waitFor(() => frames.PM.some((f) => f.type === "TURN_COMPLETED"), "PM turn 1 done", 300_000);
    mark("worker address", { addr });
    sendPm(`Call delegate_task two times now, in this same response, with these exact arguments: ` +
      `1) ${JSON.stringify({ recipient_address: addr, description: topicA })} ` +
      `2) ${JSON.stringify({ recipient_address: addr, description: topicB })}. Then reply with one short sentence.`);
    mark("delegation requested");
    const childIds = () => [...new Set(contentDeltas("S1").map((d) => d.agent).filter((a) => a !== pmId))];
    await waitFor(() => childIds().length >= 2, "two children streaming", 400_000, 250);
    mark("two children streaming", { children: childIds() });
    const [c1, c2] = childIds();
    result.members = { child1: c1, child2: c2 };
    await soft(() => waitFor(() => turnsCompleted("S1", c1) >= 1 && turnsCompleted("S1", c2) >= 1, "children done", 300_000, 250));
    mark("children turn 1 done");
    // Phase 2: message both children at once over the collaboration socket, then stop the root mid-answer.
    const sendChild = (agent, content) => sockets.S1.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent",
      root_run_id: pmId, target_agent_run_id: agent, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(),
      content, context_file_paths: [], image_urls: [] } }));
    const before1 = contentDeltas("S1").length;
    sendChild(c1, PREFIX + "Now write about 400 more words continuing the same topic. Plain prose."); sendChild(c2, PREFIX + "Now write about 400 more words continuing the same topic. Plain prose.");
    mark("phase2 sent to both children");
    await waitFor(() => { const d = contentDeltas("S1").slice(before1); return d.some((x) => x.agent === c1) && d.some((x) => x.agent === c2); }, "phase2 streaming", 300_000);
    mark("phase2 both streaming");
    await wait(8_000);
    await rootTerminate(); mark("root terminated mid-answer"); rootTerminate = null;
    await waitFor(() => frames.S1.some((f) => f.type === "ROOT_LIFECYCLE" && f.payload.is_active === false), "inactive lifecycle", 60_000);
    await wait(1_500);
    // Persisted per-child conversation (delegated children are root-hosted members of the PM's root).
    const addressOf = (id) => { for (const f of frames.S1) { const e = f.payload?.event; if (e?.kind === "agent_presentation_batch") { const it = e.items.find((i) => i.agent_run_id === id); if (it) return it.member_address; } if (e?.agent_run_id === id && e.member_address) return e.member_address; } return null; };
    result.projections = {};
    for (const id of [c1, c2]) {
      try { result.projections[id] = JSON.stringify((await gql(`query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}`,
        { h: pmId, m: addressOf(id), a: id })).agentRunCollaborationMemberProjection.conversation); }
      catch (e) { result.projections[id] = `ERROR ${e.message}`; }
    }
  } else if (scenario === "adopt") {
    // Round 2 (base feature next to the batch path): a run the user started by hand is adopted by the PM with a
    // Project Task (delegate_task {target_agent_run_id, task_id}); in the same PM response a fresh copy is delegated
    // (delegate_task {recipient_address}). Both then stream under the PM's root on /ws/agent-collaboration.
    const workerName = "abt139 essay worker";
    const worker = await agentDef(workerName, WRITER);
    const pm = await agentDef("abt139 pm", "You coordinate work. When asked to call tools, call exactly the requested tools with the given arguments and nothing else.", ["list_available_agents"]);
    const hand = (await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`, { i: { agentDefinitionId: worker, ...config } })).createAgentRun;
    if (!hand.success) throw new Error(hand.message);
    const handId = hand.runId;
    await openSocket("HAND", `/ws/agent/${handId}`);
    await waitFor(() => frames.HAND.some((f) => f.type === "AGENT_INPUT_STATE"), "hand snapshot", 20_000);
    sockets.HAND.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`,
      context_file_paths: [], image_urls: [], content: PREFIX + "Hello, this is the start of my own work. Reply with one short sentence." } }));
    await soft(() => waitFor(() => frames.HAND.some((f) => f.type === "TURN_COMPLETED"), "hand-started run answered", 300_000, 250));
    mark("hand-started run answered", { handId });
    try { sockets.HAND.close(); } catch { /* closing */ }
    const projectId = (await gql(`mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}`, { i: { name: "abt139 adoption project" } })).createProject.projectId;
    const taskDescription = topicA.replace(PREFIX, "");
    const taskId = (await gql(`mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}`, { i: { projectId, description: taskDescription } })).createProjectTask.taskId;
    const run = (await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`, { i: { agentDefinitionId: pm, ...config } })).createAgentRun;
    if (!run.success) throw new Error(run.message);
    const pmId = run.runId; Object.assign(result, { rootId: pmId, handId, projectId, taskId });
    rootTerminate = () => gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: pmId });
    await openSocket("PM", `/ws/agent/${pmId}`);
    const NO_COLLAB = process.argv.includes("--no-collab-socket");
    if (!NO_COLLAB) { await openSocket("S1", `/ws/agent-collaboration/${pmId}`); await waitFor(() => frames.S1.some(isSnapshot), "S1 snapshot", 30_000); }
    else { frames.S1 = []; }
    const addr = "/abt139_essay_worker";
    sockets.PM.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`,
      context_file_paths: [], image_urls: [], content: `Call delegate_task two times now, in this same response, with these exact arguments: ` +
        `1) ${JSON.stringify({ target_agent_run_id: handId, task_id: taskId })} ` +
        `2) ${JSON.stringify({ recipient_address: addr, description: topicB })}. Then reply with one short sentence.` } }));
    mark("adoption + delegation requested");
    if (NO_COLLAB) {
      // Without the collaboration socket: wait until the PM's own turn is done and the two runs had time to work.
      await soft(() => waitFor(() => frames.PM.some((f) => f.type === "TURN_COMPLETED"), "PM turn done", 300_000, 250));
      await wait(Number(arg("--work-ms") ?? 60_000));
    } else {
    const started = () => frames.S1.filter((f) => f.type === "ROOT_EXECUTION_EVENT" && f.payload.event?.kind === "task_execution_started").map((f) => f.payload.event.execution);
    await waitFor(() => started().length >= 2, "two task_execution_started", 400_000, 250);
    mark("task executions started", { executions: started() });
    const childIds = () => [...new Set(contentDeltas("S1").map((d) => d.agent).filter((a) => a !== pmId))];
    await waitFor(() => childIds().includes(handId) && childIds().length >= 2, "adopted run and copy streaming", 400_000, 250);
    const copyId = childIds().find((a) => a !== handId);
    result.members = { adopted: handId, copy: copyId };
    mark("adopted run and copy streaming", result.members);
    await soft(() => waitFor(() => turnsCompleted("S1", handId) >= 1 && turnsCompleted("S1", copyId) >= 1, "both turns done", 400_000, 250));
    mark("both turns done");
    await wait(1_500);
    const addressOf = (id) => { for (const f of frames.S1) { const e = f.payload?.event; if (e?.kind === "agent_presentation_batch") { const it = e.items.find((i) => i.agent_run_id === id); if (it) return it.member_address; } if (e?.agent_run_id === id && e.member_address) return e.member_address; } return null; };
    result.projections = {};
    for (const id of [handId, copyId]) {
      try { result.projections[id] = JSON.stringify((await gql(`query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}`,
        { h: pmId, m: addressOf(id), a: id })).agentRunCollaborationMemberProjection.conversation); }
      catch (e) { result.projections[id] = `ERROR ${e.message}`; }
    }
    }
    // Timed Stop of the PM root (the adoption round showed a terminate response that never returned).
    const tStart = Date.now();
    try { const r = await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: pmId }, 60_000); mark("terminate returned", { ms: Date.now() - tStart, result: r.terminateAgentRun }); }
    catch (e) { mark("terminate did not return", { ms: Date.now() - tStart, error: String(e?.message ?? e) }); }
    rootTerminate = null;
  } else if (scenario === "host-stop") {
    // Round 2 diagnosis: Stop (terminateAgentRun) a standalone run while its own LLM turn streams, with or without a
    // /ws/agent-collaboration subscriber, and time the GraphQL response.
    const pm = await agentDef("abt139 pm", WRITER);
    const run = (await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`, { i: { agentDefinitionId: pm, ...config } })).createAgentRun;
    if (!run.success) throw new Error(run.message);
    const pmId = run.runId; Object.assign(result, { rootId: pmId });
    rootTerminate = () => gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: pmId }, 60_000);
    await openSocket("PM", `/ws/agent/${pmId}`);
    await waitFor(() => frames.PM.some((f) => f.type === "AGENT_INPUT_STATE"), "pm snapshot", 20_000);
    if (!process.argv.includes("--no-collab-socket")) { await openSocket("S1", `/ws/agent-collaboration/${pmId}`); await waitFor(() => frames.S1.some(isSnapshot), "S1 snapshot", 30_000); }
    else frames.S1 = [];
    sockets.PM.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`,
      context_file_paths: [], image_urls: [], content: topicA.replace("250", "600") } }));
    await waitFor(() => frames.PM.some((f) => f.type === "SEGMENT_CONTENT"), "pm streaming", 300_000);
    mark("pm streaming");
    await wait(3_000);
    const tStart = Date.now();
    try { const r = await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: pmId }, 60_000); mark("terminate returned", { ms: Date.now() - tStart, result: r.terminateAgentRun }); }
    catch (e) { mark("terminate did not return", { ms: Date.now() - tStart, error: String(e?.message ?? e) }); }
    await wait(2_000);
    mark("pm socket after stop", { lastFrames: frames.PM.slice(-4).map((f) => f.type + (f.payload?.status ? ":" + f.payload.status : "")) });
    rootTerminate = null;
  } else throw new Error(`unknown scenario ${scenario}`);
} catch (e) {
  failure = String(e?.stack ?? e);
} finally {
  if (rootTerminate) { try { await rootTerminate(); } catch (e) { failure ??= `terminate: ${e}`; } }
  await wait(500);
  for (const ws of Object.values(sockets)) { try { ws.close(); } catch { /* closing */ } }
  const exited = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  await exited; clearTimeout(force);
}

for (const [name, list] of Object.entries(frames)) await writeFile(path.join(outDir, `frames-${name}.jsonl`), list.map((f) => JSON.stringify(f)).join("\n") + "\n");
await writeFile(path.join(outDir, "server.log"), serverLog);
const analyses = Object.fromEntries(Object.keys(frames).filter((n) => n !== "PM").map((n) => [n, analyze(n)]));
// Final text vs projection (text segments present in the projection JSON)
const textCheck = [];
for (const [segKey, txt] of Object.entries(analyses.S1?.textBySegment ?? {})) {
  const [agent] = segKey.split("|");
  const proj = result.projections?.[agent];
  if (!proj || proj.startsWith("ERROR")) { textCheck.push({ segKey, chars: txt.length, projection: proj ? proj.slice(0, 120) : "none" }); continue; }
  const esc = JSON.stringify(txt.trim()).slice(1, -1);
  textCheck.push({ segKey, chars: txt.length, inProjection: proj.includes(esc) });
}
const s2Check = analyses.S2 ? { startsAfterSnapshot: analyses.S2.coverage.startsAfterSnapshot, gaps: analyses.S2.coverage.gaps.length,
  sharedSegmentsSuffix: Object.entries(analyses.S2.textBySegment).map(([k, t]) => ({ k, s1Len: analyses.S1.textBySegment[k]?.length ?? 0, s2Len: t.length,
    s2IsSuffixOfS1: (analyses.S1.textBySegment[k] ?? "").endsWith(t) })) } : null;
const strip = (a) => { const { textBySegment, batches, ...rest } = a; return { ...rest, batchesSample: batches.slice(0, 40), batchesTotal: batches.length }; };
const summary = { ...result, failure, textCheck, s2Check, analyses: Object.fromEntries(Object.entries(analyses).map(([k, v]) => [k, strip(v)])) };
await writeFile(path.join(outDir, "projections.json"), JSON.stringify(result.projections ?? {}, null, 1));
delete summary.projections;
await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
await writeFile(path.join(outDir, "batches-S1.json"), JSON.stringify(analyses.S1?.batches ?? [], null, 1));
await rm(root, { recursive: true, force: true });
const brief = (a) => a && ({ frames: a.frames, gaps: a.coverage.gaps.length, snapshots: a.coverage.snapshots, startsAfterSnapshot: a.coverage.startsAfterSnapshot, batches: a.batchCount, multiAgentBatches: a.multiAgentBatches,
  plainContent: a.plainSegmentContentFrames, batchRange: a.batchRange, closedBy: a.closedByCounts, spacing: a.spacing, status: a.statusSummary, stopCheck: a.stopCheck });
console.log(JSON.stringify({ scenario, failure, S1: brief(analyses.S1), S2: brief(analyses.S2), s2Check, textCheck, rootRemoved: true }, null, 1));
process.exit(failure ? 1 : 0);
