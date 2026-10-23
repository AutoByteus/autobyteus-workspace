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
import { until } from "../helpers/agy-runtime-error-fixture.js";

// task-agent-several-tasks (autobyteus-275) through the real Studio HTTP/WebSocket server, the Manager's scoped MCP session,
// Project/Task services, a standalone Agent root, exact delivery, closure publication and the AGY runtime with real CLI
// processes. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}`
// makes that agent call the actual tool and reply `CALLED:<result>`; anything else is answered `OK`. No provider inference.
// The Agent / Team / Org root journeys of AC-001, AC-003 and AC-004 are in task-existing-copy-assignment.e2e.test.ts.
// Cases: SEV-E2E-001 a parent and two parts on one Team copy (AC-002, AC-005: one stop, after the last close);
// SEV-E2E-002 sub-work joins the newest open Task and stops with it while the copy runs on (AC-006);
// SEV-E2E-003 a closed Task given back while another is open (AC-007);
// SEV-E2E-004 an idle-shut-down copy holding an open Task is given a second Task: the delivery wakes it (grace 60 s).
// Gate: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute path to tests/fixtures/agy-failure-cli.mjs>. About 3 minutes.
// Run: env -i PATH="$PATH" HOME="<resolved temp dir>" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-agent-several-tasks.e2e.test.ts --no-watch
// Optional TASK_AGENT_SEVERAL_TASKS_E2E_EVIDENCE_DIR: writes task-agent-several-tasks.json (results, messages, cleanup).
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
const GRACE_KEY = "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS";
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const keyOf = (ref: Record<string, any>) => ref.teamRunId ?? ref.team_run_id ? `team:${ref.teamRunId ?? ref.team_run_id}` : `agent:${ref.agentRunId ?? ref.agent_run_id}`;
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
/** Run IDs of the live scripted AGY processes (each AGY run works in `<memory>/…/<agentRunId>/agy-project`). */
const liveAgyRunIds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout)
  .map((out) => /([^/\n]+)\/agy-project\s*$/m.exec(out)?.[1] ?? "").filter(Boolean);
const processLive = (agentRunId: string) => liveAgyRunIds().includes(agentRunId);
/** Every node of a run tree that is a started copy (Agent or Team), with its delegator and members. */
const copyNodes = (tree: unknown): Array<Record<string, any>> => {
  const found: Array<Record<string, any>> = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, any>;
    const agentRunId = record.agentRunId ?? record.agent_run_id, teamRunId = record.teamRunId ?? record.team_run_id;
    if (typeof (record.startedAt ?? record.started_at) === "string" && (agentRunId || teamRunId)) {
      found.push({ ...(teamRunId ? { teamRunId } : { agentRunId }), address: record.address,
        delegatorAgentRunId: record.delegatorAgentRunId ?? record.delegator_agent_run_id,
        members: (record.members ?? []).map((m: any) => ({ address: m.address, agentRunId: m.agentRunId ?? m.agent_run_id })).filter((m: any) => m.agentRunId) });
    }
    Object.values(record).forEach(visit);
  };
  visit(tree);
  return found;
};

suite("A task agent with several Tasks: parts on one copy, sub-work ownership, give-back, wake (real HTTP/WS/scoped MCP, scripted AGY)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: string[] = [];
  const ids = { manager: "", worker: "", helper: "", squad: "" };
  const names = { worker: "", helper: "", squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  let projectId = "";
  let root!: { rootId: string; frames: Frame[]; calls: (content: string) => Promise<Record<string, any>>; conversationOf: (runId: string, address: string) => Promise<unknown>; tree: () => Promise<unknown> };

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (several Tasks E2E)`, instructions: "Follow the user's request.", toolNames } })).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const keyOfTask = new Map<string, string>();
  const k = (taskId: string) => keyOfTask.get(taskId)!;
  const createTask = async (description: string) => {
    const created = (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}`, { input: { projectId, description } })).createProjectTask;
    keyOfTask.set(created.taskId, created.taskKey);
    return created.taskId as string;
  };
  const ROOT_FIELDS = "kind ingressAgentRunId teamRunId start closed status";
  const taskOf = async (taskId: string) => ((await graphql(`query($id:String!){projectTasks(projectId:$id){taskId status root { ${ROOT_FIELDS} }}}`, { id: projectId }))
    .projectTasks as any[]).find((t) => t.taskId === taskId);
  const resourcesFile = (taskId: string) => path.join(dataDir, "projects", encodeURIComponent(projectId), "tasks", encodeURIComponent(taskId), "agent_run_resources.json");
  const entriesOf = async (taskId: string, key: string): Promise<Array<Record<string, any>>> => {
    const raw = await fs.readFile(resourcesFile(taskId), "utf8").catch(() => "");
    return raw ? (JSON.parse(raw).agentRunResources as any[]).filter((entry) => keyOf(entry.agentRun) === key) : [];
  };
  const closedFrame = (frame: Frame) => frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_closed";
  /** How many closure frames named the copy since a mark (each frame names the copies it closed). */
  const closuresOf = (key: string, from: number) => root.frames.slice(from).filter(closedFrame)
    .filter((frame) => (frame.payload.event.task_executions as any[]).some((ref) => keyOf(ref) === key)).length;
  const conversationText = async (runId: string, address: string) => JSON.stringify(await root.conversationOf(runId, address));
  const nodeOf = async (predicate: (node: Record<string, any>) => boolean, label: string) => {
    let node: Record<string, any> | undefined;
    await until(async () => (node = copyNodes(await root.tree()).find(predicate)) !== undefined, label, 60_000);
    return node!;
  };
  const argvLog = () => process.env["AGY_FAKE_ARGV_LOG"]!;
  const launchesOf = async (runId: string, from: number) => (await fs.readFile(argvLog(), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).slice(from)
    .map((line) => JSON.parse(line) as { argv: string[]; cwd: string }).filter((entry) => entry.cwd.endsWith(`/${runId}/agy-project`))
    .map((entry) => ({ resumed: entry.argv.includes("--conversation") }));
  const argvMark = async () => (await fs.readFile(argvLog(), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).length;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-several-tasks-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = path.join(dataDir, "agy-argv.jsonl");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.worker = `SEV Worker ${suffix}`; names.helper = `SEV Helper ${suffix}`; names.squad = `SEV Squad ${suffix}`;
    ids.manager = await agentDefinition(`SEV Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(names.worker, []);
    ids.helper = await agentDefinition(names.helper, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: `Several Tasks ${suffix}` } })).createProject.projectId;
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const rootId = created.runId as string;
    active.push(rootId);
    const input = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const view = await connect("agent-collaboration", rootId, (frames) => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const conversationOf = async (runId: string, address: string) => runId === rootId
      ? (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation
      : (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: runId })).agentRunCollaborationMemberProjection?.conversation;
    const calls = async (content: string) => {
      const before = calledResults(await conversationOf(rootId, "/")).length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: rootId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(rootId, "/")); return results.length > before; }, `Manager tool result for ${content.slice(0, 120)}`, 90_000);
      return toolResult(results[before]!);
    };
    const tree = async () => (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
    root = { rootId, frames: view.frames, calls, conversationOf, tree };
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const rootId of [...active]) {
      await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId }).catch((error) => errors.push(String(error)));
    }
    if (app) await app.close();
    const leftover = liveAgyRunIds().filter((runId) => JSON.stringify(evidence).includes(runId));
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_AGENT_SEVERAL_TASKS_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "task-agent-several-tasks.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  it("SEV-E2E-001: a parent and two of its parts given to one Team copy (each message names the other open Tasks); the parent's CANCELLED closes all three and stops the copy once, after the last (AC-002, AC-005)", async () => {
    const parent = await createTask("Cross-node collaboration (bigger Task).");
    const part1 = (await root.calls(callTool("create_task", { project_id: projectId, description: "Part 1: the relay.", part_of: parent }))).task.taskId as string;
    const part2 = (await root.calls(callTool("create_task", { project_id: projectId, description: "Part 2: the docs.", part_of: parent }))).task.taskId as string;
    // Tool results name Project Tasks by key; map the keys to their long IDs.
    const byKey = Object.fromEntries(((await graphql(`query($id:String!){projectTasks(projectId:$id){taskId taskKey}}`, { id: projectId })).projectTasks as any[]).map((t) => [t.taskKey, t.taskId]));
    for (const key of [part1, part2]) keyOfTask.set(byKey[key], key);
    const [p1, p2] = [byKey[part1], byKey[part2]];
    const delegated = await root.calls(callTool("delegate_task", { recipient_address: `/${segment(names.squad)}`, task_id: k(parent) }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
    const team = delegated.target_team_run_id as string, coordinator = delegated.target_team_coordinator_agent_run_id as string;
    const teamKey = `team:${team}`;
    const node = await nodeOf((n) => n.teamRunId === team, "Team copy in the tree");
    const coordinatorAddress = node.members.find((m: any) => m.agentRunId === coordinator)!.address as string;
    await until(async () => (await conversationText(coordinator, coordinatorAddress)).includes("Cross-node collaboration (bigger Task)."), "coordinator received the parent", 60_000);
    // AC-002: the parts reach the same copy by its team run id while the parent is open; each message names the open ones.
    const first = await root.calls(callTool("delegate_task", { target_team_run_id: team, task_id: part1 }));
    expect(first).toEqual({ delegated: true, target_kind: "team", target_team_run_id: team, target_team_coordinator_agent_run_id: coordinator });
    const second = await root.calls(callTool("delegate_task", { target_team_run_id: team, task_id: k(p2).toUpperCase() }));
    expect(second).toEqual({ delegated: true, target_kind: "team", target_team_run_id: team, target_team_coordinator_agent_run_id: coordinator });
    let text = "";
    await until(async () => (text = await conversationText(coordinator, coordinatorAddress)).includes(`New Task assigned to you: ${k(p2)}`), "coordinator received both parts", 60_000);
    expect(text).toContain(`New Task assigned to you: ${k(p1)}. Your Task ${k(parent)} is still open; name the Task key in each report.`);
    expect(text).toContain(`New Task assigned to you: ${k(p2)}. Your Tasks ${k(parent)}, ${k(p1)} are still open; name the Task key in each report.`);
    // REQ-003: every Task shows the copy, live.
    for (const taskId of [parent, p1, p2]) {
      await until(async () => (await taskOf(taskId)).root?.closed === false, `${k(taskId)} root is the live copy`, 30_000);
      expect((await taskOf(taskId)).root).toMatchObject({ kind: "team", teamRunId: team, ingressAgentRunId: coordinator, closed: false });
      expect((await entriesOf(taskId, teamKey)).map((e) => [e.role, e.closedAt])).toEqual([["assigned", null]]);
    }
    const listed = await root.calls(callTool("list_project_tasks", { project_id: projectId }));
    for (const taskId of [parent, p1, p2]) expect((listed.tasks as any[]).find((t) => t.taskId === k(taskId))!.assignments).toEqual([expect.objectContaining({ kind: "team", teamRunId: team })]);
    expect(processLive(coordinator)).toBe(true);

    // AC-005: the parent's CANCELLED closes both open parts; the copy is stopped once, after the last of the three.
    const from = root.frames.length;
    const cancelled = await root.calls(callTool("update_task", { task_id: k(parent), status: "CANCELLED" }));
    expect(cancelled.task).toMatchObject({ status: "CANCELLED", closedParts: [k(p1), k(p2)] });
    await until(() => !processLive(coordinator), "coordinator stopped after the last close", 30_000);
    await sleep(3_000);
    expect(closuresOf(teamKey, from)).toBe(1);
    for (const taskId of [parent, p1, p2]) {
      expect((await taskOf(taskId)).status).toBe("CANCELLED");
      expect((await entriesOf(taskId, teamKey))[0]!.closedAt).toEqual(expect.any(String));
    }
    evidence.parentAndParts = { team, coordinator, keys: [k(parent), k(p1), k(p2)], cancelled, closures: closuresOf(teamKey, from),
      messages: text.match(/New Task assigned to you: [^.]+\. Your Tasks? [^.]+ (?:is|are) still open; name the Task key in each report\./g) };
  }, 300000);

  let worker = "", workerAddress = "", taskA = "", taskB = "";

  it("SEV-E2E-002: sub-work started under the newest open Task belongs to it; closing that Task stops the sub-work while the copy runs on (AC-006, AC-003)", async () => {
    taskA = await createTask("Draft the migration guide.");
    // Task B's description makes the worker start sub-work (a description-only delegate_task) when it receives B.
    taskB = await createTask(callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Check the guide's links. Reply OK." }));
    const delegated = await root.calls(callTool("delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: k(taskA) }));
    expect(delegated).toMatchObject({ delegated: true, target_kind: "agent" });
    worker = delegated.target_agent_run_id as string;
    workerAddress = (await nodeOf((n) => n.agentRunId === worker, "worker in the tree")).address as string;
    await until(async () => (await conversationText(worker, workerAddress)).includes("Draft the migration guide."), "worker received A", 60_000);
    const assigned = await root.calls(callTool("delegate_task", { target_agent_run_id: worker, task_id: k(taskB) }));
    expect(assigned).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: worker });
    const helperNode = await nodeOf((n) => n.agentRunId && n.delegatorAgentRunId === worker, "the worker's sub-work in the tree");
    const helper = helperNode.agentRunId as string;
    const text = await conversationText(worker, workerAddress);
    expect(text).toContain(`New Task assigned to you: ${k(taskB)}. Your Task ${k(taskA)} is still open; name the Task key in each report.`);
    // The sub-work joined Task B (the newest open Task), not Task A.
    await until(async () => (await entriesOf(taskB, `agent:${helper}`)).length === 1, "sub-work recorded under Task B", 30_000);
    expect((await entriesOf(taskB, `agent:${helper}`))[0]).toMatchObject({ closedAt: null });
    expect(await entriesOf(taskA, `agent:${helper}`)).toEqual([]);
    await until(() => processLive(helper), "helper process live", 30_000);

    // Task B DONE: the sub-work is closed and stopped; the worker runs on with Task A and still takes messages.
    const from = root.frames.length;
    await root.calls(callTool("update_task", { task_id: k(taskB), status: "DONE" }));
    await until(() => closuresOf(`agent:${helper}`, from) >= 1, "sub-work closed with Task B", 60_000);
    await until(() => !processLive(helper), "helper process stopped", 30_000);
    await sleep(2_000);
    expect(closuresOf(`agent:${worker}`, from)).toBe(0);
    expect(processLive(worker)).toBe(true);
    expect((await entriesOf(taskB, `agent:${worker}`))[0]!.closedAt).toEqual(expect.any(String));
    expect((await entriesOf(taskA, `agent:${worker}`))[0]!.closedAt).toBeNull();
    expect((await taskOf(taskA)).root).toMatchObject({ kind: "agent", ingressAgentRunId: worker, closed: false });
    const stillOpen = await root.calls(callTool("send_message_to", { target_agent_run_id: worker, content: "Still on A? Marker STILL-A." }));
    expect(stillOpen).toMatchObject({ accepted: true });
    await until(async () => (await conversationText(worker, workerAddress)).includes("STILL-A"), "worker got the message", 30_000);
    evidence.subWork = { worker, helper, assigned, stillOpen, closuresOfWorker: closuresOf(`agent:${worker}`, from) };
  }, 300000);

  it("SEV-E2E-003: a closed Task given back while another is open; the copy is stopped once, after its last open Task closes (AC-007, AC-004)", async () => {
    // A DONE Task is not delegated (unchanged refusal); the Manager reopens it, then gives it back to the copy that runs on with A.
    const whileDone = await root.calls(callTool("delegate_task", { target_agent_run_id: worker, task_id: k(taskB) }));
    expect(whileDone).toEqual({ delegated: false, message: "The Task is DONE; set it to TODO or IN_PROGRESS before you delegate it." });
    await root.calls(callTool("update_task", { task_id: k(taskB), status: "TODO" }));
    const back = await root.calls(callTool("delegate_task", { target_agent_run_id: worker, task_id: k(taskB) }));
    expect(back).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: worker });
    await until(async () => (await entriesOf(taskB, `agent:${worker}`)).length === 2, "Task B open again on the worker", 30_000);
    const bEntries = await entriesOf(taskB, `agent:${worker}`);
    expect(bEntries.map((e) => e.closedAt === null)).toEqual([false, true]);
    let text = "";
    await until(async () => ((text = await conversationText(worker, workerAddress)).match(new RegExp(`New Task assigned to you: ${k(taskB)}`, "g")) ?? []).length === 2,
      "worker received Task B again", 60_000);
    expect(text.lastIndexOf(`New Task assigned to you: ${k(taskB)}. Your Task ${k(taskA)} is still open; name the Task key in each report.`)).toBeGreaterThan(text.indexOf("STILL-A"));
    expect(await taskOf(taskB)).toMatchObject({ root: { ingressAgentRunId: worker, closed: false } });
    // An open duplicate is refused as before.
    const duplicate = await root.calls(callTool("delegate_task", { target_agent_run_id: worker, task_id: k(taskB) }));
    expect(duplicate).toMatchObject({ delegated: false });
    // Close A (B still open): the worker runs on. Close B: stopped once.
    let from = root.frames.length;
    await root.calls(callTool("update_task", { task_id: k(taskA), status: "DONE" }));
    await sleep(2_000);
    expect(closuresOf(`agent:${worker}`, from)).toBe(0);
    expect(processLive(worker)).toBe(true);
    from = root.frames.length;
    await root.calls(callTool("update_task", { task_id: k(taskB), status: "CANCELLED" }));
    await until(() => !processLive(worker), "worker stopped after its last open Task", 30_000);
    await sleep(3_000);
    expect(closuresOf(`agent:${worker}`, from)).toBe(1);
    const fenced = await root.calls(callTool("send_message_to", { target_agent_run_id: worker, content: "Anyone?" }));
    expect(fenced).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    evidence.giveBack = { whileDone, back, duplicate, fenced, bEntries: bEntries.map((e) => ({ closedAt: e.closedAt })) };
  }, 300000);

  it("SEV-E2E-004: a copy shut down while idle, holding an open Task, is given a second Task: the delivery wakes it with its conversation", async () => {
    // The shortest grace (60 s), read when the copy's idle timer arms.
    const set = (await graphql(`mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}`, { k: GRACE_KEY, v: "60000" })).updateServerSetting;
    expect(String(set)).toMatch(/updated/i);
    const first = await createTask("Sleepy work: reply OK.");
    const next = await createTask("Second Task for the sleeping copy.");
    const delegated = await root.calls(callTool("delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: k(first) }));
    const sleeper = delegated.target_agent_run_id as string;
    const address = (await nodeOf((n) => n.agentRunId === sleeper, "sleeper in the tree")).address as string;
    await until(async () => (await conversationText(sleeper, address)).includes("Sleepy work"), "sleeper received its Task", 60_000);
    await until(() => processLive(sleeper), "sleeper process live", 30_000);
    await until(() => !processLive(sleeper), "sleeper shut down after the idle grace", 120_000);
    expect((await entriesOf(first, `agent:${sleeper}`))[0]!.closedAt).toBeNull();
    const argvFrom = await argvMark();
    const assigned = await root.calls(callTool("delegate_task", { target_agent_run_id: sleeper, task_id: k(next) }));
    expect(assigned).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: sleeper });
    await until(async () => (await conversationText(sleeper, address)).includes(`New Task assigned to you: ${k(next)}. Your Task ${k(first)} is still open; name the Task key in each report.`),
      "the woken copy received the second Task", 90_000);
    await until(() => processLive(sleeper), "sleeper process live again", 30_000);
    expect(await launchesOf(sleeper, argvFrom)).toEqual([{ resumed: true }]);
    for (const taskId of [first, next]) expect((await taskOf(taskId)).root).toMatchObject({ ingressAgentRunId: sleeper, closed: false });
    await graphql(`mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}`, { k: GRACE_KEY, v: "600000" });
    evidence.wake = { sleeper, assigned, keys: [k(first), k(next)] };
  }, 300000);
});
