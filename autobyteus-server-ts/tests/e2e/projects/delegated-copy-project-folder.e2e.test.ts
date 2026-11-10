import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { findAgyRunCapsule } from "../helpers/agy-run-capsule.js";
import { calledResults, callTool, objectsIn, segment, startCollaborationHarness, taskAgentsIn, toolResult,
  type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";

// delegated-copy-project-workspace (autobyteus-97): a new local copy runs in its Task's Project's first linked folder.
// Real Studio HTTP/WebSocket/GraphQL server, scoped MCP agent tools, Project/Task services, AGY backend. The external AGY CLI
// is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes an agent call the real tool; a
// scripted AGY process's cwd is its capsule by design, so its folder is read from the launch: `--add-dir` and the capsule's
// `workspacePath`, plus the recorded launch in the run's tree.
// - DCF-01 (AC-001): an Agent root in G delegates a saved Task of P (link F) to an Agent: the copy is in F; the manager stays in G.
// - DCF-02 (AC-002): the same to a Team: the Team's default and every member are in F.
// - DCF-03 (AC-003): a worker of that Task delegates without task_id: the sub-work is in F.
// - DCF-04 (AC-004): a Task of a Project with no link, and a description-only delegation: the copy is in G.
// - DCF-05 (AC-005): P has links F1, F2: the copy is in F1.
// - DCF-06 (AC-006, REQ-005): the first link does not exist, or is a file: TASK_PROJECT_FOLDER_UNAVAILABLE naming the Project and
//   the folder; no Task entry, no copy.
// - DCF-07 (REQ-003): a Team root's and an Org root's catalog copies are in F; an Org's configured placement is in F.
// - DCF-08 (AC-007, RU-01, REQ-007): built server in separate processes: an existing copy in G given a Task of P stays in G; a copy
//   in F whose root is in G; after a real process restart both keep their folder in the stored tree and in the new launch.
// The live cases (a real Codex / Claude copy's working directory) are in delegated-copy-project-folder-live.e2e.test.ts.
// Run (scripted): env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts --no-watch
// DCF-08 needs `pnpm -C autobyteus-server-ts build` for the current worktree.
// DELEGATED_COPY_FOLDER_E2E_EVIDENCE_DIR=<dir> writes the observed folders as JSON.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const serverDir = path.resolve(__dirname, "../../..");
const evidence: Rec = {};
const writeEvidence = async () => {
  const dir = process.env["DELEGATED_COPY_FOLDER_E2E_EVIDENCE_DIR"];
  if (!dir) return;
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, "delegated-copy-project-folder.json"), `${JSON.stringify(evidence, null, 2)}\n`);
};
const unique = <T>(values: T[]) => [...new Set(values)];
/** A path as the file system resolves it (macOS temp folders are reached through /var -> /private/var). */
const real = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : value);
/** Every folder recorded in one node of a run's tree (a Team copy: its default launch and every member's). */
const recordedFolders = (node: unknown): string[] => unique(objectsIn(node)
  .flatMap((record) => [record.workspaceRootPath, record.workspace_root_path])
  .filter((value): value is string => typeof value === "string").map(real));
const nodeOf = (tree: unknown, id: string): Rec | undefined => objectsIn(tree).find((record) =>
  typeof (record.startedAt ?? record.started_at) === "string" && [record.agentRunId, record.agent_run_id, record.teamRunId, record.team_run_id].includes(id));
/** The `--add-dir` values of every launch of a capsule, from the scripted CLI's argv log. */
const addDirsOf = (argvLog: string, capsule: string): string[] => unique(fs.readFileSync(argvLog, "utf8").trim().split("\n")
  .map((line) => JSON.parse(line) as { argv: string[]; cwd: string })
  .filter((entry) => fs.realpathSync(entry.cwd) === fs.realpathSync(capsule))
  .flatMap((entry) => entry.argv.flatMap((arg, index) => (arg === "--add-dir" ? [real(entry.argv[index + 1]!)] : []))));

suite("A new delegated copy runs in its Task's Project's first linked folder (real HTTP/WS/scoped MCP, scripted AGY)", () => {
  let h: CollaborationHarness;
  let argvLog = "";
  let priorArgvLog: string | undefined;
  const ids: Rec = {};
  const names: Rec = {};
  const folders: Record<"F" | "F1" | "F2" | "file" | "missing", string> = {} as never;
  type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
  let agentRoot: Root;
  const projects: Rec = {};

  const createProject = async (name: string, links: string[]) => (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
    { input: { name, workspaces: links.map((workspaceRootPath) => ({ workspaceRootPath, description: "link" })) } })).createProject.projectId as string;
  const createTask = async (projectId: string, description: string) => (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
    { input: { projectId, title: `Task ${randomUUID().slice(0, 6)}`, description } })).createProjectTask.taskId as string;
  const memory = () => path.join(h.dataDir, "memory");
  /** The copy's launch inputs: the recorded folder, the capsule's, and the CLI's `--add-dir`. */
  const launchOf = async (root: Root, runId: string) => {
    let capsule: ReturnType<typeof findAgyRunCapsule> = null;
    await until(() => Boolean(capsule = findAgyRunCapsule(memory(), runId)), `capsule of ${runId}`, 60_000);
    let addDirs: string[] = [];
    await until(() => (addDirs = addDirsOf(argvLog, capsule!.path)).length > 0, `launch of ${runId}`, 60_000);
    return { recorded: recordedFolders(nodeOf(await root.liveTree(), runId)), capsule: capsule!.workspacePath, addDirs };
  };
  const expectIn = (launch: { recorded: string[]; capsule: string; addDirs: string[] }, folder: string) => {
    expect(launch.recorded).toEqual([folder]);
    expect(launch.capsule).toBe(folder);
    expect(launch.addDirs).toEqual([folder]);
  };
  const delegatedOk = (result: Rec) => { expect(result.delegated, JSON.stringify(result)).toBe(true); return result; };

  beforeAll(async () => {
    priorArgvLog = process.env["AGY_FAKE_ARGV_LOG"];
    const logDir = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "dcf-argv-")));
    argvLog = path.join(logDir, "argv.jsonl");
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    h = await startCollaborationHarness("delegated-copy-folder-e2e");
    const base = fs.realpathSync(h.dataDir);
    for (const key of ["F", "F1", "F2"] as const) { folders[key] = path.join(base, `folder-${key}`); await fsp.mkdir(folders[key]); }
    folders.file = path.join(base, "a-file.txt"); await fsp.writeFile(folders.file, "not a folder");
    folders.missing = path.join(base, "folder-moved-away");
    const suffix = randomUUID().slice(0, 6);
    for (const key of ["manager", "mate", "writer", "checker", "helper"]) names[key] = `DCF ${key} ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager, { toolNames: ["create_task", "update_task"] });
    for (const key of ["mate", "writer", "checker", "helper"]) ids[key] = await h.agentDefinition(names[key]);
    names.squad = `DCF Squad ${suffix}`;
    ids.squad = await h.teamDefinition(names.squad, [["reviewer", ids.writer], ["editor", ids.checker]], "reviewer");
    ids.team = await h.teamDefinition(`DCF Root Team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    ids.org = await h.orgDefinition(`DCF Org ${suffix}`, [
      { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "worker", ref: ids.writer, refType: "AGENT", refScope: "SHARED" }], []);
    projects.P = await createProject(`DCF P ${suffix}`, [folders.F]);
    projects.none = await createProject(`DCF no link ${suffix}`, []);
    projects.two = await createProject(`DCF two links ${suffix}`, [folders.F1, folders.F2]);
    projects.gone = await createProject(`DCF moved ${suffix}`, [folders.missing]);
    projects.file = await createProject(`DCF file link ${suffix}`, [folders.file]);
    agentRoot = await h.startRoot("agent", ids);
  }, 180_000);

  afterAll(async () => {
    await writeEvidence();
    agentRoot?.close();
    await h?.close();
    if (priorArgvLog === undefined) delete process.env["AGY_FAKE_ARGV_LOG"]; else process.env["AGY_FAKE_ARGV_LOG"] = priorArgvLog;
    if (argvLog) await fsp.rm(path.dirname(argvLog), { recursive: true, force: true });
  }, 180_000);

  it("DCF-01: an Agent copy of a saved Task of P runs in F; the manager stays in G", async () => {
    const taskId = await createTask(projects.P, "Reply OK.");
    const delegated = delegatedOk(await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: taskId })));
    const copy = await launchOf(agentRoot, delegated.target_agent_run_id);
    expectIn(copy, folders.F);
    expect(findAgyRunCapsule(memory(), agentRoot.rootId)!.workspacePath).toBe(fs.realpathSync(h.workspace));
    evidence.dcf01 = { copy, manager: findAgyRunCapsule(memory(), agentRoot.rootId)!.workspacePath };
  }, 180_000);

  it("DCF-02: a Team copy's default and every member run in F", async () => {
    const taskId = await createTask(projects.P, "Reply OK.");
    const delegated = delegatedOk(await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.squad)}`, task_id: taskId })));
    const team = await agentRoot.waitForTaskAgent(delegated.target_team_run_id);
    expect(team.members).toHaveLength(2);
    expect(recordedFolders(nodeOf(await agentRoot.liveTree(), delegated.target_team_run_id))).toEqual([folders.F]);
    const coordinator = await launchOf(agentRoot, delegated.target_team_coordinator_agent_run_id);
    expect(coordinator.capsule).toBe(folders.F);
    expect(coordinator.addDirs).toEqual([folders.F]);
    // The other member starts when it first gets a message.
    const other = team.members.find((member) => member.agentRunId !== delegated.target_team_coordinator_agent_run_id)!;
    await agentRoot.conversationOf(other.agentRunId, other.address);
    agentRoot.sendTo(other.agentRunId, "Reply OK.");
    const member = await launchOf(agentRoot, other.agentRunId);
    expect(member.capsule).toBe(folders.F);
    expect(member.addDirs).toEqual([folders.F]);
    evidence.dcf02 = { teamRunId: delegated.target_team_run_id, coordinator, member };
  }, 240_000);

  it("DCF-03: a worker of that Task delegates without task_id: the sub-work runs in F, with the manager in G", async () => {
    const taskId = await createTask(projects.P, callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Reply OK." }));
    const delegated = delegatedOk(await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: taskId })));
    let sub: ReturnType<typeof taskAgentsIn>[number] | undefined;
    await until(async () => Boolean(sub = (await agentRoot.taskAgents()).find((agent) => agent.delegatorAgentRunId === delegated.target_agent_run_id)), "sub-work started", 60_000);
    const launch = await launchOf(agentRoot, sub!.agentRunId!);
    expectIn(launch, folders.F);
    evidence.dcf03 = { worker: delegated.target_agent_run_id, sub: sub!.agentRunId, launch };
  }, 180_000);

  it("DCF-04: a Task of a Project with no link, and a description-only delegation, run in the top-level run's folder", async () => {
    const G = fs.realpathSync(h.workspace);
    const taskId = await createTask(projects.none, "Reply OK.");
    const noLink = delegatedOk(await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.checker)}`, task_id: taskId })));
    const temp = delegatedOk(await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Reply OK." })));
    const launches = { noLink: await launchOf(agentRoot, noLink.target_agent_run_id), temp: await launchOf(agentRoot, temp.target_agent_run_id) };
    for (const launch of Object.values(launches)) { expect(launch.capsule).toBe(G); expect(launch.addDirs).toEqual([G]); }
    evidence.dcf04 = launches;
  }, 180_000);

  it("DCF-05: with links F1 and F2 the copy runs in F1", async () => {
    const taskId = await createTask(projects.two, "Reply OK.");
    const delegated = delegatedOk(await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: taskId })));
    const launch = await launchOf(agentRoot, delegated.target_agent_run_id);
    expectIn(launch, folders.F1);
    evidence.dcf05 = launch;
  }, 120_000);

  it("DCF-06: a first link that does not exist, or is a file, refuses with a coded error naming the Project and the folder; no Task entry, no copy", async () => {
    const results: Rec = {};
    for (const [key, projectId, folder] of [["missing", projects.gone, folders.missing], ["file", projects.file, folders.file]] as const) {
      const taskId = await createTask(projectId, "Reply OK.");
      const before = (await agentRoot.taskAgents()).length;
      const refused = await agentRoot.calls(agentRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: taskId }));
      const text = JSON.stringify(refused);
      expect(refused.delegated, text).not.toBe(true);
      expect(text).toContain("TASK_PROJECT_FOLDER_UNAVAILABLE");
      expect(text).toContain(folder);
      expect((await agentRoot.taskAgents()).length).toBe(before);
      const resources = path.join(h.dataDir, "projects", projectId, "tasks", taskId, "agent_run_resources.json");
      const entries = fs.existsSync(resources) ? (JSON.parse(fs.readFileSync(resources, "utf8")) as Rec).executionResources as unknown[] : [];
      expect(entries).toEqual([]);
      results[key] = refused;
    }
    evidence.dcf06 = results;
  }, 120_000);

  it("DCF-07: a Team root's and an Org root's catalog copies, and an Org's configured placement, run in F; their managers stay in G", async () => {
    const G = fs.realpathSync(h.workspace);
    const team = await h.startRoot("team", ids);
    const teamCopy = delegatedOk(await team.calls(team.managerRunId, "/manager", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: await createTask(projects.P, "Reply OK.") })));
    const teamLaunch = await launchOf(team, teamCopy.target_agent_run_id);
    expect(teamLaunch.capsule).toBe(folders.F);
    expect(teamLaunch.addDirs).toEqual([folders.F]);
    expect(findAgyRunCapsule(memory(), team.managerRunId)!.workspacePath).toBe(G);
    const org = await h.startRoot("org", ids);
    const orgCatalog = delegatedOk(await org.calls(org.managerRunId, "/manager", callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, task_id: await createTask(projects.P, "Reply OK.") })));
    const orgPlacement = delegatedOk(await org.calls(org.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/worker", task_id: await createTask(projects.P, "Reply OK.") })));
    const launches = { catalog: await launchOf(org, orgCatalog.target_agent_run_id), placement: await launchOf(org, orgPlacement.target_agent_run_id) };
    for (const launch of Object.values(launches)) { expect(launch.capsule).toBe(folders.F); expect(launch.addDirs).toEqual([folders.F]); }
    expect(findAgyRunCapsule(memory(), org.managerRunId)!.workspacePath).toBe(G);
    evidence.dcf07 = { teamLaunch, org: launches };
    team.close(); org.close();
    await h.terminate("team", team.rootId);
    await h.terminate("org", org.rootId);
  }, 300_000);
});

suite("Copies keep their folders across a real process restart (built server, scripted AGY)", () => {
  let root = "";
  let argvLog = "";
  const servers: ChildProcess[] = [];
  const sockets: WebSocket[] = [];

  const startServer = async (label: string) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      USER: process.env.USER ?? "tester", DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ANTIGRAVITY_CLI_COMMAND: cli,
      AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: argvLog, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" };
    const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    servers.push(child);
    await until(() => {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label}: server exited: ${output.slice(-2000)}`);
      return output.includes("Server listening on 127.0.0.1:0");
    }, `${label}: server ready`, 120_000);
    let url = "";
    for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
      const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
      if (probe.ok) { url = candidate!; break; }
    }
    if (!url) throw new Error(`${label}: no listener serves GraphQL: ${output.slice(-1500)}`);
    const graphql = async (query: string, variables: Rec = {}): Promise<Rec> => {
      const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
      const body = await response.json() as { data?: Rec; errors?: unknown[] };
      if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
      return body.data;
    };
    return { child, url, graphql };
  };
  type Server = Awaited<ReturnType<typeof startServer>>;
  const stopServer = async (server: Server) => {
    if (server.child.exitCode !== null || server.child.signalCode !== null) return;
    const exited = new Promise((resolve) => server.child.once("exit", resolve));
    server.child.kill("SIGTERM");
    const force = setTimeout(() => server.child.kill("SIGKILL"), 8_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  /** One scripted tool call, as a user message to the manager; returns the tool's result. */
  const managerCalls = async (server: Server, runId: string, content: string): Promise<Rec> => {
    const conversation = async () => (await server.graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
    const before = calledResults(await conversation()).length;
    const socket = new WebSocket(`ws://${new URL(server.url).host}/ws/agent/${runId}`);
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    let results: string[] = [];
    await until(async () => (results = calledResults(await conversation())).length > before, `tool result for ${content.slice(0, 80)}`, 60_000);
    socket.close();
    return toolResult(results[before]!);
  };

  beforeAll(async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "dcf-restart-")));
    for (const dir of ["home", "db", "G", "F"]) await fsp.mkdir(path.join(root, dir));
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    argvLog = path.join(root, "argv.jsonl");
    await fsp.access(path.join(serverDir, "dist", "app.js"));
  }, 60_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    for (const child of servers) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await writeEvidence();
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("DCF-08: an existing copy in G given a Task of P stays in G; a copy in F stays in F; after a real restart both keep their folder and wake there", async () => {
    const [G, F] = [path.join(root, "G"), path.join(root, "F")];
    const first = await startServer("server #1");
    const agent = async (name: string) => (await first.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id as string;
    const suffix = randomUUID().slice(0, 6);
    const [managerName, workerName] = [`DCF Manager ${suffix}`, `DCF Worker ${suffix}`];
    const managerDefinition = await agent(managerName);
    await agent(workerName);
    const project = async (name: string, links: string[]) => (await first.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name, workspaces: links.map((workspaceRootPath) => ({ workspaceRootPath, description: "link" })) } })).createProject.projectId as string;
    const task = async (projectId: string) => (await first.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, title: `Task ${randomUUID().slice(0, 6)}`, description: "Reply OK." } })).createProjectTask.taskId as string;
    const [O, P] = [await project(`DCF O ${suffix}`, []), await project(`DCF P ${suffix}`, [F])];
    const created = (await first.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: managerDefinition, workspaceRootPath: G, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const managerId = created.runId as string;
    const workerAddress = `/${segment(workerName)}`;

    const inG = await managerCalls(first, managerId, callTool("delegate_task", { recipient_address: workerAddress, task_id: await task(O) }));
    expect(inG.delegated, JSON.stringify(inG)).toBe(true);
    const copyG = inG.target_agent_run_id as string;
    // A follow-up Task of P to the existing copy: it keeps its folder (REQ-007).
    const followUp = await managerCalls(first, managerId, callTool("delegate_task", { target_agent_run_id: copyG, task_id: await task(P) }));
    expect(followUp.delegated, JSON.stringify(followUp)).toBe(true);
    const inF = await managerCalls(first, managerId, callTool("delegate_task", { recipient_address: workerAddress, task_id: await task(P) }));
    expect(inF.delegated, JSON.stringify(inF)).toBe(true);
    const copyF = inF.target_agent_run_id as string;

    const treeOf = async (server: Server) => (await server.graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: managerId })).agentRunCollaboration?.root_agent?.execution_tree;
    const folderReadings = async (server: Server) => { const tree = await treeOf(server);
      return { copyG: recordedFolders(nodeOf(tree, copyG)), copyF: recordedFolders(nodeOf(tree, copyF)) }; };
    const live = await folderReadings(first);
    expect(live).toEqual({ copyG: [G], copyF: [F] });

    await stopServer(first);
    const argvBytesBefore = fs.readFileSync(argvLog, "utf8").length;
    const second = await startServer("server #2");
    expect(second.child.pid).not.toBe(first.child.pid);
    expect(await folderReadings(second)).toEqual({ copyG: [G], copyF: [F] });
    const restored = (await second.graphql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`, { id: managerId })).restoreAgentRun;
    expect(restored.success, restored.message).toBe(true);
    // The assigner's message wakes each copy: its new process launches in its own folder (AGY refuses a changed folder on restore).
    for (const copyId of [copyG, copyF]) {
      const woken = await managerCalls(second, managerId, callTool("send_message_to", { target_agent_run_id: copyId, content: "Are you there?" }));
      expect(woken.accepted, JSON.stringify(woken)).toBe(true);
    }
    const launchesAfter = async () => {
      const lines = fs.readFileSync(argvLog, "utf8").slice(argvBytesBefore).trim().split("\n").map((line) => JSON.parse(line) as { argv: string[]; cwd: string });
      // A launch belongs to the run whose capsule (`…/<runId>/agy-project`) is its cwd.
      const dirsOf = (id: string) => unique(lines.filter((line) => path.basename(path.dirname(line.cwd)) === id)
        .flatMap((line) => line.argv.flatMap((arg, i) => (arg === "--add-dir" ? [real(line.argv[i + 1]!)] : []))));
      return { copyG: dirsOf(copyG), copyF: dirsOf(copyF), manager: dirsOf(managerId) };
    };
    let after: Awaited<ReturnType<typeof launchesAfter>> | undefined;
    await until(async () => { after = await launchesAfter(); return after.copyG.length > 0 && after.copyF.length > 0 && after.manager.length > 0; }, "the copies' launches after the restart", 60_000);
    expect(after).toEqual({ copyG: [G], copyF: [F], manager: [G] });
    expect(await folderReadings(second)).toEqual({ copyG: [G], copyF: [F] });
    evidence.dcf08 = { live, pids: [first.child.pid, second.child.pid], launchesAfterRestart: after };
    await second.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: managerId });
    await stopServer(second);
  }, 420_000);
});
