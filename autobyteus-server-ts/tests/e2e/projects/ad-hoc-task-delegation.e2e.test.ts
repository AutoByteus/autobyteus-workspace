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
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// `@` → delegate → ad-hoc Task → DONE by task_id alone, through the real Studio HTTP/WebSocket server,
// scoped MCP agent tools, roots, Project/Task services and the app-data disk layout. Only the external AGY CLI
// is scripted: a message containing `CALL_TOOL:{...}` makes it call that actual agent tool and reply
// `CALLED:<tool result>`. No provider inference. Covers mention-delegation-dismissal AC-001..AC-013 and AC-015
// at the server/wire boundary for the standalone Agent, Agent Team and Agent Org roots. The host agents have
// no Project tool selected, so every create_or_update_task call also proves its automatic exposure (AC-009).
// Rendering, real runtimes and a real backend restart are covered by the cross-scope mentions live probe.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type Kind = "agent" | "team" | "org";
type TaskNode = { agentRunId?: string; teamRunId?: string; address: string; startedAt: string; delegatorAgentRunId?: string };
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const keyOf = (ref: Record<string, any>) => ref.teamRunId ?? ref.team_run_id ? `team:${ref.teamRunId ?? ref.team_run_id}` : `agent:${ref.agentRunId ?? ref.agent_run_id}`;
const keys = (refs: readonly Record<string, any>[]) => refs.map(keyOf).sort();
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const IN_RUN_GUIDANCE = "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.";

/** Every task execution node (Agent or Team; nested anywhere), identified by its recorded start. */
const taskNodes = (tree: unknown): TaskNode[] => {
  const found: TaskNode[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, any>;
    const startedAt = record.startedAt ?? record.started_at;
    const agentRunId = record.agentRunId ?? record.agent_run_id;
    const teamRunId = record.teamRunId ?? record.team_run_id;
    if (typeof startedAt === "string" && (agentRunId || teamRunId)) {
      found.push({ ...(teamRunId ? { teamRunId } : { agentRunId }), address: record.address, startedAt,
        delegatorAgentRunId: record.delegatorAgentRunId ?? record.delegator_agent_run_id });
    }
    Object.values(record).forEach(visit);
  };
  visit(tree);
  return found;
};
/** Every collaborator entry of a root tree (camelCase or snake_case trees). */
const collaboratorsIn = (tree: unknown): Record<string, any>[] => {
  const found: Record<string, any>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, any>)) {
      if (key === "collaborators" && Array.isArray(child)) found.push(...child);
      else visit(child);
    }
  };
  visit(tree);
  return found;
};
/** The `CALLED:<result>` replies of the scripted actor, in conversation order (one per conversation entry). */
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (value.includes("CALLED:")) strings.push(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(entry);
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});

suite("@ delegates and every delegated copy is closable by its ad-hoc Task (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", referenceFile = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", reviewer: "", helper: "", assistant: "", team: "", org: "" };
  const names = { reviewer: "", helper: "", assistant: "", worker: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    // No Project tool is selected: create_or_update_task must arrive automatically with delegate_task (AC-009).
    { input: { name, role: "assistant", description: `${name} (ad-hoc Task E2E)`, instructions: "Follow the user's request.", toolNames: [] } },
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
  const terminate = async (kind: Kind, rootId: string) => {
    const result = kind === "agent"
      ? (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId })).terminateAgentRun
      : kind === "team"
        ? (await graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId })).terminateAgentTeamRun
        : (await graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).terminateAgentOrgRun;
    expect(result.success, result.message).toBe(true);
    const index = active.findIndex((run) => run.rootId === rootId);
    if (index >= 0) active.splice(index, 1);
  };
  const deletePermanently = async (kind: Kind, rootId: string) => {
    const result = kind === "agent"
      ? (await graphql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: rootId })).deleteStoredRun
      : kind === "team"
        ? (await graphql(`mutation($id:String!){deleteStoredTeamRun(teamRunId:$id){success message}}`, { id: rootId })).deleteStoredTeamRun
        : (await graphql(`mutation($id:String!){deleteStoredAgentOrgRun(orgRunId:$id){success message}}`, { id: rootId })).deleteStoredAgentOrgRun;
    expect(result.success, result.message).toBe(true);
  };
  const adHocRoot = () => path.join(dataDir, "ad-hoc-tasks");
  const adHocTaskIds = async () => (await fs.readdir(adHocRoot()).catch(() => [] as string[])).sort();
  const readAdHocTask = async (taskId: string) => JSON.parse(await fs.readFile(path.join(adHocRoot(), taskId, "task.json"), "utf8"));
  const exists = (file: string) => fs.access(file).then(() => true, () => false);
  const projectTasks = async (projectId: string) => (await graphql(
    `query($id:String!){projectTasks(projectId:$id){taskId status description}}`, { id: projectId })).projectTasks as any[];

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ad-hoc-task-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    referenceFile = path.join(workspace, "review-notes.md");
    await fs.writeFile(referenceFile, "REFERENCE_FILE_BYTES_MUST_NOT_BE_COPIED\n");
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.reviewer = `AHT Reviewer ${suffix}`; names.helper = `AHT Helper ${suffix}`; names.assistant = `AHT Assistant ${suffix}`;
    ids.manager = await agentDefinition(`AHT Manager ${suffix}`);
    ids.reviewer = await agentDefinition(names.reviewer);
    ids.helper = await agentDefinition(names.helper);
    ids.assistant = await agentDefinition(names.assistant);
    names.worker = `AHT Worker ${suffix}`;
    const worker = ids.worker = await agentDefinition(names.worker);
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `AHT Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `AHT Org ${suffix}`, description: "Org root", instructions: "Follow requests.",
        members: [{ memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
          { memberName: "worker", ref: worker, refType: "AGENT", refScope: "SHARED" }], handoffs: [] } },
    )).createAgentOrgDefinition.id;
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["AD_HOC_TASK_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "ad-hoc-task-delegation.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  /** Starts a root of one kind with the Manager; returns its ids and channels. */
  const startRoot = async (kind: Kind) => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      managerRunId = tree.rootOrg.members.find((member: any) => member.address === "/manager").agentRunId;
    }
    active.push({ kind, rootId });
    expect(managerRunId).toBeTruthy();
    return { rootId, managerRunId };
  };

  /** One root kind: `@` → delegate → ad-hoc Task → strict updates → DONE → fencing → stored → delete. */
  const rootScenario = async (kind: Kind) => {
    const record: Record<string, unknown> = {};
    const reviewerAddress = `/${segment(names.reviewer)}`;
    const helperAddress = `/${segment(names.helper)}`;
    const assistantAddress = `/${segment(names.assistant)}`;
    // A Project with one Project Task: listing exclusion (AC-010) and update by task_id alone (AC-005).
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Ad-hoc ${kind} ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const projectTaskId = (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, description: "Project Task description." } })).createProjectTask.taskId as string;

    const { rootId, managerRunId } = await startRoot(kind);
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    let inputChannel = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null;
    const openView = () => connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
    let view = await openView();
    const send = (content: string, mentions?: Array<{ kind: "agent" | "agent_team"; definition_id: string }>) => {
      const extra = mentions ? { mentions } : {};
      if (kind === "org") view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [], ...extra } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : view.socket, { agent_run_id: managerRunId, content, ...extra });
    };
    const snapshotOf = (frames: Frame[]) => {
      const payload = frames.find(isSnapshot)!.payload;
      const body = kind === "agent" ? payload.root_agent : kind === "org" ? payload.root_org : payload;
      return { tree: body.execution_tree, closed: body.closed_task_executions as Record<string, any>[] };
    };
    const liveTree = async () => {
      if (kind === "agent") return (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    };
    const conversationOf = async (agentRunId: string, address: string) => {
      if (kind === "agent" && agentRunId === rootId) return (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`,
        { id: agentRunId })).getRunProjection?.conversation;
      if (kind === "agent") return (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
    };
    const managerAddress = kind === "agent" ? "/" : "/manager";
    const managerConversation = () => conversationOf(managerRunId, managerAddress);
    /** Sends one scripted tool call to the Manager and returns the tool result text it reports. */
    const managerCalls = async (content: string, mentions?: Array<{ kind: "agent" | "agent_team"; definition_id: string }>) => {
      const before = calledResults(await managerConversation()).length;
      send(content, mentions);
      let results: string[] = [];
      await until(async () => { results = calledResults(await managerConversation()); return results.length > before; },
        `Manager tool result for ${content.slice(0, 120)}`, 60_000);
      return results[before]!;
    };
    const closedFrame = (frame: Frame) => kind === "team" ? frame.type === "TASK_EXECUTIONS_CLOSED"
      : frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_closed";
    const closedRefsOf = (frame: Frame) => kind === "team" ? frame.payload.task_executions : frame.payload.event.task_executions;
    const reopenView = async () => { view.socket.close(); view = await openView(); return snapshotOf(view.frames); };

    // 1. `@Reviewer` send whose turn delegates by description with a reference file (SCN-001, AC-001..003, AC-015).
    // The Reviewer copy's own work is a described sub-delegation to the Helper (SCN-006 under the ad-hoc owner, AC-011).
    const subDelegation = callTool("delegate_task", { recipient_address: helperAddress, description: "Reply OK." });
    const adHocBefore = await adHocTaskIds();
    const delegated = await managerCalls(
      callTool("delegate_task", { recipient_address: reviewerAddress, description: subDelegation, reference_files: [referenceFile] }),
      [{ kind: "agent", definition_id: ids.reviewer }],
    );
    const adHocTaskId = AD_HOC_ID.exec(delegated)?.[0];
    expect(adHocTaskId, `delegate_task result has a task_id: ${delegated}`).toBeTruthy();
    const nodes = await (async () => {
      let found: TaskNode[] = [];
      await until(async () => { found = taskNodes(await liveTree()); return found.length >= 2; }, "copy and sub-copy started", 60_000);
      return found;
    })();
    const copy = nodes.find((node) => node.delegatorAgentRunId === managerRunId)!;
    const subCopy = nodes.find((node) => node !== copy)!;
    expect(copy?.agentRunId, JSON.stringify(nodes)).toBeTruthy();
    expect(copy.address).toBe(reviewerAddress);
    expect(delegated).toContain(copy.agentRunId!);
    // Exactly one new ad-hoc Task, text only: description and reference path, no copied bytes (AC-003, AC-015).
    expect((await adHocTaskIds()).filter((id) => !adHocBefore.includes(id))).toEqual([adHocTaskId]);
    const stored = await readAdHocTask(adHocTaskId!);
    expect(stored).toMatchObject({ taskId: adHocTaskId, description: subDelegation, referenceFiles: [referenceFile] });
    expect(stored).not.toHaveProperty("projectId");
    // Only the two text records (transient `*.lock` files of the per-file writer are not Task content).
    await until(async () => (await fs.readdir(path.join(adHocRoot(), adHocTaskId!))).filter((name) => !name.endsWith(".lock")).length === 2,
      "ad-hoc Task folder settled", 10_000);
    expect((await fs.readdir(path.join(adHocRoot(), adHocTaskId!))).filter((name) => !name.endsWith(".lock")).sort())
      .toEqual(["agent_run_resources.json", "task.json"]);
    const folderBytes = spawnSync("grep", ["-rl", "REFERENCE_FILE_BYTES_MUST_NOT_BE_COPIED", adHocRoot()], { encoding: "utf8" }).stdout.trim();
    expect(folderBytes, "reference file bytes copied into ad-hoc-tasks").toBe("");
    const resources = await fs.readFile(path.join(adHocRoot(), adHocTaskId!, "agent_run_resources.json"), "utf8");
    expect(resources).toContain(copy.agentRunId!);
    // The Reviewer copy is working on the ad-hoc Task: its described sub-delegation creates no Task (AC-011).
    let copyResults: string[] = [];
    await until(async () => { copyResults = calledResults(await conversationOf(copy.agentRunId!, copy.address)); return copyResults.length >= 1; },
      "the copy's sub-delegation result", 60_000);
    expect(copyResults[0]).toContain(subCopy.agentRunId ?? subCopy.teamRunId!);
    expect(copyResults[0]).not.toMatch(/task_id/);
    expect(await adHocTaskIds()).toEqual([...adHocBefore, adHocTaskId!].sort());
    expect(resources.length).toBeGreaterThan(0);
    await until(async () => (await fs.readFile(path.join(adHocRoot(), adHocTaskId!, "agent_run_resources.json"), "utf8"))
      .includes(subCopy.agentRunId ?? subCopy.teamRunId!), "sub-copy linked to the same ad-hoc Task", 30_000);
    // `@` added nothing: no collaborator; the stored message carries the delegate_task note (AC-001, AC-002).
    expect(collaboratorsIn(await liveTree())).toEqual([]);
    const managerText = JSON.stringify(await managerConversation());
    expect(managerText).toContain("[Mentioned collaborators]");
    expect(managerText).toContain(`- ${names.reviewer} (Agent) at ${reviewerAddress}`);
    expect(managerText).toContain("Delegate the work with delegate_task to its address");
    expect(managerText).not.toContain("Message a collaborator with send_message_to");
    // mention-candidates-in-run AC-004: a mention of a definition not in the run carries no in-run marker or guidance.
    expect(managerText).not.toContain("already in this run");
    expect(managerText).not.toContain(IN_RUN_GUIDANCE);

    // 2. Ad-hoc Tasks are not Project Tasks (AC-010 listing half).
    expect((await projectTasks(projectId)).map((task) => task.taskId)).toEqual([projectTaskId]);
    const listed = (await graphql(`query{projects{projectId}}`)).projects as any[];
    expect(listed.map((project) => project.projectId)).not.toContain(adHocTaskId);

    // 3a. A rejected delegation (unknown address) returns no task_id and leaves no Task (AC-003 alternate).
    const rejectedDelegation = await managerCalls(callTool("delegate_task", { recipient_address: "/no_such_agent_aht", description: "Nothing." }));
    expect(rejectedDelegation).toContain('"delegated":false');
    expect(rejectedDelegation).not.toMatch(AD_HOC_ID);
    expect(await adHocTaskIds()).toEqual([...adHocBefore, adHocTaskId!].sort());

    // 3. Strict create_or_update_task modes through the real MCP tool (AC-004..006).
    const rejected = await managerCalls(callTool("create_or_update_task", { project_id: projectId, task_id: adHocTaskId, status: "DONE" }));
    expect(rejected).toContain("PROJECT_TOOL_ARGUMENT_INVALID");
    expect((await readAdHocTask(adHocTaskId!)).status).not.toBe("DONE");
    const unknown = await managerCalls(callTool("create_or_update_task", { task_id: `ad_hoc_task_${randomUUID()}`, status: "DONE" }));
    expect(unknown).toContain("TASK_NOT_FOUND");
    const createWithoutProject = await managerCalls(callTool("create_or_update_task", { description: "No Project." }));
    expect(createWithoutProject).toContain("PROJECT_TOOL_ARGUMENT_INVALID");
    expect(await adHocTaskIds()).toEqual([...adHocBefore, adHocTaskId!].sort());
    const patched = await managerCalls(callTool("create_or_update_task", { task_id: projectTaskId, description: "Patched by id." }));
    expect(patched).toContain(projectTaskId);
    expect((await projectTasks(projectId)).find((task) => task.taskId === projectTaskId)?.description).toBe("Patched by id.");

    // 4. Open copy: messaging it by run ID works before DONE.
    const openMessage = await managerCalls(callTool("send_message_to", { target_agent_run_id: copy.agentRunId, content: "Reply OK." }));
    expect(openMessage).not.toMatch(/TASK_AGENT_RESOURCE_CLOSED|"isError":true/);
    expect((await reopenView()).closed).toEqual([]);

    // 5. DONE by task_id alone (AC-004, AC-007): one live closure of exactly the copy and its sub-work, status DONE.
    const doneFrom = view.frames.length;
    const done = await managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, status: "DONE" }));
    expect(done).toContain(adHocTaskId!);
    expect(done).toMatch(/\\?"projectId\\?":null/);
    await until(() => view.frames.slice(doneFrom).some(closedFrame), "live task_executions_closed", 60_000);
    const closedPayload = closedRefsOf(view.frames.slice(doneFrom).find(closedFrame)!);
    const adHocRefs = [copy, subCopy].map((node) => node.teamRunId ? { teamRunId: node.teamRunId } : { agentRunId: node.agentRunId });
    expect(keys(closedPayload)).toEqual(keys(adHocRefs));
    expect((await readAdHocTask(adHocTaskId!)).status).toBe("DONE");
    // Fenced: the closed copy cannot receive input by run ID; its conversation is kept.
    const fenced = await managerCalls(callTool("send_message_to", { target_agent_run_id: copy.agentRunId, content: "Are you there?" }));
    expect(fenced).toContain("TASK_AGENT_RESOURCE_CLOSED");
    expect(calledResults(await conversationOf(copy.agentRunId!, copy.address)).length).toBeGreaterThanOrEqual(1);
    // Repeating DONE re-requests the stop and changes nothing else.
    const redoFrom = view.frames.length;
    await managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, status: "DONE" }));
    await until(() => view.frames.slice(redoFrom).some(closedFrame), "repeated DONE closure", 60_000);
    expect(keys(closedRefsOf(view.frames.slice(redoFrom).find(closedFrame)!))).toEqual(keys(adHocRefs));
    expect(await adHocTaskIds()).toEqual([...adHocBefore, adHocTaskId!].sort());
    const reopened = await reopenView();
    expect(keys(reopened.closed)).toEqual(keys(adHocRefs));
    expect(keys(taskNodes(reopened.tree))).toEqual(keys(nodes));

    // 6. An agent-initiated bring-in still adds a permanent collaborator (the producer of stored collaborators, AC-012).
    const broughtIn = await managerCalls(callTool("send_message_to", { recipient_address: assistantAddress, content: "Reply OK." }));
    expect(broughtIn).not.toMatch(/"isError":true/);
    let collaborators: Record<string, any>[] = [];
    await until(async () => { collaborators = collaboratorsIn(await liveTree()); return collaborators.length === 1; }, "bring-in collaborator", 30_000);
    const collaboratorRunId = collaborators[0]!.agentRunId ?? collaborators[0]!.agent_run_id;
    expect(collaboratorRunId).toBeTruthy();

    // 6b. mention-candidates-in-run: definitions already in the run are mentionable (AC-001..003, AC-006).
    // The run's own definition is not; a Team/Org run's configured shared members are.
    const rootSubjectKind = kind === "agent" ? "agent" : kind === "team" ? "agent_team" : "agent_org";
    // An Agent root answers for the focused agent: the host's own composer here.
    const candidates = ((await graphql(`query($k:String!,$id:String!,$f:String){collaboratorMentionCandidates(rootSubjectKind:$k,rootRunId:$id,focusedAgentRunId:$f){availability candidates{kind definitionId}}}`,
      { k: rootSubjectKind, id: rootId, f: kind === "agent" ? rootId : null })).collaboratorMentionCandidates.candidates as any[]).map((candidate) => candidate.definitionId);
    expect(candidates).toContain(ids.assistant); // an in-run collaborator (the reported case)
    if (kind === "agent") expect(candidates).not.toContain(ids.manager); // the standalone host's own definition
    else expect(candidates).toContain(ids.worker); // a configured shared member
    if (kind === "team") expect(candidates).not.toContain(ids.team);
    expect(candidates).not.toContain(ids.org);
    const inRunMentions = [{ kind: "agent" as const, definition_id: ids.assistant },
      ...(kind === "agent" ? [] : [{ kind: "agent" as const, definition_id: ids.worker }])];
    send("Reply OK.", inRunMentions);
    const assistantEntry = `- ${names.assistant} (Agent) at ${assistantAddress}, already in this run`;
    let inRunText = "";
    await until(async () => { inRunText = JSON.stringify(await managerConversation()); return inRunText.includes(assistantEntry); },
      "in-run mention note stored", 30_000);
    expect(inRunText).toContain(IN_RUN_GUIDANCE);
    if (kind !== "agent") expect(inRunText).toContain(`- ${names.worker} (Agent) at /worker, already in this run`);
    // Nothing is added: the in-run collaborator stays the single instance (no duplicate, AC-006).
    expect(collaboratorsIn(await liveTree()).map((entry) => entry.agentRunId ?? entry.agent_run_id)).toEqual([collaboratorRunId]);
    record.inRunCandidates = candidates;

    // 7. REQ-012 / AC-013: with the Projects migration pending, delegation and DONE still work; Projects reject.
    let pendingTaskId: string | undefined;
    if (kind === "agent") {
      const released = path.join(dataDir, "projects", "projects.json");
      await fs.mkdir(path.dirname(released), { recursive: true });
      await fs.writeFile(released, "{\"projects\":[]}\n");
      try {
        await expect(graphql(`query{projects{projectId}}`)).rejects.toThrow(/PROJECTS_MIGRATION_PENDING|Projects data is being upgraded/);
        const pendingDelegation = await managerCalls(callTool("delegate_task", { recipient_address: reviewerAddress, description: "Reply OK." }));
        pendingTaskId = AD_HOC_ID.exec(pendingDelegation)?.[0];
        expect(pendingTaskId, pendingDelegation).toBeTruthy();
        const pendingFrom = view.frames.length;
        const pendingDone = await managerCalls(callTool("create_or_update_task", { task_id: pendingTaskId, status: "DONE" }));
        expect(pendingDone).not.toContain("PROJECTS_MIGRATION_PENDING");
        await until(() => view.frames.slice(pendingFrom).some(closedFrame), "closure while migration is pending", 60_000);
        expect((await readAdHocTask(pendingTaskId!)).status).toBe("DONE");
        const projectDuringPending = await managerCalls(callTool("create_or_update_task", { task_id: projectTaskId, status: "DONE" }));
        expect(projectDuringPending).toMatch(/PROJECTS_MIGRATION_PENDING|Projects data is being upgraded/);
      } finally {
        await fs.rm(released, { force: true });
      }
      record.pendingTaskId = pendingTaskId;
    }

    // 8. Stop: stored reads keep the closure and the collaborator (AC-008, AC-012).
    view.socket.close();
    inputChannel?.socket.close();
    await terminate(kind, rootId);
    const storedClosed = async (): Promise<Record<string, any>[]> => {
      if (kind === "agent") return (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration.root_agent.closed_task_executions;
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){closedTaskExecutions}}`, { id: rootId })).getTeamRunResumeConfig.closedTaskExecutions;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){closed_task_executions}}`, { id: rootId })).getAgentOrgRootHistory.closed_task_executions;
    };
    const closedAfterStop = await storedClosed();
    for (const ref of adHocRefs) expect(keys(closedAfterStop)).toContain(keyOf(ref));
    expect(collaboratorsIn(await liveTree()).map((entry) => entry.agentRunId ?? entry.agent_run_id)).toEqual([collaboratorRunId]);

    // 9. Restore by sending: the stored collaborator still answers by address; the closed copy stays closed.
    // An Org view attaches only to an active Org; the product restores a stopped Org explicitly before its stream.
    if (kind === "org") {
      const restored = (await graphql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).restoreAgentOrgRun;
      expect(restored.success, restored.message).toBe(true);
    }
    if (kind === "agent") inputChannel = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    view = await openView();
    active.push({ kind, rootId });
    const again = await managerCalls(callTool("send_message_to", { recipient_address: assistantAddress, content: "Reply OK again." }));
    expect(again).not.toMatch(/"isError":true|TASK_AGENT_RESOURCE/);
    expect(collaboratorsIn(await liveTree()).map((entry) => entry.agentRunId ?? entry.agent_run_id)).toEqual([collaboratorRunId]);
    const stillFenced = await managerCalls(callTool("send_message_to", { target_agent_run_id: copy.agentRunId, content: "Wake up." }));
    expect(stillFenced).toContain("TASK_AGENT_RESOURCE_CLOSED");
    expect(keys(snapshotOf(view.frames).closed)).toEqual(expect.arrayContaining(keys(adHocRefs)));
    view.socket.close();
    inputChannel?.socket.close();
    await terminate(kind, rootId);

    // 10. Permanent delete removes only this root's ad-hoc Tasks (AC-010): another root's ad-hoc Task and the Project Task stay.
    const other = await startRoot("agent");
    const otherInput = await connect("agent", other.rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const otherBefore = await adHocTaskIds();
    sendE2eSendMessageCommand(otherInput.socket, { agent_run_id: other.managerRunId,
      content: callTool("delegate_task", { recipient_address: reviewerAddress, description: "Reply OK." }) });
    let otherTaskId: string | undefined;
    await until(async () => { otherTaskId = (await adHocTaskIds()).find((id) => !otherBefore.includes(id)); return Boolean(otherTaskId); },
      "other root's ad-hoc Task", 60_000);
    const ownTasks = [adHocTaskId!, ...(pendingTaskId ? [pendingTaskId] : [])];
    await deletePermanently(kind, rootId);
    await until(async () => { const left = await adHocTaskIds(); return ownTasks.every((id) => !left.includes(id)); }, "own ad-hoc Tasks deleted", 30_000);
    expect(await exists(path.join(adHocRoot(), otherTaskId!, "task.json"))).toBe(true);
    expect((await projectTasks(projectId)).map((task) => task.taskId)).toEqual([projectTaskId]);
    otherInput.socket.close();
    await terminate("agent", other.rootId);
    await deletePermanently("agent", other.rootId);
    await until(async () => !(await adHocTaskIds()).includes(otherTaskId!), "other root's ad-hoc Task deleted with its run", 30_000);

    Object.assign(record, { rootId, managerRunId, projectId, projectTaskId, adHocTaskId, copy, subCopy, closedPayload,
      collaboratorRunId, storedAdHocTask: stored, delegated, rejectedDelegation, rejected, unknown, createWithoutProject, done, fenced,
      closedAfterStop, otherTaskId });
    evidence[kind] = record;
  };

  it("standalone Agent root: @ resolves, described delegation creates a text-only ad-hoc Task, DONE by task_id closes and fences, stored, migration pending, delete", async () => {
    await rootScenario("agent");
  }, 300000);

  it("Agent Team root: same journey through the Team stream (TASK_EXECUTIONS_CLOSED)", async () => {
    await rootScenario("team");
  }, 300000);

  it("Agent Org root: same journey through the Org stream", async () => {
    await rootScenario("org");
  }, 300000);
});
