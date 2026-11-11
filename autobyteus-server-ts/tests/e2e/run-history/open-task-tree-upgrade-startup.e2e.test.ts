import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { calledResults, segment, taskAgentsIn, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { PARTICIPANT_MESSAGES_QUERY } from "../../helpers/collaboration-participant-messages.js";

// autobyteus-469 (a top run's tree is built from its open Tasks; no stored list of local delegated runs) through the BUILT
// Studio server (`dist/app.js`), real HTTP/GraphQL/WebSocket, scripted MCP tools and real server restarts. Only the external
// AGY CLI is scripted (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`): `CALL_TOOL:{...}` makes an agent call the real
// tool; `AGY_FAKE_REPLY_USAGE` makes every reply record token usage. No provider inference.
// One data root holds a standalone Agent run, an Agent Team run and an Agent Org run. Each Manager delegates three Tasks:
// one is closed (its run leaves the tree), one stays open, and one later loses its Task record (as a run delegated before
// Task records existed). Then the tree files get the entries an older build stored (hand-built, released key sets; shapes as
// inventoried in tickets/.../evidence/unlink-cases-2026-11-10.txt; never user data): links to the three runs, a link and a full
// record whose runs have no own file, an older Org link in a configured Team's list, and (Agent) a link to a run on another node.
// - OT-1 (AC-001, AC-006, AC-011, AC-012): a closure removes the run from the tree and the run never appears in the tree file;
//   the Manager's Team tab keeps its message to the closed run, named from the run's own file; the Agent run's token total
//   and the Memory page keep the closed run.
// - OT-2 (AC-008, AC-009, AC-010, AC-005, AC-012): a server start admits the Team and Org runs whose trees list local runs;
//   the trees hold the open runs (and the link to the other node) only; reading writes nothing; loading and using the runs
//   reads no file of a closed run; the first save keeps only the remote link, the full record and the link without own file,
//   unchanged and in place; own files are byte-identical; the run without a Task record is in no tree, its folder unchanged,
//   and listed on the Memory page; the token total no longer counts it (DEC-008). The closed runs' own files are unreadable
//   while the runs load and work; a positive control (the Team tab names a closed run from its own file) shows such a read
//   would be reported. After the restart the Team tab still names the closed run (AC-011).
// - OT-3 (AC-005): a Task record that cannot be read hides its run with a warning naming the Task; after the file is restored
//   and the server restarts, the run (of a temporary Task left open) is back.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree (a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
// The POSIX mode-bit block of OT-2's read check: root ignores it and Windows has none.
const modeBitsBlock = process.platform !== "win32" && process.getuid?.() !== 0;

type Kind = "agent" | "team" | "org";
const KINDS: Kind[] = ["agent", "team", "org"];
const USAGE = { input_tokens: 100, output_tokens: 7, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 107 };
const MODEL = "gemini-3.8-flash-low";
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async <T>(check: () => Promise<T> | T, label: string, timeout = 60_000): Promise<NonNullable<T>> => {
  const deadline = Date.now() + timeout;
  let last: unknown;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value as NonNullable<T>; } catch (error) { last = error; }
    await sleep(150);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${String(last)})` : ""}`);
};
const sha = async (file: string) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const readJson = async (file: string): Promise<Rec> => JSON.parse(await fs.readFile(file, "utf8"));
const writeJson = (file: string, value: unknown) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
/** Every file under a folder, by relative path → hash. */
const fingerprint = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const entry of await fs.readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    out[path.relative(dir, full)] = await sha(full);
  }
  return out;
};

// ---- the built Studio server ----------------------------------------------------------------------------------------------
type Server = Awaited<ReturnType<typeof startServer>>;
const children: ChildProcess[] = [];
const startServer = async (root: string) => {
  const serverDir = path.resolve(__dirname, "../../..");
  await fs.access(path.join(serverDir, "dist", "app.js"));
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_REPLY_USAGE: JSON.stringify(USAGE), ...builtServerLaunchEnvironment() });
  const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { cwd: serverDir, env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let output = "";
  child.stdout!.on("data", (chunk) => { output += String(chunk); });
  child.stderr!.on("data", (chunk) => { output += String(chunk); });
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`server exited: ${output.slice(-2000)}`);
    return output.includes("Server listening on 127.0.0.1:0");
  }, "server readiness", 180_000).catch((error) => { throw new Error(`${error}\n${output.slice(-2000)}`); });
  // The Studio app is the listener that serves GraphQL (the agent-tools MCP host logs its own listening line first).
  let url = "";
  for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
    const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
    if (probe.ok) { url = candidate!; break; }
  }
  if (!url) throw new Error(`no listener serves GraphQL: ${output.slice(-2000)}`);
  const gql = async <T = any>(query: string, variables: Rec = {}): Promise<T> => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const sockets: WebSocket[] = [];
  const stop = async () => {
    for (const socket of sockets.splice(0)) socket.terminate();
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 10_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  return { url, gql, sockets, stop, output: () => output };
};

// ---- roots and their Managers -----------------------------------------------------------------------------------------------
type Defs = { manager: string; worker: string; helper: string; researcher: string; team: string; org: string; names: Record<string, string> };
type Root = { kind: Kind; rootId: string; managerRunId: string };
const addressOf = (kind: Kind, member: "worker" | "helper" | "researcher", defs: Defs) => kind === "org" ? `/${member}` : `/${segment(defs.names[member]!)}`;
const config = (workspace: string) => ({ workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });

const createDefinitions = async (s: Server): Promise<Defs> => {
  const tag = randomUUID().slice(0, 6);
  const names = { manager: `OT Manager ${tag}`, worker: `OT Writer ${tag}`, helper: `OT Checker ${tag}`, researcher: `OT Researcher ${tag}`,
    squad: `OT Review Team ${tag}`, team: `OT Delivery Team ${tag}`, org: `OT Delivery Org ${tag}` };
  const agent = async (name: string, toolNames: string[]) => (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames } })).createAgentDefinition.id as string;
  const team = async (name: string, coordinatorMemberName: string, nodes: Rec[]) => (await s.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
    { input: { name, description: name, instructions: "Deliver.", coordinatorMemberName, nodes } })).createAgentTeamDefinition.id as string;
  const manager = await agent(names.manager, PROJECT_TOOLS);
  const worker = await agent(names.worker, []);
  const helper = await agent(names.helper, []);
  const researcher = await agent(names.researcher, []);
  const squad = await team(names.squad, "reviewer", [{ memberName: "reviewer", ref: worker, refScope: "SHARED" }, { memberName: "editor", ref: helper, refScope: "SHARED" }]);
  const teamId = await team(names.team, "manager", [{ memberName: "manager", ref: manager, refScope: "SHARED" }]);
  const org = (await s.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
    { input: { name: names.org, description: names.org, instructions: "Deliver.", handoffs: [], members: [
      { memberName: "manager", ref: manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "worker", ref: worker, refType: "AGENT", refScope: "SHARED" },
      { memberName: "helper", ref: helper, refType: "AGENT", refScope: "SHARED" },
      { memberName: "researcher", ref: researcher, refType: "AGENT", refScope: "SHARED" },
      { memberName: "squad", ref: squad, refType: "AGENT_TEAM", refScope: "SHARED" }] } })).createAgentOrgDefinition.id as string;
  return { manager, worker, helper, researcher, team: teamId, org, names };
};
const createRoot = async (s: Server, kind: Kind, defs: Defs, workspace: string): Promise<Root> => {
  if (kind === "agent") {
    const r = (await s.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: defs.manager, ...config(workspace) } })).createAgentRun;
    expect(r.success, r.message).toBe(true);
    return { kind, rootId: r.runId, managerRunId: r.runId };
  }
  if (kind === "team") {
    const r = (await s.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: defs.team, teamConfigs: [{ teamAddress: "/", ...config(workspace) }],
        memberConfigs: [{ memberAddress: "/manager", agentDefinitionId: defs.manager, ...config(workspace) }] } })).createAgentTeamRun;
    expect(r.success, r.message).toBe(true);
    const tree = (await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
    return { kind, rootId: r.teamRunId, managerRunId: tree.root_team.members.find((m: Rec) => m.address === "/manager").agent_run_id };
  }
  const r = (await s.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
    { input: { agentOrgDefinitionId: defs.org, rootConfiguration: config(workspace), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  expect(r.success, r.message).toBe(true);
  const tree = (await s.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: r.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  return { kind, rootId: r.agentOrgRunId, managerRunId: tree.rootOrg.members.find((m: Rec) => m.address === "/manager").agentRunId };
};
/** The tree the server reports for a root (its composed view). */
const treeOf = async (s: Server, root: Root) => {
  if (root.kind === "agent") return (await s.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: root.rootId })).agentRunCollaboration?.root_agent?.execution_tree;
  if (root.kind === "team") return (await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: root.rootId })).getTeamRunResumeConfig.executionTree;
  return (await s.gql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: root.rootId })).getAgentOrgRootHistory.org;
};
const treeRunIds = async (s: Server, root: Root) => taskAgentsIn(await treeOf(s, root)).map((t) => t.agentRunId ?? t.teamRunId!);
const managerConversation = async (s: Server, root: Root) => {
  if (root.kind === "agent") return (await s.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: root.rootId })).getRunProjection?.conversation;
  if (root.kind === "team") return (await s.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
    { id: root.rootId, a: root.managerRunId })).getTeamMemberRunProjection?.conversation;
  return (await s.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
    { id: root.rootId, a: root.managerRunId, m: "/manager" })).getAgentOrgMemberRunProjection?.conversation;
};
/** The Manager's input channel (what its composer sends), and one scripted tool call returning its result. */
const managerOf = async (s: Server, root: Root) => {
  const route = root.kind === "agent" ? `agent/${root.rootId}` : root.kind === "team" ? `agent-team/${root.rootId}` : `agent-org/${root.rootId}`;
  const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}/ws/${route}`);
  s.sockets.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  const send = (content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: root.kind === "org"
    ? { root_subject_kind: "agent_org", root_run_id: root.rootId, target_agent_run_id: root.managerRunId, command_id: randomUUID(),
      message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: root.managerRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
      content, context_file_paths: [], image_urls: [] } }));
  const call = async (name: string, args: Rec): Promise<Rec> => {
    const before = calledResults(await managerConversation(s, root)).length;
    send(callTool(name, args));
    const results = await until(async () => { const r = calledResults(await managerConversation(s, root)); return r.length > before ? r : null; },
      `${root.kind} Manager ${name}`, 90_000);
    return toolResult(results[before]!);
  };
  return { call, close: () => socket.close() };
};
const restore = async (s: Server, root: Root) => {
  const mutation = root.kind === "agent" ? `mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`
    : root.kind === "team" ? `mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`
      : `mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`;
  const restored = Object.values(await s.gql(mutation, { id: root.rootId }))[0] as Rec;
  expect(restored.success, restored.message).toBe(true);
};
const terminate = async (s: Server, root: Root) => {
  const mutation = root.kind === "agent" ? `mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`
    : root.kind === "team" ? `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`
      : `mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`;
  const result = Object.values(await s.gql(mutation, { id: root.rootId }))[0] as Rec;
  expect(result.success, result.message).toBe(true);
};
const runTokens = async (s: Server, runId: string) => (await s.gql(`query($r:String!){getAgentRunTokenUsageSummary(runId:$r){totalTokens}}`, { r: runId })).getAgentRunTokenUsageSummary.totalTokens as number;
const standaloneTokens = async (s: Server, runId: string) => (await s.gql(`query($r:String!){getStandaloneRunTokenUsageSummary(runId:$r){totalTokens}}`, { r: runId })).getStandaloneRunTokenUsageSummary.totalTokens as number;
/** The Manager's Team tab (its participant messages and the past participants they name, D-5). */
const managerTab = async (s: Server, r: Root) => (await s.gql(PARTICIPANT_MESSAGES_QUERY,
  { rootKind: r.kind === "agent" ? "agent" : r.kind === "team" ? "agent_team" : "agent_org", rootRunId: r.rootId, agentRunId: r.managerRunId }))
  .collaborationParticipantMessages as { messages: Rec[]; pastParticipants: Rec[] };
const memoryRunsOf = async (s: Server, agentDefinitionId: string) => ((await s.gql(`query($selector:AgentWithMemorySelectorInput!){listAgentRunsWithMemory(selector:$selector,page:1,pageSize:100){entries{runId}}}`,
  { selector: { attribution: "DEFINITION", agentDefinitionId } })).listAgentRunsWithMemory.entries as Rec[]).map((entry) => entry.runId as string);

// ---- files on disk ----------------------------------------------------------------------------------------------------------
const treeFile = (memory: string, root: Root) => root.kind === "agent" ? path.join(memory, "agents", root.rootId, "collaboration", "collaboration_tree.json")
  : root.kind === "team" ? path.join(memory, "agent_teams", root.rootId, "team_run_execution_tree.json")
    : path.join(memory, "agent_orgs", root.rootId, "agent_org_run_execution_tree.json");
/** The tree object that holds a root's own lists (Agent: the file; Team: `rootTeam`; Org: `rootOrg`). */
const holderOf = (kind: Kind, file: Rec): Rec => kind === "agent" ? file : kind === "team" ? file.rootTeam : file.rootOrg;
/** Every stored local delegated-run entry (no `nodeId`) in any `taskExecutions` list of a tree file. */
const localEntries = (value: unknown): Rec[] => {
  const out: Rec[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) { v.forEach(visit); return; }
    if (!v || typeof v !== "object") return;
    for (const [key, inner] of Object.entries(v as Rec)) {
      if (key === "taskExecutions" && Array.isArray(inner)) out.push(...inner.filter((entry: Rec) => !("nodeId" in entry)));
      visit(inner);
    }
  };
  visit(value);
  return out;
};
const ownFile = (memory: string, agentRunId: string) => path.join(memory, "agents", agentRunId, "run_metadata.json");
/** The link an older build stored for a run, from the run's own file (released key set: `taskExecutionLinkOf` at bff4faa6f6). */
const releasedLinkOf = async (memory: string, agentRunId: string): Promise<Rec> => {
  const own = await readJson(ownFile(memory, agentRunId));
  return { address: own.taskAgent.address, agentRunId, delegatorAgentRunId: own.taskAgent.delegatorAgentRunId, startedAt: own.startedAt ?? own.createdAt };
};
const findFiles = async (dir: string, name: string): Promise<string[]> => (await fs.readdir(dir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name === name).map((entry) => path.join(entry.parentPath, entry.name));
/** The Task record file of a Task (project or ad-hoc), found by its Task ID. */
const taskRecordFile = async (root: string, taskId: string) => {
  const found = (await findFiles(root, "agent_run_resources.json")).filter((file) => path.basename(path.dirname(file)) === taskId);
  expect(found, `Task record of ${taskId}`).toHaveLength(1);
  return found[0]!;
};

suite("A top run's tree is built from its open Tasks: upgrade, start, load, save and restarts (built server, scripted AGY)", () => {
  let root = "";
  let memory = "";
  let workspace = "";
  let defs!: Defs;
  let server: Server | null = null;
  const roots: Root[] = [];
  /** Per root: its runs of the closed Task (Rc), the open Task (Ro), the Task that loses its record (Rg); later Rn (temporary Task). */
  const runs = new Map<Kind, { taskClosed: string; taskOpen: string; taskGone: string; rc: string; ro: string; rg: string; rn?: string; rnTask?: string }>();
  /** What OT-2 wrote into each tree file as an older build's entries that must survive the first save unchanged and in place. */
  const kept = new Map<Kind, { rootList: Rec[]; remote: Rec[] }>();
  let tokensBeforeClosure = 0;
  const unblock = async () => { for (const r of runs.values()) await fs.chmod(ownFile(memory, r.rc), 0o644).catch(() => undefined); };

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    if (memory) await unblock();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("OT-1 a closure removes the run from the tree (never stored in the tree file); token total and Memory page keep it", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "open-task-tree-e2e-")));
    memory = path.join(root, "memory");
    workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    server = await startServer(root);
    const s = server;
    defs = await createDefinitions(s);
    const projectId = (await s.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: `OT Launch ${randomUUID().slice(0, 6)}` } })).createProject.projectId as string;
    const task = async (title: string) => (await s.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, title, description: title } })).createProjectTask.taskId as string;

    for (const kind of KINDS) {
      const r = await createRoot(s, kind, defs, workspace);
      roots.push(r);
      const manager = await managerOf(s, r);
      const ids = { taskClosed: await task(`Write the ${kind} release notes.`), taskOpen: await task(`Check the ${kind} facts.`), taskGone: await task(`Research the ${kind} links.`) };
      const delegate = async (member: "worker" | "helper" | "researcher", taskId: string) => {
        const result = await manager.call("delegate_task", { recipient_address: addressOf(kind, member, defs), task_id: taskId });
        expect(result, JSON.stringify(result)).toMatchObject({ delegated: true });
        const runId = result.target_agent_run_id as string;
        await until(async () => (await treeRunIds(s, r)).includes(runId), `${kind}: ${member} in the tree`);
        return runId;
      };
      runs.set(kind, { ...ids, rc: await delegate("worker", ids.taskClosed), ro: await delegate("helper", ids.taskOpen), rg: await delegate("researcher", ids.taskGone) });
      // A Team-tab message from the Manager to the run whose Task closes below (AC-011).
      const asked = await manager.call("send_message_to", { target_agent_run_id: runs.get(kind)!.rc, content: `Status of the ${kind} notes?` });
      expect(asked, JSON.stringify(asked)).toMatchObject({ accepted: true });
      manager.close();
    }
    const agentRoot = roots[0]!;
    const agentRuns = runs.get("agent")!;
    // Each delegated run answered its Task message: its own usage is recorded (AGY_FAKE_REPLY_USAGE).
    for (const id of [agentRoot.managerRunId, agentRuns.rc, agentRuns.ro, agentRuns.rg]) await until(async () => (await runTokens(s, id)) > 0, `usage of ${id}`);
    const perRun = async (ids: string[]) => (await Promise.all(ids.map((id) => runTokens(s, id)))).reduce((a, b) => a + b, 0);
    await until(async () => (await standaloneTokens(s, agentRoot.rootId)) === await perRun([agentRoot.managerRunId, agentRuns.rc, agentRuns.ro, agentRuns.rg]),
      "standalone total over the Manager and its three runs");
    tokensBeforeClosure = await standaloneTokens(s, agentRoot.rootId);

    // AC-001: the Manager closes Task A; its run leaves the tree of each kind of top run.
    for (const r of roots) {
      const run = runs.get(r.kind)!;
      const manager = await managerOf(s, r);
      const closed = await manager.call("update_task", { task_id: run.taskClosed, status: "DONE" });
      expect(closed.isError, JSON.stringify(closed)).toBe(false);
      await until(async () => !(await treeRunIds(s, r)).includes(run.rc), `${r.kind}: closed run left the tree`);
      expect(await treeRunIds(s, r), `${r.kind}: the open runs stay`).toEqual(expect.arrayContaining([run.ro, run.rg]));
      manager.close();
      // No local delegated run is stored in the top run's file (CM-8): delegations wrote own files only.
      expect(localEntries(await readJson(treeFile(memory, r))), `${r.kind} tree file`).toEqual([]);
      for (const id of [run.rc, run.ro, run.rg]) expect((await readJson(ownFile(memory, id))).taskAgent.coordinatingRun.runId, `${id} own file`).toBe(r.rootId);
    }
    // AC-011 (server): each Manager's Team tab keeps its message to the closed run, named as before the closure.
    for (const r of roots) {
      const run = runs.get(r.kind)!;
      const tab = await managerTab(s, r);
      expect(tab.messages.some((m) => m.receiverAgentRunId === run.rc && String(m.content).includes(`Status of the ${r.kind} notes?`)), `${r.kind}: message kept`).toBe(true);
      expect(tab.pastParticipants, `${r.kind}: the closed run is named`).toEqual(expect.arrayContaining([{ agentRunId: run.rc, address: addressOf(r.kind, "worker", defs) }]));
    }
    // AC-006: after the closure the standalone run's total still counts the closed run: it is the sum over the Manager and all
    // three runs (the Manager's own closing turn adds its usage; the closed run's usage stays in).
    expect(await runTokens(s, agentRuns.rc)).toBeGreaterThan(0);
    await until(async () => (await standaloneTokens(s, agentRoot.rootId)) === await perRun([agentRoot.managerRunId, agentRuns.rc, agentRuns.ro, agentRuns.rg]),
      "standalone total after the closure over the Manager and its three runs");
    expect(await standaloneTokens(s, agentRoot.rootId), "token total after the closure").toBeGreaterThan(tokensBeforeClosure);
    expect(await standaloneTokens(s, agentRoot.rootId) - await perRun([agentRoot.managerRunId, agentRuns.ro, agentRuns.rg]), "the closed run's usage is counted")
      .toBe(await runTokens(s, agentRuns.rc));
    // AC-012: the Memory page keeps listing the closed runs.
    const workerRuns = await memoryRunsOf(s, defs.worker);
    for (const kind of KINDS) expect(workerRuns, `${kind}: closed run on the Memory page`).toContain(runs.get(kind)!.rc);
    for (const r of roots) await terminate(s, r);
    await server.stop();
    server = null;
  }, 600_000);

  it("OT-2 an upgraded data root: admitted at start; trees hold open runs only; a read writes nothing; a load reads no closed run; the first save keeps only what it must", async () => {
    // An older build's entries, hand-built into each tree file (the runs and Task records were made by the real server above).
    for (const r of roots) {
      const run = runs.get(r.kind)!;
      const file = await readJson(treeFile(memory, r));
      const holder = holderOf(r.kind, file);
      const startedAt = (await releasedLinkOf(memory, run.rc)).startedAt as string;
      const linkWithoutOwnFile = { address: "/ghost_writer", agentRunId: `ghost-${r.kind}-${randomUUID()}`, delegatorAgentRunId: r.managerRunId, startedAt };
      // A full record the released migration 20261017 has not reduced yet: keys beyond the link's, and nested runs.
      const fullRecord = { address: "/archived_team", teamRunId: `full-${r.kind}-${randomUUID()}`, delegatorAgentRunId: r.managerRunId, startedAt,
        coordinatorAddress: "/archived_team/lead", members: [{ address: "/archived_team/lead", agentRunId: `full-lead-${randomUUID()}` }], taskExecutions: [] };
      const older = [await releasedLinkOf(memory, run.rc), await releasedLinkOf(memory, run.ro)];
      if (r.kind === "org") {
        // The older Org shape: a link kept in a configured Team's list (the inventory's two are of runs with no Task record).
        const squad = (holder.members as Rec[]).find((member) => Array.isArray(member.taskExecutions));
        expect(squad, "the Org tree has a configured Team with its own list").toBeTruthy();
        squad!.taskExecutions = [await releasedLinkOf(memory, run.rg)];
      } else older.push(await releasedLinkOf(memory, run.rg));
      // (Agent) a link to a run on another node: on disk an entry with `nodeId` in the root's own list, delegated by the Manager.
      const remote = r.kind === "agent" ? [{ address: "/publisher", agentRunId: `remote-${randomUUID()}`, nodeId: "srv_peer_ot", delegatorAgentRunId: r.managerRunId, startedAt }] : [];
      holder.taskExecutions = [linkWithoutOwnFile, ...older, fullRecord, ...remote];
      kept.set(r.kind, { rootList: [linkWithoutOwnFile, fullRecord, ...remote], remote });
      await writeJson(treeFile(memory, r), file);
      // The run delegated for the third Task loses its Task record: a run delegated before Task records existed (DEC-008).
      await fs.rm(await taskRecordFile(root, run.taskGone));
    }
    const before = await fingerprint(memory);

    // AC-008: a full server start on this data. The Team and Org runs whose trees list local runs are admitted.
    server = await startServer(root);
    const s = server;
    expect((await fetch(`${s.url}/rest/health`)).status).toBe(200);
    const admitted = (await s.gql(`{listCollaborationRootHistory{... on AgentTeamRootHistoryObject{root_run_id} ... on AgentOrgRootHistoryObject{root_run_id}}}`))
      .listCollaborationRootHistory.map((item: Rec) => item.root_run_id);
    expect(admitted).toEqual(expect.arrayContaining([roots[1]!.rootId, roots[2]!.rootId]));
    const agentHistory = JSON.stringify((await s.gql(`{listWorkspaceRunHistory{agentDefinitions{runs{runId}}}}`)).listWorkspaceRunHistory);
    expect(agentHistory, "the standalone run is listed").toContain(roots[0]!.rootId);

    // AC-009 (read): each tree holds its run of the open Task (and the link to the other node) only. The read writes nothing.
    for (const r of roots) {
      const run = runs.get(r.kind)!;
      const ids = await treeRunIds(s, r);
      expect(ids, `${r.kind}: the run of the open Task`).toContain(run.ro);
      for (const gone of [run.rc, run.rg, ...kept.get(r.kind)!.rootList.map((e) => e.agentRunId ?? e.teamRunId)]) expect(ids, `${r.kind}: ${gone}`).not.toContain(gone);
      if (r.kind === "agent") {
        // The view lists links to other nodes beside the tree (`remote_task_executions`).
        const view = (await s.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: r.rootId })).agentRunCollaboration.root_agent;
        expect(JSON.stringify(view.remote_task_executions), "the link to the other node is listed").toContain(kept.get("agent")!.remote[0]!.agentRunId);
      }
    }
    expect(await fingerprint(memory), "reading the trees wrote nothing").toEqual(before);

    // AC-010: loading and using the top runs reads no file of a closed run: their own files are unreadable meanwhile.
    if (modeBitsBlock) for (const r of runs.values()) await fs.chmod(ownFile(memory, r.rc), 0o000);
    const logMark = s.output().length;
    for (const r of roots) {
      await restore(s, r);
      const run = runs.get(r.kind)!;
      const manager = await managerOf(s, r);
      // A temporary Task (no Project): the run's first save after the upgrade.
      const result = await manager.call("delegate_task", { recipient_address: addressOf(r.kind, "worker", defs), description: `Draft the ${r.kind} summary.` });
      expect(result, JSON.stringify(result)).toMatchObject({ delegated: true });
      run.rn = result.target_agent_run_id as string;
      await until(async () => (await treeRunIds(s, r)).includes(run.rn!), `${r.kind}: new run in the tree`);
      expect(await treeRunIds(s, r), `${r.kind}: loaded tree`).toEqual(expect.arrayContaining([run.ro, run.rn]));
      for (const gone of [run.rc, run.rg]) expect(await treeRunIds(s, r), `${r.kind}: ${gone} not loaded`).not.toContain(gone);
      manager.close();
    }
    const unreadableLines = (text: string, runId: string) => text.split("\n")
      .filter((line) => line.includes(runId) && /EACCES|permission|cannot be read|could not be read|unreadable|not available/i.test(line));
    const loadLog = s.output().slice(logMark);
    for (const r of runs.values()) expect(unreadableLines(loadLog, r.rc), `no read of closed run ${r.rc}`).toEqual([]);
    const managerMessages = (r: Root) => managerTab(s, r);
    if (modeBitsBlock) {
      // Positive control: a reader that does read a closed run's own file (the Team tab names a past participant from it, D-5)
      // reports the unreadable file, so the check above would have caught a read during the load.
      const controlMark = s.output().length;
      await managerMessages(roots[0]!);
      await until(() => unreadableLines(s.output().slice(controlMark), runs.get("agent")!.rc).length > 0, "a read of the unreadable own file is reported", 10_000);
    }
    await unblock();
    // AC-011 (server): each Manager's Team tab keeps its message to the closed run, named from the run's own file.
    for (const r of roots) {
      const run = runs.get(r.kind)!;
      const tab = await managerMessages(r);
      expect(tab.messages.some((m) => m.receiverAgentRunId === run.rc || m.senderAgentRunId === run.rc), `${r.kind}: message with the closed run kept`).toBe(true);
      expect(tab.pastParticipants, `${r.kind}: the closed run is named`).toEqual(expect.arrayContaining([{ agentRunId: run.rc, address: addressOf(r.kind, "worker", defs) }]));
    }

    // AC-009 (save): only the link without own file, the full record (unchanged, in place) and the remote link remain.
    for (const r of roots) {
      const file = await readJson(treeFile(memory, r));
      const holder = holderOf(r.kind, file);
      expect(holder.taskExecutions, `${r.kind}: root list after the first save`).toEqual(kept.get(r.kind)!.rootList);
      if (r.kind === "org") for (const member of holder.members as Rec[]) expect(member.taskExecutions ?? [], `org ${member.address}: configured Team list`).toEqual([]);
    }
    // Every run's own files are byte-identical; the run without a Task record keeps its whole folder (AC-005, AC-009).
    const after = await fingerprint(memory);
    for (const r of runs.values()) {
      for (const id of [r.rc, r.ro]) expect(after[path.relative(memory, ownFile(memory, id))], `own file of ${id}`).toBe(before[path.relative(memory, ownFile(memory, id))]);
      const folder = `agents${path.sep}${r.rg}${path.sep}`;
      const pick = (fp: Record<string, string>) => Object.fromEntries(Object.entries(fp).filter(([file]) => file.startsWith(folder)));
      expect(pick(after), `folder of ${r.rg}`).toEqual(pick(before));
    }
    // AC-005 / AC-012: the runs without a Task record and the closed runs stay on the Memory page.
    const listed = [...await memoryRunsOf(s, defs.worker), ...await memoryRunsOf(s, defs.researcher)];
    for (const r of runs.values()) expect(listed).toEqual(expect.arrayContaining([r.rc, r.rg]));
    // AC-006 after a restart: the closed run still counts; the run without a Task record no longer does (DEC-008).
    const agentRoot = roots[0]!;
    const agentRuns = runs.get("agent")!;
    await until(async () => (await runTokens(s, agentRuns.rn!)) > 0, "usage of the new run");
    const expected = (await Promise.all([agentRoot.managerRunId, agentRuns.rc, agentRuns.ro, agentRuns.rn!].map((id) => runTokens(s, id)))).reduce((a, b) => a + b, 0);
    expect(await standaloneTokens(s, agentRoot.rootId), "token total after the restart").toBe(expected);
    expect(await runTokens(s, agentRuns.rc), "the closed run's usage is part of it").toBeGreaterThan(0);
    for (const r of roots) await terminate(s, r);
    await server.stop();
    server = null;
  }, 600_000);

  it("OT-3 a Task record that cannot be read hides its run with a warning naming the Task; restored, the run is back", async () => {
    const agentRoot = roots[0]!;
    const agentRuns = runs.get("agent")!;
    // The temporary Task of OT-2 (still open) owns the new run of the standalone root.
    const records = await findFiles(root, "agent_run_resources.json");
    let recordFile = "";
    for (const file of records) if ((await fs.readFile(file, "utf8")).includes(agentRuns.rn!)) recordFile = file;
    expect(recordFile, "the temporary Task's record").toBeTruthy();
    agentRuns.rnTask = path.basename(path.dirname(recordFile));
    const bytes = await fs.readFile(recordFile);
    await fs.writeFile(recordFile, bytes.subarray(0, Math.floor(bytes.length / 2)));

    server = await startServer(root);
    let s = server;
    const warning = await until(() => s.output().split("\n").find((line) => line.includes("TASK_AGENT_RESOURCES_UNAVAILABLE")), "unreadable Task record warning", 30_000);
    expect(s.output(), "the warning names the Task").toContain(agentRuns.rnTask);
    expect(warning).toBeTruthy();
    expect(await treeRunIds(s, agentRoot), "the run of the unreadable Task record is not in the tree").not.toContain(agentRuns.rn);
    for (const r of roots.slice(1)) expect(await treeRunIds(s, r), `${r.kind}: other runs load`).toContain(runs.get(r.kind)!.rn);
    await server.stop();

    await fs.writeFile(recordFile, bytes);
    server = await startServer(root);
    s = server;
    expect(s.output()).not.toContain("TASK_AGENT_RESOURCES_UNAVAILABLE");
    for (const r of roots) expect(await treeRunIds(s, r), `${r.kind}: the run of the temporary Task left open is back`).toContain(runs.get(r.kind)!.rn);
    await server.stop();
    server = null;
  }, 300_000);
});
