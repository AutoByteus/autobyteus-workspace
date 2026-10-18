import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../../run-history/store/team-run-execution-tree-store.js";
import { readRawTreeFile } from "../../../run-history/store/task-execution-tree-split.js";
import { getTeamRunExecutionTreePath } from "../../../run-history/store/team-run-execution-tree-path.js";
import { getStandaloneRootTreePath } from "../../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { AgentRunHistoryCatalogService } from "../../../run-history/services/agent-run-history-catalog-service.js";
import { TeamRunHistoryCatalogService } from "../../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunPackageCatalog } from "../../../run-history/services/team-run-package-catalog.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/** The facts adoption checks about a run the user started (design SR-008, DS-001 narrative). */
export type HandStartedRun = Readonly<{
  execution: TaskExecutionReference;
  kind: "agent" | "agent_team";
  definitionId: string;
  /** The run's own workspace (a team: every member's); `null` when a launch records none. */
  workspaces: readonly (string | null)[];
  applicationBound: boolean;
  archived: boolean;
  /** Entries in the run's own collaboration tree (delegated runs of its own; REQ-007). */
  ownTaskExecutions: number;
  /** The ingress that receives the Task: the agent run, or the team's coordinator. */
  ingressAgentRunId: string;
}>;

/**
 * A run named by its own ID: the hand-started run; else a refusal about a run the user started (named with the
 * wrong field, never started, an organization run), or `null` when it is no run the user started at all (the
 * caller keeps today's "not one of your task agents" refusal).
 */
export type HandStartedRunLookup = Readonly<{ found: true; run: HandStartedRun }> | Readonly<{ found: false; refusal: string | null }>;

/** The hand-off of a run from its own session (DEC-104): `busy` while a turn runs. */
export type HandStartedRunRelease = "released" | "busy";

/** What adoption needs to read and change about runs the user started; injectable for tests. */
export interface HandStartedRuns {
  find(target: TaskExecutionReference): Promise<HandStartedRunLookup>;
  /** A turn is running (read-only; wakes and stops nothing). */
  isBusy(target: TaskExecutionReference): Promise<boolean>;
  release(target: TaskExecutionReference): Promise<HandStartedRunRelease>;
  /** Step 4: the run leaves the user's history and its admission (a team: `TeamRunPackageCatalog.exclude`). */
  removeFromHistory(target: TaskExecutionReference): Promise<void>;
  /** The run still has its row in its history index (true until step 4). */
  isListed(target: TaskExecutionReference): Promise<boolean>;
  /** Revert: the run (its row never removed) is admitted again. */
  readmit(target: TaskExecutionReference): Promise<void>;
}

const BUSY: readonly string[] = ["running", "initializing"];
const exists = (filePath: string): Promise<boolean> => fs.stat(filePath).then(() => true, () => false);


type AgentRuns = Pick<import("../../../agent-execution/services/agent-run-manager.js").AgentRunManager, "getActiveRun" | "tryPrepareAgentRunTerminationIfQuiescent">;
type TeamRuns = Pick<import("../../../agent-team-execution/services/agent-team-run-manager.js").AgentTeamRunManager,
  "getManagedTeamRun" | "terminateTeamRun" | "withInactiveHistoryMutation">;
type StandaloneRoots = Readonly<{ endRoot(runId: string): Promise<void> }>;

/** The run managers adoption hands a run over from; each defaults to the process instance, resolved on first use. */
export type HandStartedRunManagers = Readonly<{ agentRuns?: AgentRuns; teamRuns?: TeamRuns; standaloneRoots?: StandaloneRoots | null }>;

/** The process implementation over the memory root, the history catalogs and the run managers. */
export class ProcessHandStartedRuns implements HandStartedRuns {
  private readonly layout: AgentMemoryLayout;
  private readonly agentHistory: AgentRunHistoryCatalogService;
  private teamCatalog: TeamRunHistoryCatalogService | null = null;
  constructor(private readonly memoryDir: string, private readonly managers: HandStartedRunManagers = {}) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.agentHistory = new AgentRunHistoryCatalogService(memoryDir);
  }

  private async agentRuns(): Promise<AgentRuns> {
    return this.managers.agentRuns ?? (await import("../../../agent-execution/services/agent-run-manager.js")).AgentRunManager.getInstance();
  }
  private async teamRuns(): Promise<TeamRuns> {
    return this.managers.teamRuns ?? (await import("../../../agent-team-execution/services/agent-team-run-manager.js")).AgentTeamRunManager.getInstance();
  }
  private async standaloneRoots(): Promise<StandaloneRoots | null> {
    if (this.managers.standaloneRoots !== undefined) return this.managers.standaloneRoots;
    return (await import("../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js")).findStandaloneAgentRunRootManager();
  }
  private async teamHistory(): Promise<TeamRunHistoryCatalogService> {
    return this.teamCatalog ??= new TeamRunHistoryCatalogService(this.memoryDir, { teamRunManager: await this.teamRuns() });
  }

  async find(target: TaskExecutionReference): Promise<HandStartedRunLookup> {
    return "agentRunId" in target ? this.findAgent(target.agentRunId) : this.findTeam(target.teamRunId);
  }

  async isBusy(target: TaskExecutionReference): Promise<boolean> {
    if ("agentRunId" in target) {
      const run = (await this.agentRuns()).getActiveRun(target.agentRunId);
      return Boolean(run && BUSY.includes(run.getStatusSnapshot().status));
    }
    const team = (await this.teamRuns()).getManagedTeamRun(target.teamRunId);
    return Boolean(team?.getLeafAgentStatusSnapshots().some((snapshot) => BUSY.includes(snapshot.details.status)));
  }

  async release(target: TaskExecutionReference): Promise<HandStartedRunRelease> {
    if ("agentRunId" in target) {
      const manager = await this.agentRuns();
      const run = manager.getActiveRun(target.agentRunId);
      if (run) {
        const prepared = await manager.tryPrepareAgentRunTerminationIfQuiescent(run);
        if (!prepared) return "busy";
        const finished = await prepared.commit().finish();
        if (!finished.accepted) throw new Error(finished.message ?? `Agent run '${target.agentRunId}' did not stop.`);
      }
      await (await this.standaloneRoots())?.endRoot(target.agentRunId);
      return "released";
    }
    const manager = await this.teamRuns();
    const team = manager.getManagedTeamRun(target.teamRunId);
    if (!team) return "released";
    const busy = team.getLeafAgentStatusSnapshots().some((snapshot) => BUSY.includes(snapshot.details.status));
    if (busy) return "busy";
    if (!await manager.terminateTeamRun(target.teamRunId)) throw new Error(`Team run '${target.teamRunId}' did not stop.`);
    return "released";
  }

  async removeFromHistory(target: TaskExecutionReference): Promise<void> {
    if ("agentRunId" in target) await this.agentHistory.removeAdoptedRun(target.agentRunId);
    else await (await this.teamHistory()).removeAdoptedTeamRun(target.teamRunId);
  }

  async isListed(target: TaskExecutionReference): Promise<boolean> {
    return "agentRunId" in target
      ? Boolean(await this.agentHistory.indexedRowOf(target.agentRunId))
      : Boolean(await (await this.teamHistory()).indexedRowOf(target.teamRunId));
  }

  readmit(target: TaskExecutionReference): Promise<void> {
    return "agentRunId" in target
      ? this.agentHistory.readmitHandStartedRun(target.agentRunId)
      : this.teamHistory().then((history) => history.readmitHandStartedTeamRun(target.teamRunId));
  }

  private async findAgent(agentRunId: string): Promise<HandStartedRunLookup> {
    const metadata = await new AgentRunMetadataStore(this.memoryDir).readMetadata(agentRunId);
    const row = metadata && await this.agentHistory.indexedRowOf(agentRunId);
    if (!metadata || !row) return { found: false, refusal: await this.otherUserStartedRunOf(agentRunId) };
    if (!metadata.startedAt) return { found: false, refusal: `${agentRunId} was prepared but never started, so it has no conversation to continue. Delegate the Task to a new task agent with recipient_address.` };
    const tree = await readRawTreeFile(getStandaloneRootTreePath(this.layout.getAgentRunCollaborationDirPath(agentRunId)));
    return { found: true, run: Object.freeze({
      execution: Object.freeze({ agentRunId }), kind: "agent", definitionId: metadata.agentDefinitionId,
      workspaces: [metadata.workspaceRootPath],
      applicationBound: Boolean(metadata.launchPurpose || metadata.applicationExecutionContext),
      archived: Boolean(row.archivedAt), ownTaskExecutions: Array.isArray(tree?.taskExecutions) ? tree.taskExecutions.length : 0,
      ingressAgentRunId: agentRunId,
    }) };
  }

  private async findTeam(teamRunId: string): Promise<HandStartedRunLookup> {
    const dir = this.layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] });
    const packages = new TeamRunPackageCatalog(this.memoryDir);
    await packages.awaitReady();
    const tree = packages.isAdmitted(teamRunId) ? await new TeamRunExecutionTreeStore().read(dir, teamRunId) : null;
    const row = tree && await (await this.teamHistory()).indexedRowOf(teamRunId);
    if (!tree || !row) {
      if (await exists(this.layout.getOrgDirPath(teamRunId))) return { found: false, refusal: `${teamRunId} is an organization run; organization runs can't be given a Task.` };
      const agentRun = await new AgentRunMetadataStore(this.memoryDir).readMetadata(teamRunId);
      if (agentRun && await this.agentHistory.indexedRowOf(teamRunId)) {
        return { found: false, refusal: `${teamRunId} is an agent run's id; use target_agent_run_id "${teamRunId}".` };
      }
      return { found: false, refusal: null };
    }
    const raw = await readRawTreeFile(getTeamRunExecutionTreePath(dir));
    const rootTeam = raw?.rootTeam as Record<string, unknown> | undefined;
    const coordinator = tree.rootTeam.members.find((member) => member.address === tree.rootTeam.coordinatorAddress);
    if (!coordinator || !("agentRunId" in coordinator)) return { found: false, refusal: `Team run '${teamRunId}' has no coordinator agent run.` };
    return { found: true, run: Object.freeze({
      execution: Object.freeze({ teamRunId }), kind: "agent_team", definitionId: tree.rootTeam.teamDefinitionId,
      workspaces: tree.rootTeam.members.map((member) => ("launchConfiguration" in member ? member.launchConfiguration?.workspaceRootPath : null)
        ?? tree.rootTeam.defaultLaunchConfiguration.workspaceRootPath),
      applicationBound: tree.applicationBinding !== null, archived: Boolean(row.archivedAt),
      ownTaskExecutions: Array.isArray(rootTeam?.taskExecutions) ? rootTeam.taskExecutions.length : 0,
      ingressAgentRunId: coordinator.agentRunId,
    }) };
  }

  /**
   * An agent run id that is not a standalone run the user started, but names part of a team run the user started (an
   * admitted team run: never a task agent team) or an organization run: the field to use. `null` otherwise.
   */
  private async otherUserStartedRunOf(agentRunId: string): Promise<string | null> {
    const packages = new TeamRunPackageCatalog(this.memoryDir);
    await packages.awaitReady();
    if (packages.isAdmitted(agentRunId)) return `${agentRunId} is a team run's id; use target_team_run_id "${agentRunId}".`;
    const teams = await fs.readdir(path.join(this.memoryDir, "agent_teams"), { withFileTypes: true }).catch(() => []);
    for (const team of teams) {
      if (team.isDirectory() && packages.isAdmitted(team.name) && await exists(path.join(this.memoryDir, "agent_teams", team.name, agentRunId))) {
        return `${agentRunId} is a member of team run ${team.name}; to give that team a Task, use target_team_run_id "${team.name}".`;
      }
    }
    if (await exists(this.layout.getOrgDirPath(agentRunId))) return `${agentRunId} is an organization run; organization runs can't be given a Task.`;
    return null;
  }
}
