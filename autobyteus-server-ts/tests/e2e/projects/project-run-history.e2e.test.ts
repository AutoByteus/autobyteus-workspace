import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// projects-left-navigation (autobyteus-347): runs started under a Project and the Project's runs (`projectRunHistory`),
// through the real Studio HTTP/WebSocket/GraphQL server, scoped MCP agent tools, Project/Task services, the
// Projects-owned `project_runs.json` and the AGY backend. Only the external AGY CLI is scripted
// (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes an agent call the real tool. No inference.
// - PRH-01 (AC-003, REQ-004/006): an Agent prepared under P (the web's start path) is recorded in P's file, is told its
//   Project at first activation (the AGY capsule's composed prompt), and lists under P and under its folder; run metadata
//   and history index rows keep the released keys (SR-009).
// - PRH-02 (RU-02): an unknown Project is refused on prepare, create and Team create with the existing start result; nothing is listed.
// - PRH-03 (AC-005, AC-003): a Team created under P lists in P's team group; its coordinator and member are told the Project.
// - PRH-04 (AC-006/007, REQ-008): scopes from real delegation by a root started under P (P Team, P Agent, Q Agent, Temp task).
// - PRH-05 (AC-007): the same from a Workspaces-started root: only its P copy under P; its Temp-task copy nowhere.
// - PRH-06 (AC-007, AC-008): a copy holding open Tasks of P and Q is listed under both; after P's Task closes, only under Q;
//   closing Q's Task closes it; reopen + the assigner's message brings it back.
// - PRH-07 (AC-009, REQ-010): an older run hosting P's open work is listed beyond the 6 newest and opens by run id.
// - PRH-08 (AC-002, AC-012): a Workspaces run that dispatched Tasks of three Projects is listed once under each; archived: none.
// - PRH-09 (AC-012, REQ-013): a deleted Project leaves the Project read; its runs stay in Workspaces; its file is kept.
// - PRH-10 (REQ-003/008): an Org root hosting P's Task is listed under P with only P's copy.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-run-history.e2e.test.ts --no-watch
// PROJECT_RUN_HISTORY_E2E_EVIDENCE_DIR=<dir> writes the observed reads and prompts as JSON evidence.
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "prh-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const PROJECT_RUN_HISTORY = `query($id:String!){projectRunHistory(projectId:$id){projectId
  agentDefinitions{agentDefinitionId runs{runId}} teamDefinitions{teamDefinitionId runs{teamRunId}}
  agentOrgRuns{root_run_id} scopes{rootKind rootRunId executions{agentRunId teamRunId}}}}`;
type ProjectRead = { agentRuns: string[]; agentRunsOf: (definitionId: string) => string[]; teamRuns: string[]; orgRuns: string[];
  scopeOf: (rootRunId: string) => string[] | undefined; raw: Rec };
const copyKey = (execution: Rec) => execution.teamRunId ? `team:${execution.teamRunId}` : `agent:${execution.agentRunId}`;
const promptSection = (name: string, projectId: string) => `## Project\n\nYou work in the Project ${name} (Project ID ${projectId}). `
  + "Use this Project ID with the Project tools; ask the user before working on another Project.";
/** Every object key of a JSON value, at any depth. */
const keysIn = (value: unknown): string[] => Array.isArray(value) ? value.flatMap(keysIn)
  : value && typeof value === "object" ? Object.entries(value).flatMap(([key, inner]) => [key, ...keysIn(inner)]) : [];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("Runs under a Project and projectRunHistory (real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const projects: Record<"P" | "Q" | "R", { projectId: string; name: string }> = {} as never;
  const tasks: Rec = {};
  const sockets: WebSocket[] = [];
  const evidence: Rec = {};
  type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
  let rootA: Root;
  let rootB: Root;
  const copies: Rec = {};

  const read = async (projectId: string): Promise<ProjectRead> => {
    const raw = (await h.graphql(PROJECT_RUN_HISTORY, { id: projectId })).projectRunHistory as Rec;
    const scopes = new Map<string, string[]>((raw.scopes as Rec[]).map((scope) => [scope.rootRunId, (scope.executions as Rec[]).map(copyKey).sort()]));
    return {
      agentRuns: (raw.agentDefinitions as Rec[]).flatMap((group) => (group.runs as Rec[]).map((run) => run.runId)),
      agentRunsOf: (definitionId) => ((raw.agentDefinitions as Rec[]).find((group) => group.agentDefinitionId === definitionId)?.runs as Rec[] ?? []).map((run) => run.runId),
      teamRuns: (raw.teamDefinitions as Rec[]).flatMap((group) => (group.runs as Rec[]).map((run) => run.teamRunId)),
      orgRuns: (raw.agentOrgRuns as Rec[]).map((run) => run.root_run_id),
      scopeOf: (rootRunId) => scopes.get(rootRunId),
      raw,
    };
  };
  const readError = (projectId: string) => h.graphql(PROJECT_RUN_HISTORY, { id: projectId }).then(() => "no error", (error) => String(error));
  const workspaceAgentRuns = async (): Promise<Map<string, string[]>> => {
    const groups = (await h.graphql(`query{listWorkspaceRunHistory{workspaceRootPath agentDefinitions{agentDefinitionId runs{runId}}}}`)).listWorkspaceRunHistory as Rec[];
    const found = new Map<string, string[]>();
    for (const group of groups) for (const definition of group.agentDefinitions as Rec[]) {
      found.set(`${group.workspaceRootPath}|${definition.agentDefinitionId}`, (definition.runs as Rec[]).map((run) => run.runId));
    }
    return found;
  };
  const allWorkspaceRunIds = async () => [...(await workspaceAgentRuns()).values()].flat();
  const projectRunsFile = (projectId: string) => path.join(h.dataDir, "projects", projectId, "project_runs.json");
  const readProjectRuns = async (projectId: string) => JSON.parse(await fs.readFile(projectRunsFile(projectId), "utf8")) as Rec;
  const createProject = async (name: string, folders: string[]) => (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}`,
    { input: { name, workspaces: folders.map((workspaceRootPath) => ({ workspaceRootPath, description: "folder" })) } })).createProject as { projectId: string; name: string };
  const createTask = async (projectId: string, description: string) => (await h.graphql(
    `mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, title: description, description } })).createProjectTask.taskId as string;
  const prepare = async (projectId?: string) => (await h.graphql(`mutation($input:CreateAgentRunInput!){prepareAgentRun(input:$input){success message runId}}`,
    { input: { agentDefinitionId: ids.manager, ...h.config(), ...(projectId ? { projectId } : {}) } })).prepareAgentRun as Rec;
  /** The first message to a prepared run (as the web's first send): activates it through the standalone lifecycle. */
  const firstSend = async (runId: string) => {
    const socket = new WebSocket(`ws://${h.url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Rec[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "prepared run stream connected");
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Reply OK." });
    let prompt = "";
    await until(async () => Boolean(prompt = await h.promptOf(runId).catch(() => "")), `run ${runId} activated (AGY capsule written)`, 60_000);
    return { prompt, close: () => socket.close() };
  };
  /** Stored run-record keys (run metadata and every history index), which must stay the released ones (SR-009). */
  const runRecordKeys = async (): Promise<string[]> => {
    const found: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "agy-project") await walk(full); continue; }
        if (entry.name === "run_metadata.json" || /run_history_index\.json$/.test(entry.name) || /run_execution_tree\.json$/.test(entry.name)) {
          found.push(...keysIn(JSON.parse(await fs.readFile(full, "utf8"))));
        }
      }
    };
    await walk(path.join(h.dataDir, "memory"));
    return [...new Set(found)];
  };

  beforeAll(async () => {
    h = await startCollaborationHarness("project-run-history-e2e");
    const suffix = randomUUID().slice(0, 6);
    for (const key of ["manager", "mate", "writer", "checker"]) names[key] = `PRH ${key} ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager, { toolNames: ["create_task", "update_task"] });
    ids.mate = await h.agentDefinition(names.mate);
    ids.writer = await h.agentDefinition(names.writer);
    ids.checker = await h.agentDefinition(names.checker);
    names.squad = `PRH Squad ${suffix}`;
    ids.squad = await h.teamDefinition(names.squad, [["reviewer", ids.writer], ["editor", ids.checker]], "reviewer");
    names.team = `PRH Delivery Team ${suffix}`;
    ids.team = await h.teamDefinition(names.team, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    ids.org = await h.orgDefinition(`PRH Org ${suffix}`, [
      { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "writer", ref: ids.writer, refType: "AGENT", refScope: "SHARED" }], []);
    // P's first linked folder is the harness workspace (every run below works there); Q has none; R has two.
    projects.P = await createProject(`Prototype Launch ${suffix}`, [h.workspace]);
    projects.Q = await createProject(`Docs Site ${suffix}`, []);
    const second = path.join(h.dataDir, "second-folder");
    await fs.mkdir(second);
    projects.R = await createProject(`Website ${suffix}`, [second, h.workspace]);
    for (const [key, project, text] of [["P1", "P", "Review the launch checklist."], ["P2", "P", "Write the release notes."],
      ["P3", "P", "Check the changelog."], ["P4", "P", "Org work for P."], ["Q1", "Q", "Check the docs links."], ["Q2", "Q", "Follow-up docs work."],
      ["Q3", "Q", "Docs work from Workspaces."], ["Q4", "Q", "Org work for Q."], ["R1", "R", "Website work from Workspaces."]] as const) {
      tasks[key] = await createTask(projects[project].projectId, text);
    }
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    const dir = process.env["PROJECT_RUN_HISTORY_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "project-run-history.json"), `${JSON.stringify({ projects, tasks, ids, ...evidence }, null, 2)}\n`);
    }
    await h?.close();
    if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
    if (home) await fs.rm(home, { recursive: true, force: true });
  }, 180_000);

  it("PRH-01: an Agent prepared under P is recorded in P's file, told its Project at first activation, listed under P and its folder; run records keep the released keys", async () => {
    const P = projects.P;
    const prepared = await prepare(P.projectId);
    expect(prepared.success, prepared.message).toBe(true);
    const runId = prepared.runId as string;
    const stored = await readProjectRuns(P.projectId);
    expect(Object.keys(stored).sort()).toEqual(["projectId", "runs"]);
    expect(stored.projectId).toBe(P.projectId);
    expect(stored.runs).toEqual([{ root: { kind: "agent", runId }, linkedAt: expect.any(String) }]);
    const listed = await read(P.projectId);
    expect(listed.agentRunsOf(ids.manager)).toEqual([runId]);
    expect(listed.scopeOf(runId)).toEqual([]);
    expect((await workspaceAgentRuns()).get(`${h.workspace}|${ids.manager}`)).toEqual([runId]);
    const { prompt, close } = await firstSend(runId);
    close();
    expect(prompt).toContain(promptSection(P.name, P.projectId));
    // Released run-record keys: nothing named like a Project anywhere in metadata, index rows or trees.
    const keys = await runRecordKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key) => /project/i.test(key))).toEqual([]);
    evidence.prh01 = { runId, stored, prompt: prompt.slice(prompt.indexOf("## Project"), prompt.indexOf("## Project") + 260), runRecordKeys: keys.sort() };
    ids.preparedUnderP = runId;
    await h.terminate("agent", runId).catch(() => undefined);
  }, 180_000);

  it("PRH-02: an unknown Project is refused on prepare, create and Team create ('Project … was not found.'; the Project read answers PROJECT_NOT_FOUND); nothing is listed or recorded", async () => {
    const missing = `project_${randomUUID()}`;
    const before = await allWorkspaceRunIds();
    const outcome = async (operation: Promise<unknown>) => operation.then((value) => JSON.stringify(value), (error) => String(error));
    const prepared = await outcome(prepare(missing));
    const created = await outcome(h.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...h.config(), projectId: missing } }));
    const team = await outcome(h.graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...h.config() }], memberConfigs: [
        { memberAddress: "/manager", agentDefinitionId: ids.manager, ...h.config() },
        { memberAddress: "/mate", agentDefinitionId: ids.mate, ...h.config() }], projectId: missing } }));
    // Run creation answers with the existing start result (design § Risks): `success: false` and the ProjectError's message
    // (ProjectRunService throws ProjectError(PROJECT_NOT_FOUND)); the Project read carries the code itself.
    for (const result of [prepared, created, team]) {
      expect(result).toContain('"success":false');
      expect(result).toContain(`Project '${missing}' was not found.`);
    }
    expect(await allWorkspaceRunIds()).toEqual(before);
    const teams = (await h.graphql(`query{listWorkspaceRunHistory{teamDefinitions{runs{teamRunId}}}}`)).listWorkspaceRunHistory as Rec[];
    expect(teams.flatMap((group) => group.teamDefinitions as Rec[])).toEqual([]);
    expect(await fs.access(path.join(h.dataDir, "projects", missing)).then(() => true, () => false)).toBe(false);
    expect(await readError(missing)).toContain("PROJECT_NOT_FOUND");
    evidence.prh02 = { missing, prepared, created, team };
  }, 120_000);

  it("PRH-03: a Team created under P lists in P's team group; its coordinator and member are told the Project", async () => {
    const P = projects.P;
    const team = await h.startRoot("team", ids, { projectId: P.projectId });
    expect((await readProjectRuns(P.projectId)).runs).toContainEqual({ root: { kind: "agent_team", runId: team.rootId }, linkedAt: expect.any(String) });
    expect((await read(P.projectId)).teamRuns).toEqual([team.rootId]);
    // The coordinator messages its teammate, which activates both members (lazy member activation).
    const sent = await team.calls(team.managerRunId, "/manager", callTool("send_message_to", { recipient_address: "/mate", content: "Reply OK." }));
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
    let matePrompt = "";
    await until(async () => Boolean(matePrompt = await h.promptOf(team.members["/mate"]!).catch(() => "")), "teammate activated", 60_000);
    const coordinatorPrompt = await h.promptOf(team.managerRunId);
    expect(coordinatorPrompt).toContain(promptSection(P.name, P.projectId));
    expect(matePrompt).toContain(promptSection(P.name, P.projectId));
    // A Team not under a Project: no Project section.
    const plain = await h.startRoot("team", ids);
    await plain.calls(plain.managerRunId, "/manager", callTool("send_message_to", { recipient_address: "/mate", content: "Reply OK." }));
    expect(await h.promptOf(plain.managerRunId)).not.toContain("## Project");
    expect((await read(P.projectId)).teamRuns).toEqual([team.rootId]);
    evidence.prh03 = { teamRunId: team.rootId, members: team.members, plainTeamRunId: plain.rootId };
    team.close(); plain.close();
    await h.terminate("team", team.rootId);
    await h.terminate("team", plain.rootId);
  }, 240_000);

  it("PRH-04: a root started under P: P lists its P Team, P Agent and Temp-task copies; Q lists the root with only its Q copy; R does not list it", async () => {
    const { P, Q, R } = projects;
    rootA = await h.startRoot("agent", ids, { projectId: P.projectId });
    const team = await rootA.calls(rootA.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.squad)}`, task_id: tasks.P1 }));
    const writer = await rootA.calls(rootA.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: tasks.P2 }));
    const checker = await rootA.calls(rootA.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.checker)}`, task_id: tasks.Q1 }));
    const temp = await rootA.calls(rootA.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, description: "Reply OK." }));
    for (const result of [team, writer, checker, temp]) expect(result.delegated, JSON.stringify(result)).toBe(true);
    Object.assign(copies, { aTeam: `team:${team.target_team_run_id}`, aWriter: `agent:${writer.target_agent_run_id}`,
      aChecker: `agent:${checker.target_agent_run_id}`, aTemp: `agent:${temp.target_agent_run_id}`, aWriterId: writer.target_agent_run_id });
    expect(await h.promptOf(rootA.rootId)).toContain(promptSection(P.name, P.projectId));
    const [p, q, r] = [await read(P.projectId), await read(Q.projectId), await read(R.projectId)];
    expect(p.agentRunsOf(ids.manager).filter((id) => id === rootA.rootId)).toHaveLength(1);
    expect(p.scopeOf(rootA.rootId)).toEqual([copies.aTeam, copies.aWriter, copies.aTemp].sort());
    expect(q.agentRunsOf(ids.manager)).toEqual([rootA.rootId]);
    expect(q.scopeOf(rootA.rootId)).toEqual([copies.aChecker]);
    expect(r.agentRuns).not.toContain(rootA.rootId);
    evidence.prh04 = { rootA: rootA.rootId, copies: { ...copies }, P: p.raw.scopes, Q: q.raw.scopes };
  }, 240_000);

  it("PRH-05: a Workspaces-started root: only its P copy under P; its Temp-task copy under no Project; it is not recorded", async () => {
    const { P, Q } = projects;
    rootB = await h.startRoot("agent", ids);
    const pCopy = await rootB.calls(rootB.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: tasks.P3 }));
    const temp = await rootB.calls(rootB.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.checker)}`, description: "Reply OK." }));
    expect(pCopy.delegated && temp.delegated, JSON.stringify([pCopy, temp])).toBe(true);
    Object.assign(copies, { bP: `agent:${pCopy.target_agent_run_id}`, bTemp: `agent:${temp.target_agent_run_id}` });
    expect(await h.promptOf(rootB.rootId)).not.toContain("## Project");
    const p = await read(P.projectId);
    expect(p.scopeOf(rootB.rootId)).toEqual([copies.bP]);
    expect((await read(Q.projectId)).agentRuns).not.toContain(rootB.rootId);
    expect((await readProjectRuns(P.projectId)).runs.map((entry: Rec) => entry.root.runId)).not.toContain(rootB.rootId);
    evidence.prh05 = { rootB: rootB.rootId, P: p.raw.scopes };
  }, 180_000);

  it("PRH-06: a copy holding open Tasks of P and Q is listed under both; after P's Task closes only under Q; Q's DONE closes it; reopen + message brings it back", async () => {
    const { P, Q } = projects;
    const followUp = await rootA.calls(rootA.rootId, "/", callTool("delegate_task", { target_agent_run_id: copies.aWriterId, task_id: tasks.Q2 }));
    expect(followUp.delegated, JSON.stringify(followUp)).toBe(true);
    await until(async () => (await read(Q.projectId)).scopeOf(rootA.rootId)?.includes(copies.aWriter) ?? false, "copy listed under Q", 30_000);
    expect((await read(P.projectId)).scopeOf(rootA.rootId)).toContain(copies.aWriter);
    expect((await read(Q.projectId)).scopeOf(rootA.rootId)).toEqual([copies.aChecker, copies.aWriter].sort());
    const bothAt = { P: (await read(P.projectId)).raw.scopes, Q: (await read(Q.projectId)).raw.scopes };
    await rootA.calls(rootA.rootId, "/", callTool("update_task", { task_id: tasks.P2, status: "DONE" }));
    await until(async () => !(await read(P.projectId)).scopeOf(rootA.rootId)?.includes(copies.aWriter), "copy left P after P's Task closed", 30_000);
    expect((await read(Q.projectId)).scopeOf(rootA.rootId)).toContain(copies.aWriter);
    const closedOf = async () => ((await h.graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootA.rootId }))
      .agentRunCollaboration.root_agent.closed_task_executions as Rec[]).map(copyKey);
    expect(await closedOf()).not.toContain(copies.aWriter);
    // Closing its last open Task closes the copy (AC-008); it stays in Q's scope (its latest Task) and the closed list hides it.
    await rootA.calls(rootA.rootId, "/", callTool("update_task", { task_id: tasks.Q2, status: "DONE" }));
    await until(async () => (await closedOf()).includes(copies.aWriter), "copy closed after Q's Task DONE", 60_000);
    expect((await read(P.projectId)).scopeOf(rootA.rootId)).not.toContain(copies.aWriter);
    expect((await read(Q.projectId)).scopeOf(rootA.rootId)).toContain(copies.aWriter);
    // Reopen + the assigner's message reactivates it.
    await rootA.calls(rootA.rootId, "/", callTool("update_task", { task_id: tasks.Q2, status: "IN_PROGRESS" }));
    const message = await rootA.calls(rootA.rootId, "/", callTool("send_message_to", { target_agent_run_id: copies.aWriterId, content: "Second round." }));
    expect(message.isError, JSON.stringify(message)).toBe(false);
    await until(async () => !(await closedOf()).includes(copies.aWriter), "copy reactivated", 60_000);
    expect((await read(Q.projectId)).scopeOf(rootA.rootId)).toContain(copies.aWriter);
    evidence.prh06 = { followUp, bothAt, afterReopen: (await read(Q.projectId)).raw.scopes };
  }, 300_000);

  it("PRH-07: an older run hosting P's open work is listed under P beyond the 6 newest and opens by run id", async () => {
    const P = projects.P;
    const newer: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      await sleep(20);
      const prepared = await prepare(P.projectId);
      expect(prepared.success, prepared.message).toBe(true);
      newer.push(prepared.runId);
    }
    const workspace = (await workspaceAgentRuns()).get(`${h.workspace}|${ids.manager}`)!;
    expect(workspace).toHaveLength(6);
    expect(workspace).not.toContain(rootA.rootId);
    const listed = (await read(P.projectId)).agentRunsOf(ids.manager);
    // The 6 newest, plus the older runs hosting P's open work: rootA (started under P) and rootB (a Workspaces run).
    expect(listed.sort()).toEqual([...newer, rootA.rootId, rootB.rootId].sort());
    // The earliest run under P hosts no open work of P and is beyond the cap.
    expect(listed).not.toContain(ids.preparedUnderP);
    const projection = (await h.graphql(`query($id:String!){getRunProjection(runId:$id){runId conversation}}`, { id: rootA.rootId })).getRunProjection;
    expect(projection.runId).toBe(rootA.rootId);
    expect(JSON.stringify(projection.conversation)).toContain("delegate_task");
    evidence.prh07 = { workspace, listed, newer };
  }, 180_000);

  it("PRH-08: a Workspaces run that dispatched Tasks of three Projects is listed once under each with the same id; archived, it is listed nowhere", async () => {
    const { P, Q, R } = projects;
    for (const taskId of [tasks.Q3, tasks.R1]) {
      const result = await rootB.calls(rootB.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: taskId }));
      expect(result.delegated, JSON.stringify(result)).toBe(true);
    }
    const reads = { P: await read(P.projectId), Q: await read(Q.projectId), R: await read(R.projectId) };
    for (const [key, listed] of Object.entries(reads)) {
      expect(listed.agentRunsOf(ids.manager).filter((id) => id === rootB.rootId), key).toHaveLength(1);
      expect(listed.scopeOf(rootB.rootId), key).toHaveLength(1);
    }
    rootB.close();
    await h.terminate("agent", rootB.rootId);
    const archived = (await h.graphql(`mutation($id:String!){archiveStoredRun(runId:$id){success message}}`, { id: rootB.rootId })).archiveStoredRun;
    expect(archived.success, archived.message).toBe(true);
    for (const project of [P, Q, R]) expect((await read(project.projectId)).agentRuns).not.toContain(rootB.rootId);
    expect(await allWorkspaceRunIds()).not.toContain(rootB.rootId);
    evidence.prh08 = { rootB: rootB.rootId, scopes: Object.fromEntries(Object.entries(reads).map(([key, value]) => [key, value.scopeOf(rootB.rootId)])) };
  }, 180_000);

  it("PRH-09: a deleted Project leaves the Project read; its runs stay in Workspaces; its file is kept; starting under it is refused", async () => {
    const D = await createProject(`Deleted Project ${randomUUID().slice(0, 6)}`, [h.workspace]);
    const prepared = await prepare(D.projectId);
    expect(prepared.success, prepared.message).toBe(true);
    expect((await read(D.projectId)).agentRuns).toEqual([prepared.runId]);
    expect((await h.graphql(`mutation($id:String!){deleteProject(projectId:$id)}`, { id: D.projectId })).deleteProject).toBe(true);
    expect(await readError(D.projectId)).toContain("PROJECT_NOT_FOUND");
    expect(((await h.graphql(`query{projects{projectId}}`)).projects as Rec[]).map((project) => project.projectId)).not.toContain(D.projectId);
    expect(await allWorkspaceRunIds()).toContain(prepared.runId);
    expect((await readProjectRuns(D.projectId)).runs.map((entry: Rec) => entry.root.runId)).toEqual([prepared.runId]);
    const again = await prepare(D.projectId).then((value) => JSON.stringify(value), (error) => String(error));
    expect(again).toContain('"success":false');
    expect(again).toContain(`Project '${D.projectId}' was not found.`);
    evidence.prh09 = { projectId: D.projectId, runId: prepared.runId, again };
  }, 120_000);

  it("PRH-10: an Org root hosting P's Task is listed under P with only P's copy, and under Q with only Q's copy", async () => {
    const { P, Q } = projects;
    const org = await h.startRoot("org", ids);
    const pCopy = await org.calls(org.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/writer", task_id: tasks.P4 }));
    const qCopy = await org.calls(org.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/writer", task_id: tasks.Q4 }));
    expect(pCopy.delegated && qCopy.delegated, JSON.stringify([pCopy, qCopy])).toBe(true);
    const [p, q] = [await read(P.projectId), await read(Q.projectId)];
    expect(p.orgRuns).toEqual([org.rootId]);
    expect(p.scopeOf(org.rootId)).toEqual([`agent:${pCopy.target_agent_run_id}`]);
    expect(q.scopeOf(org.rootId)).toEqual([`agent:${qCopy.target_agent_run_id}`]);
    expect((p.raw.scopes as Rec[]).find((scope) => scope.rootRunId === org.rootId)?.rootKind).toBe("AGENT_ORG");
    evidence.prh10 = { orgRunId: org.rootId, P: p.scopeOf(org.rootId), Q: q.scopeOf(org.rootId) };
    org.close();
    await h.terminate("org", org.rootId);
    rootA.close();
  }, 180_000);
});
