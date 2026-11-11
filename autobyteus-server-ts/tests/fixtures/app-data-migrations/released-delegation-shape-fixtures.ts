import fs from "node:fs/promises";
import path from "node:path";

/**
 * Hand-built stored data for `20261111_delegated_runs_own_runs_v1` (autobyteus-461), in the shapes released before it,
 * after contract §13 (TESTING.md: never real data or a copy of it). The runs of the contract's examples:
 * the manager M (a standalone run the user started), the engineering team E and the product team P (delegated team
 * runs), the image agent I (a delegated agent run, sub-work of P), the marketing team (a team run the user started),
 * the company org, a research team on a peer node, a legacy delegated run, and a run a peer started on this node.
 */
export const M = "project_task_manager_7c8d";
export const E = "software_engineering_team_0218";
export const P = "product_team_e03d";
export const I = "image_maker_33f0";
export const MARKETING = "marketing_team_5a00";
export const ORG = "company_org_9d00";
export const RESEARCH = "research_team_77aa";
export const LEGACY = "legacy_helper_0001";
export const PEER_STARTED = "peer_started_writer_0002";
export const T0 = "2026-11-10T09:39:18.439Z";
export const T1 = "project_task_440e";
export const T2 = "ad_hoc_task_research";
export const PROJECT = "project_p";

export type World = Readonly<{ appData: string; memory: string }>;
type Json = Record<string, unknown>;

const launch = (model: string, workspaceRootPath: string | null = "/work/x") => ({
  runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath });
const selection = (model: string) => ({ llmModelIdentifier: model, llmConfig: { temperature: 0.2 }, selectedAt: T0 });
const agentSource = { origin: "agent_default", fallbacks: [] };
const link = (run: Json, address: string, delegatorAgentRunId: string) => ({ address, ...run, startedAt: T0, delegatorAgentRunId });

export const put = async (file: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value, null, 2));
};
export const readJson = async (file: string): Promise<any> => JSON.parse(await fs.readFile(file, "utf8"));
export const exists = (file: string): Promise<boolean> => fs.access(file).then(() => true, () => false);

export const paths = (world: World) => ({
  agentFile: (runId: string) => path.join(world.memory, "agents", runId, "run_metadata.json"),
  standaloneTree: (runId: string) => path.join(world.memory, "agents", runId, "collaboration", "collaboration_tree.json"),
  /** The released place of a user-started run's log (`collaboration/`), and its place after TC-13 (the run folder). */
  standaloneLog: (runId: string) => path.join(world.memory, "agents", runId, "collaboration", "communication_messages_active.jsonl"),
  runLog: (runId: string) => path.join(world.memory, "agents", runId, "communication_messages_active.jsonl"),
  teamFile: (runId: string) => path.join(world.memory, "agent_teams", runId, "team_run_execution_tree.json"),
  orgFile: (runId: string) => path.join(world.memory, "agent_orgs", runId, "agent_org_run_execution_tree.json"),
  taskRecord: (taskId: string) => path.join(world.appData, "projects", PROJECT, "tasks", taskId, "agent_run_resources.json"),
  adHocRecord: (taskId: string) => path.join(world.appData, "ad-hoc-tasks", taskId, "agent_run_resources.json"),
  busyRuns: () => path.join(world.appData, "restart-resume", "busy-runs.json"),
  agentIndex: () => path.join(world.memory, "run_history_index.json"),
  teamIndex: () => path.join(world.memory, "team_run_history_index.json"),
});

const agentMetadata = (runId: string, agentDefinitionId: string, extra: Json = {}): Json => ({
  runId, agentDefinitionId, workspaceRootPath: "/work/x", memoryDir: `/m/agents/${runId}`, llmModelIdentifier: "sonnet", llmConfig: null,
  autoExecuteTools: true, runtimeKind: "autobyteus", platformAgentRunId: null, startedAt: T0, ...extra });
const teamMember = (address: string, agentRunId: string, extra: Json = {}): Json => ({
  address, agentDefinitionId: address.split("/").pop(), role: null, description: null, agentRunId, platformAgentRunId: null,
  launchConfiguration: launch("sonnet"), ...extra });

/** A delegated team's own file as released (`taskAgent`, mounted address, `followsTeam` on every member). */
export const releasedTeamOwnFile = (teamRunId: string, address: string, members: Json[], taskAgent: Json, handoffs: unknown[] = []): Json => ({
  createdAt: T0, archivedAt: null, applicationBinding: null, handoffs,
  rootTeam: { address, teamDefinitionId: address.slice(1).replace(/_/g, "-"), teamRunId, coordinatorAddress: members[0]!.address,
    defaultLaunchConfiguration: launch("sonnet"), members, taskExecutions: [] },
  taskAgent,
});

/** The main scenario (§4, §13) in its released shapes. */
export const writeReleasedWorld = async (world: World): Promise<void> => {
  const at = paths(world);
  // M: a standalone run the user started; its tree holds an old local link and a peer link (E8, E3).
  await put(at.agentFile(M), agentMetadata(M, "project-task-manager"));
  await put(at.standaloneTree(M), { subjectKind: "agent", createdAt: T0,
    host: { address: "/project_task_manager", agentRunId: M, agentDefinitionId: "project-task-manager" }, collaborators: [],
    taskExecutions: [link({ teamRunId: E }, "/software_engineering_team", M),
      { address: "/research_team", teamRunId: RESEARCH, nodeId: "node-b-1f0e", coordinatorAddress: "/research_team/lead",
        members: [{ address: "/research_team/lead", agentRunId: "lead_0c11" }, { address: "/research_team/analyst", agentRunId: "analyst_5d20" }],
        delegatorAgentRunId: M, startedAt: T0 }] });
  await put(at.standaloneLog(M), "{\"messageId\":\"m1\"}\n");
  // E: a delegated team (D1), with a team-level Settings edit (followers take it) and a member's own edit.
  await put(at.teamFile(E), releasedTeamOwnFile(E, "/software_engineering_team", [
    teamMember("/software_engineering_team/solution_designer", "solution_designer_65a9", { followsTeam: true }),
    teamMember("/software_engineering_team/code_reviewer", "code_reviewer_m_3b10", { followsTeam: false, launchSource: agentSource, userLaunchSelection: selection("opus") }),
    teamMember("/software_engineering_team/tester", "tester_m_77", { followsTeam: false, launchSource: agentSource }),
  ], { coordinatingRun: { kind: "agent", runId: M }, delegatorAgentRunId: M, address: "/software_engineering_team",
    launchSource: { origin: "team_default", fallbacks: [] }, userLaunchSelection: selection("haiku") },
  [{ from: "/software_engineering_team/solution_designer", to: "/Teacher", rules: ["When the plan is ready."] }]));
  // P: nested (D5/E2): delegated by E's designer, while today's coordinating run is the manager.
  await put(at.teamFile(P), releasedTeamOwnFile(P, "/product_team", [teamMember("/product_team/product_designer", "product_designer_1a2b", { followsTeam: true })],
    { coordinatingRun: { kind: "agent", runId: M }, delegatorAgentRunId: "solution_designer_65a9", address: "/product_team" }));
  // I: a delegated agent run, sub-work of P (D6-like, E6 agent).
  await put(at.agentFile(I), agentMetadata(I, "image-maker", { taskAgent: { coordinatingRun: { kind: "agent", runId: M },
    delegatorAgentRunId: "product_designer_1a2b", address: "/image_maker", launchSource: agentSource } }));
  // A legacy delegated run without a recorded delegator and without a Task record (E6 / E7).
  await put(at.agentFile(LEGACY), agentMetadata(LEGACY, "helper", { taskAgent: { coordinatingRun: { kind: "agent_team", runId: MARKETING }, address: "/helper" } }));
  // A run a peer started on this node (E10).
  await put(at.agentFile(PEER_STARTED), agentMetadata(PEER_STARTED, "writer", {
    delegatedFrom: { nodeId: "node-a-77d2", coordinatingRun: { kind: "agent", runId: "far_manager" }, delegatorAgentRunId: "far_manager" } }));
  // A team the user started and an org (E9): their own units only, after the lists go.
  await put(at.teamFile(MARKETING), { createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [], collaborators: [],
    rootTeam: { address: "/", teamDefinitionId: "marketing-team", teamDefinitionName: "Marketing", teamRunId: MARKETING, coordinatorAddress: "/copywriter",
      defaultLaunchConfiguration: launch("sonnet"), members: [teamMember("/copywriter", "copywriter_77c1")], taskExecutions: [] } });
  await put(at.orgFile(ORG), { subjectKind: "agent_org", createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [],
    rootOrg: { address: "/", orgDefinitionId: "company", orgDefinitionName: "Company", orgRunId: ORG, defaultLaunchConfiguration: launch("sonnet"),
      members: [teamMember("/ceo", "ceo_agent_1f2e"), { address: "/dev_team", teamDefinitionId: "dev-team", teamRunId: "dev_team_9", members: [teamMember("/dev_team/lead", "dev_lead_4c3d")], taskExecutions: [] }],
      taskExecutions: [] } });
  // T1 (E1, E2, E4), T2 with no Project (E3).
  await put(at.taskRecord(T1), { taskId: T1, agentRunResources: [
    { role: "assigned", assignedBy: M, recipientAddress: "/software_engineering_team", hostRoot: { kind: "agent", runId: M },
      agentRun: { kind: "team", teamRunId: E, coordinatorAgentRunId: "solution_designer_65a9" }, linkedAt: T0, start: "started", closedAt: null },
    { role: "delegated", hostRoot: { kind: "agent", runId: M }, agentRun: { kind: "team", teamRunId: P, coordinatorAgentRunId: "product_designer_1a2b" },
      linkedAt: T0, start: "started", closedAt: null },
    { role: "delegated", hostRoot: { kind: "agent", runId: M }, agentRun: { kind: "agent", agentRunId: I }, linkedAt: T0, start: "started", closedAt: null },
  ] });
  await put(at.adHocRecord(T2), { taskId: T2, agentRunResources: [
    { role: "assigned", assignedBy: M, hostRoot: { kind: "agent", runId: M },
      agentRun: { kind: "team", teamRunId: RESEARCH, coordinatorAgentRunId: "lead_0c11" }, linkedAt: T0, start: "started", closedAt: null },
  ] });
  // An update restart was interrupted with two delegated runs busy under the manager's root (step 7).
  await put(at.busyRuns(), { entries: [
    { root: { rootSubjectKind: "agent", rootRunId: M }, agentRunId: "product_designer_1a2b", place: "delegated", status: "running", recordedAt: T0, version: "1.0.0" },
    { root: { rootSubjectKind: "agent", rootRunId: M }, agentRunId: I, place: "delegated", status: "running", recordedAt: T0, version: "1.0.0" },
    { root: { rootSubjectKind: "agent", rootRunId: M }, agentRunId: M, place: "host", status: "running", recordedAt: T0, version: "1.0.0" },
  ] });
  await put(at.agentIndex(), [{ runId: M, agentDefinitionId: "project-task-manager", agentName: "Project Task Manager", workspaceRootPath: "/work/x",
    summary: "Plan", createdAt: T0, archivedAt: null, terminatedAt: null, hasCollaboration: true }]);
  await put(at.teamIndex(), [{ teamRunId: MARKETING, teamDefinitionId: "marketing-team", teamDefinitionName: "Marketing", workspaceRootPath: "/work/x",
    summary: "", createdAt: T0, archivedAt: null, terminatedAt: null }]);
};
