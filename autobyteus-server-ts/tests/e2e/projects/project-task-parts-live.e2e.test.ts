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
import { ProjectChangeMessageSchema } from "../../../src/projects/changes/project-change-messages.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// task-part-of AC-018, AC-008, AC-007 (live), AC-003 / AC-014 (Temp tasks) and AC-006 through the real Studio HTTP/WebSocket
// server, the Manager's scoped Agent Tools MCP session, the Project/Task services, live delegated task agents and the
// `/ws/projects` feed. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs): `CALL_TOOL:{...}` makes the
// agent call that actual tool and reply `CALLED:<result>`. No provider inference. One standalone Agent root: the cascade is
// owned by the Task service, not the root kind (the sibling suites cover closure in every root).
// Gate: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute path to tests/fixtures/agy-failure-cli.mjs>.
// Run: env -i PATH="$PATH" HOME="<resolved temp dir>" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-parts-live.e2e.test.ts --no-watch
// Optional TASK_PARTS_LIVE_E2E_EVIDENCE_DIR: writes project-task-parts-live.json (results, frames, cleanup).
// Cases: POF-LIVE-001 a parent's CANCELLED and DONE close its open parts (one with a really running task agent, stopped),
// list them in closedParts, leave closed parts alone, reopen changes nothing, a part's close never changes its parent, and the
// feed carries partOfTaskId on create, re-parent, cascade and delete cleanup. POF-LIVE-002 Temp tasks have no parent and are
// no parent. POF-LIVE-003 every feed frame of the run satisfies the strict server schema.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> } & Record<string, any>;
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const stringsIn = (value: unknown): string[] => typeof value === "string" ? [value]
  : Array.isArray(value) ? value.flatMap(stringsIn) : value && typeof value === "object" ? Object.values(value).flatMap(stringsIn) : [];
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const found = stringsIn(entry).find((text) => text.includes("CALLED:"));
  return found ? [found.slice(found.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, ...(raw.isError ? { isError: true } : {}) };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called }; }
};
/** Working directories of the live scripted AGY processes (one per running agent: `memory/agents/<run>/agy-project`). */
const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout);

suite("Project Task parts: a parent's close stops its parts' live task agents; the feed carries the parent (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: string[] = [];
  const ids = { manager: "", worker: "" };
  let workerName = "";
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  const feedRaw: string[] = [];
  const feedFrames: Frame[] = [];
  let projectId = "";
  let manager!: {
    rootId: string; view: { frames: Frame[] };
    calls: (content: string) => Promise<Record<string, any>>;
    conversationOf: (agentRunId: string, address: string) => Promise<unknown>;
  };

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (Task parts live E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const terminate = async (rootId: string) => {
    const result = (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
    active.splice(active.indexOf(rootId), 1);
  };
  const TASK_FIELDS = "taskId taskKey status partOfTaskId dependsOnTaskIds updatedAt";
  const tasks = async () => (await graphql(`query($id:String!){projectTasks(projectId:$id){${TASK_FIELDS}}}`, { id: projectId })).projectTasks as any[];
  const task = async (reference: string) => (await tasks()).find((t) => t.taskId === reference || t.taskKey === reference);
  const taskDir = (taskId: string) => path.join(dataDir, "projects", projectId, "tasks", taskId);
  const workerEntry = async (taskId: string, worker: string) => JSON.parse(await fs.readFile(path.join(taskDir(taskId), "agent_run_resources.json"), "utf8"))
    .agentRunResources.find((entry: any) => entry.agentRun.agentRunId === worker);
  const upserts = (taskId: string, from = 0) => feedFrames.slice(from).filter((f) => f.type === "task_upserted" && f.task.taskId === taskId).map((f) => f.task);
  const closedFrame = (frame: Frame) => frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_closed";
  const closedRunIds = (frames: Frame[]) => frames.filter(closedFrame).flatMap((frame) => (frame.payload.event.task_executions as any[]).map((ref) => ref.agentRunId ?? ref.agent_run_id));
  const workerAddress = () => `/${segment(workerName)}`;

  /** The Manager delegates the Task to the worker catalog agent; returns the new task agent once its process runs. */
  const delegateRunning = async (taskKey: string, marker: string) => {
    const delegated = await manager.calls(callTool("delegate_task", { recipient_address: workerAddress(), task_id: taskKey }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    const worker = delegated.target_agent_run_id as string;
    await manager.calls(callTool("send_message_to", { target_agent_run_id: worker, content: `Keep working. Marker ${marker}.` }));
    await until(async () => JSON.stringify(await manager.conversationOf(worker, workerAddress())).includes(marker), `${taskKey} worker got its message`, 60_000);
    await until(() => liveAgyCwds().some((cwd) => cwd.includes(worker)), `${taskKey} worker process is live`, 30_000);
    expect((await workerEntry((await task(taskKey)).taskId, worker))?.closedAt).toBeNull();
    return worker;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-parts-live-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    workerName = `POF Worker ${suffix}`;
    ids.manager = await agentDefinition(`POF Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(workerName, []);
    // A raw /ws/projects client, as the app's board holds one.
    const feed = new WebSocket(`ws://${url.host}/ws/projects`);
    sockets.push(feed);
    feed.on("message", (raw: unknown) => { const text = String(raw); feedRaw.push(text); feedFrames.push(JSON.parse(text)); });
    await new Promise<void>((resolve, reject) => { feed.once("open", resolve); feed.once("error", reject); });
    await until(() => feedFrames.some((f) => f.type === "connected"), "projects feed connected");
    projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Parts Live ${suffix}` } })).createProject.projectId as string;
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const rootId = created.runId as string;
    active.push(rootId);
    const input = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const view = await connect("agent-collaboration", rootId, (frames) => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const conversationOf = async (agentRunId: string, address: string) => agentRunId === rootId
      ? (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation
      : (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    const calls = async (content: string) => {
      const before = calledResults(await conversationOf(rootId, "/")).length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: rootId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(rootId, "/")); return results.length > before; },
        `Manager tool result for ${content.slice(0, 120)}`, 60_000);
      return toolResult(results[before]!);
    };
    manager = { rootId, view, calls, conversationOf };
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const rootId of [...active]) await terminate(rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    const liveAfter = liveAgyCwds().filter((cwd) => cwd.includes(dataDir));
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_PARTS_LIVE_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "project-task-parts-live.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, liveAgyProcessesOfThisRun: liveAfter.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  it("POF-LIVE-001: a parent's CANCELLED, then another parent's DONE, close their open parts (stopping a really running task agent), list them in closedParts and update the feed; closed parts, reopen and a part's own close change nothing; re-parent and delete cleanup are live (AC-018, AC-008, AC-007, AC-006)", async () => {
    const ack = (taskId: string, status: string, partOf: string | null, extra: Record<string, unknown> = {}) =>
      ({ task: { projectId, taskId, status, dependsOn: [], partOf, ...extra } });
    // The Manager creates the bigger Task and its parts through its own tools (by key, in another letter case).
    const parent = (await manager.calls(callTool("create_task", { project_id: projectId, description: "P: cross-node collaboration" }))).task;
    const P = parent.taskId as string;
    const make = async (description: string, partOf: string) => (await manager.calls(callTool("create_task", { project_id: projectId, description, part_of: partOf }))).task.taskId as string;
    const A = await make("A: transport (delegated)", P.toUpperCase());
    const B = await make("B: protocol notes", P);
    const C = await make("C: discovery (done)", P);
    const D = await make("D: dropped idea", P);
    const longP = (await task(P)).taskId as string;
    // AC-008 (create): every part's task_upserted carries its parent.
    for (const key of [A, B, C, D]) {
      const longId = (await task(key)).taskId as string;
      await until(() => upserts(longId).some((t) => t.partOfTaskId === longP), `feed: ${key} created with its parent`, 30_000);
    }
    expect(await manager.calls(callTool("update_task", { task_id: C, status: "DONE" }))).toEqual(ack(C, "DONE", P));
    expect(await manager.calls(callTool("update_task", { task_id: D, status: "CANCELLED" }))).toEqual(ack(D, "CANCELLED", P));
    // A is In Progress with a really running task agent; B stays To Do.
    const workerA = await delegateRunning(A, "PRE-CASCADE-A");
    expect(await manager.calls(callTool("update_task", { task_id: A, status: "IN_PROGRESS" }))).toEqual(ack(A, "IN_PROGRESS", P));
    const ids = Object.fromEntries(await Promise.all([A, B, C, D].map(async (key) => [key, (await task(key)).taskId as string])));
    const closedFilesBefore = await Promise.all([C, D].map((key) => fs.readFile(path.join(taskDir(ids[key]!), "task.json"), "utf8")));

    // AC-018 (CANCELLED): the open parts take CANCELLED; the result lists them in key order.
    let from = manager.view.frames.length, feedFrom = feedFrames.length;
    const cancelled = await manager.calls(callTool("update_task", { task_id: P, status: "CANCELLED" }));
    expect(cancelled).toEqual(ack(P, "CANCELLED", null, { closedParts: [A, B] }));
    // The running part's task agent is closed (live closure event, closed entry) and its process stops.
    await until(() => closedRunIds(manager.view.frames.slice(from)).includes(workerA), "live task_executions_closed for the part's task agent", 60_000);
    expect((await workerEntry(ids[A]!, workerA))?.closedAt).toEqual(expect.any(String));
    await until(() => liveAgyCwds().every((cwd) => !cwd.includes(workerA)), "no live process of the part's task agent after the parent's CANCELLED", 30_000);
    const fenced = await manager.calls(callTool("send_message_to", { target_agent_run_id: workerA, content: "Still there?" }));
    expect(fenced).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    // Statuses: open parts CANCELLED, the Done and Cancelled parts untouched (same bytes), and the feed shows each change live.
    expect(Object.fromEntries(await Promise.all([P, A, B, C, D].map(async (key) => [key, (await task(key)).status])))).toEqual(
      { [P]: "CANCELLED", [A]: "CANCELLED", [B]: "CANCELLED", [C]: "DONE", [D]: "CANCELLED" });
    expect(await Promise.all([C, D].map((key) => fs.readFile(path.join(taskDir(ids[key]!), "task.json"), "utf8")))).toEqual(closedFilesBefore);
    await until(() => [longP, ids[A]!, ids[B]!].every((id) => upserts(id, feedFrom).some((t) => t.status === "CANCELLED")), "feed: parent and open parts CANCELLED", 30_000);
    for (const id of [ids[A]!, ids[B]!]) expect(upserts(id, feedFrom).at(-1)).toMatchObject({ status: "CANCELLED", partOfTaskId: longP });
    expect(upserts(ids[C]!, feedFrom).concat(upserts(ids[D]!, feedFrom))).toEqual([]);
    evidence.cancel = { parent: P, parts: { A, B, C, D }, workerA, cancelled, fenced };

    // Reopening the parent changes no part (no closedParts), and nothing restarts.
    feedFrom = feedFrames.length;
    expect(await manager.calls(callTool("update_task", { task_id: P, status: "TODO" }))).toEqual(ack(P, "TODO", null));
    expect([(await task(A)).status, (await task(B)).status]).toEqual(["CANCELLED", "CANCELLED"]);
    await until(() => upserts(longP, feedFrom).some((t) => t.status === "TODO"), "feed: parent reopened", 30_000);
    expect(upserts(ids[A]!, feedFrom).concat(upserts(ids[B]!, feedFrom))).toEqual([]);
    expect(liveAgyCwds().some((cwd) => cwd.includes(workerA))).toBe(false);

    // AC-018 (DONE) on a second parent: its running part's task agent stops and its To Do part is DONE as well.
    const Q = (await manager.calls(callTool("create_task", { project_id: projectId, description: "Q: release the bigger Task" }))).task.taskId as string;
    const E = await make("E: build (delegated)", Q);
    const F = await make("F: notes", Q);
    const workerE = await delegateRunning(E, "PRE-CASCADE-E");
    await manager.calls(callTool("update_task", { task_id: E, status: "IN_PROGRESS" }));
    from = manager.view.frames.length; feedFrom = feedFrames.length;
    const done = await manager.calls(callTool("update_task", { task_id: Q, status: "DONE" }));
    expect(done).toEqual(ack(Q, "DONE", null, { closedParts: [E, F] }));
    await until(() => closedRunIds(manager.view.frames.slice(from)).includes(workerE), "live task_executions_closed for E's task agent", 60_000);
    const longE = (await task(E)).taskId as string, longF = (await task(F)).taskId as string, longQ = (await task(Q)).taskId as string;
    expect((await workerEntry(longE, workerE))?.closedAt).toEqual(expect.any(String));
    await until(() => liveAgyCwds().every((cwd) => !cwd.includes(workerE)), "no live process of E's task agent after the parent's DONE", 30_000);
    expect([(await task(E)).status, (await task(F)).status]).toEqual(["DONE", "DONE"]);
    await until(() => [longQ, longE, longF].every((id) => upserts(id, feedFrom).some((t) => t.status === "DONE")), "feed: parent and parts DONE", 30_000);
    evidence.done = { parent: Q, parts: { E, F }, workerE, done };

    // AC-006: a part's own close never changes its parent (R stays TODO; no closedParts).
    const R = (await manager.calls(callTool("create_task", { project_id: projectId, description: "R: still open" }))).task.taskId as string;
    const H = await make("H: last slice", R);
    expect(await manager.calls(callTool("update_task", { task_id: H, status: "DONE" }))).toEqual(ack(H, "DONE", R));
    expect((await task(R)).status).toBe("TODO");

    // AC-008 (re-parent): moving B to Q is live.
    feedFrom = feedFrames.length;
    expect(await manager.calls(callTool("update_task", { task_id: B, part_of: Q }))).toEqual(ack(B, "CANCELLED", Q));
    await until(() => upserts(ids[B]!, feedFrom).some((t) => t.partOfTaskId === longQ), "feed: B re-parented to Q", 30_000);

    // AC-007 / AC-008 (delete cleanup): deleting Q removes it live; its parts stay, without a parent, updatedAt kept.
    const partsBefore = Object.fromEntries(await Promise.all([longE, longF, ids[B]!].map(async (id) => [id, await task(id)])));
    feedFrom = feedFrames.length;
    expect((await graphql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`, { input: { projectId, taskId: longQ } })).deleteProjectTask).toBe(true);
    await until(() => feedFrames.slice(feedFrom).some((f) => f.type === "task_removed" && f.taskId === longQ), "feed: Q removed", 30_000);
    await until(() => [longE, longF, ids[B]!].every((id) => upserts(id, feedFrom).some((t) => t.partOfTaskId === null)), "feed: Q's parts republished without a parent", 30_000);
    for (const id of [longE, longF, ids[B]!]) {
      expect(await task(id)).toEqual({ ...partsBefore[id], partOfTaskId: null });
      expect(upserts(id, feedFrom).at(-1)).toMatchObject({ partOfTaskId: null, updatedAt: partsBefore[id].updatedAt });
    }
    const listed = await manager.calls(callTool("list_project_tasks", { project_id: projectId }));
    const byKey = Object.fromEntries((listed.tasks as any[]).map((t) => [t.taskId, { status: t.status, partOf: t.partOf, parts: t.parts }]));
    expect(byKey[P]).toEqual({ status: "TODO", partOf: null, parts: [A, C, D] });
    expect(byKey[E]).toEqual({ status: "DONE", partOf: null, parts: [] });
    expect(byKey[R]).toEqual({ status: "TODO", partOf: null, parts: [H] });
    evidence.listedAfterDelete = byKey;
  }, 600000);

  it("POF-LIVE-002: a Temp task has no parent and is no parent: both refused with TASK_PARENT_INVALID, nothing written (AC-003, AC-014)", async () => {
    const described = await manager.calls(callTool("delegate_task", { recipient_address: workerAddress(), description: "Reply OK." }));
    const adHocTaskId = AD_HOC_ID.exec(JSON.stringify(described))?.[0] as string;
    expect(adHocTaskId, JSON.stringify(described)).toBeTruthy();
    const adHocDir = path.join(dataDir, "ad-hoc-tasks", adHocTaskId);
    const adHocEntries = async () => (await fs.readdir(adHocDir)).filter((name) => !name.endsWith(".lock")).sort();
    await until(async () => (await adHocEntries()).length === 2, "ad-hoc Task folder settled", 10_000);
    const adHocBefore = await fs.readFile(path.join(adHocDir, "task.json"), "utf8");
    const projectTasksBefore = await tasks();
    const someTask = projectTasksBefore[0].taskKey as string;
    const onTemp = await manager.calls(callTool("update_task", { task_id: adHocTaskId, part_of: someTask }));
    expect(onTemp).toMatchObject({ isError: true, error: { code: "TASK_PARENT_INVALID", message: "Only Project Tasks have a parent; this Task has no Project." } });
    const clearOnTemp = await manager.calls(callTool("update_task", { task_id: adHocTaskId, part_of: "" }));
    expect(clearOnTemp).toMatchObject({ isError: true, error: { code: "TASK_PARENT_INVALID" } });
    const createUnder = await manager.calls(callTool("create_task", { project_id: projectId, description: "never created", part_of: adHocTaskId }));
    expect(createUnder).toMatchObject({ isError: true, error: { code: "TASK_PARENT_INVALID", message: `Task '${adHocTaskId}' is not a current Task of this Project.` } });
    const moveUnder = await manager.calls(callTool("update_task", { task_id: someTask, part_of: adHocTaskId }));
    expect(moveUnder).toMatchObject({ isError: true, error: { code: "TASK_PARENT_INVALID" } });
    expect(await fs.readFile(path.join(adHocDir, "task.json"), "utf8")).toBe(adHocBefore);
    expect(await adHocEntries()).toEqual(["agent_run_resources.json", "task.json"]);
    expect(await tasks()).toEqual(projectTasksBefore);
    // A text patch on the Temp task still works and its result has no Project fields.
    expect(await manager.calls(callTool("update_task", { task_id: adHocTaskId, description: "Patched text" }))).toEqual({ task: { projectId: null, taskId: adHocTaskId, status: expect.any(String) } });
    evidence.temp = { adHocTaskId, onTemp, clearOnTemp, createUnder, moveUnder };
  }, 300000);

  it("POF-LIVE-003: every /ws/projects frame of this run satisfies the strict server schema, and every Project Task view carries partOfTaskId", () => {
    const invalid = feedRaw.filter((text) => !ProjectChangeMessageSchema.safeParse(JSON.parse(text)).success);
    expect(invalid).toEqual([]);
    const projectTaskViews = feedFrames.filter((f) => f.type === "task_upserted" && f.task.projectId === projectId).map((f) => f.task);
    expect(projectTaskViews.length).toBeGreaterThan(10);
    expect(projectTaskViews.every((view) => Object.hasOwn(view, "partOfTaskId"))).toBe(true);
    evidence.feed = { frames: feedFrames.length, projectTaskUpserts: projectTaskViews.length, types: [...new Set(feedFrames.map((f) => f.type))].sort() };
  });
});
