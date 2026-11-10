import fs from "node:fs/promises";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { TaskAgentTeamTreeFile } from "../../agent-team-execution/domain/task-agent-team-tree.js";
import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";
import { CoordinatingRunPresence } from "../../run-history/store/coordinating-run-presence.js";
import { TaskAgentOwnFiles } from "../../run-history/store/task-agent-own-files.js";
import { effectiveCopyAgentLaunch } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";
import type {
  CollaborationRootCatalogEntry,
  CollaborationRootMemoryRecord,
  CollaborationRootMemorySource,
} from "./collaboration-root-memory-catalog.js";

/** One member of a task team, with the launch it runs with: the started launch under the member's or the Team's recorded choice (runtime and workspace). */
export type TaskTeamMember = Readonly<{
  memberAddress: AgentTeamAddress;
  displayName: string;
  agentRunId: string;
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
  /** autobyteus-348: the member's pending runtime switch, when one is recorded (its launch is then the new runtime). */
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
  memoryDir: string;
}>;

/** A task team whose coordinating run still exists, read from its own tree. */
export type TaskTeamRoot = Readonly<{
  teamRunId: string;
  teamDefinitionId: string;
  /** The task team's name: its address basename (no definition name is recorded for a task team). */
  displayName: string;
  createdAt: string | null;
  coordinatingRun: TaskAgentCoordinatingRun;
  /** The agent run that delegated it, when recorded. */
  delegatorAgentRunId: string | null;
  members: readonly TaskTeamMember[];
}>;

const displayNameOf = (address: string): string => getAgentTeamAddressBasename(address as AgentTeamAddress) ?? address;

/**
 * Task teams (AE-20, AE-21): a task agent team keeps its own tree at `agent_teams/<teamRunId>/` and is
 * never an admitted root package, so the team root source skips it. This source lists the task teams
 * whose coordinating run still links them (the rule for task agents) and reads each one's own tree. It is
 * the one reader for the Teams explorer, the team-member memory view and memory-search discovery.
 */
export class TaskTeamRootMemorySource implements CollaborationRootMemorySource {
  readonly familyLabel = "task team run";
  private readonly layout: AgentMemoryLayout;
  private readonly ownFiles: TaskAgentOwnFiles;
  private readonly coordinatingRuns: CoordinatingRunPresence;

  constructor(memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.ownFiles = new TaskAgentOwnFiles(memoryDir);
    this.coordinatingRuns = new CoordinatingRunPresence(memoryDir);
  }

  async listRootRunIds(): Promise<string[]> {
    return (await this.listTaskTeams()).map((team) => team.teamRunId);
  }

  /** Every task team whose coordinating run still exists, with its members. */
  async listTaskTeams(): Promise<TaskTeamRoot[]> {
    const teams: TaskTeamRoot[] = [];
    for (const teamRunId of await this.teamFolderNames()) {
      const team = await this.readTaskTeam(teamRunId);
      if (team) teams.push(team);
    }
    return teams;
  }

  /** The task team when the folder holds a task team's own tree and its coordinating run links it; else null. */
  async readTaskTeam(teamRunId: string): Promise<TaskTeamRoot | null> {
    const state = await this.ownFiles.readTeam(teamRunId);
    if (state.kind !== "present") return null;
    const { tree } = state;
    // Detached (its coordinating run deleted): not listed; a team whose Task closed stays listed (D-6).
    if (!await this.coordinatingRuns.exists(tree.taskAgent.coordinatingRun)) return null;
    return this.toRoot(teamRunId, tree);
  }

  async readRoot(rootRunId: string): Promise<CollaborationRootMemoryRecord | null> {
    const team = await this.readTaskTeam(rootRunId);
    if (!team || !team.members.length) return null;
    return {
      rootRunId,
      definitionId: team.teamDefinitionId,
      definitionName: team.displayName,
      createdAt: team.createdAt,
      members: team.members.map((member) => ({
        memberAddress: member.memberAddress,
        displayName: member.displayName,
        agentRunId: member.agentRunId,
        agentDefinitionId: member.agentDefinitionId,
        executionKind: "TASK_TEAM_MEMBER" as const,
        startedAt: null,
        groupPath: [],
        memoryDir: member.memoryDir,
      })),
    };
  }

  /** Task teams have no history catalog rows: names and times come from their own trees. */
  async readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> {
    return new Map();
  }

  private toRoot(teamRunId: string, tree: TaskAgentTeamTreeFile): TaskTeamRoot {
    return {
      teamRunId,
      teamDefinitionId: tree.rootTeam.teamDefinitionId.trim(),
      displayName: displayNameOf(tree.rootTeam.address),
      createdAt: tree.createdAt ?? null,
      coordinatingRun: tree.taskAgent.coordinatingRun,
      delegatorAgentRunId: tree.taskAgent.delegatorAgentRunId ?? null,
      members: tree.rootTeam.members.map((member) => ({
        memberAddress: member.address,
        displayName: displayNameOf(member.address),
        agentRunId: member.agentRunId,
        agentDefinitionId: member.agentDefinitionId,
        launchConfiguration: effectiveCopyAgentLaunch({
          started: member.launchConfiguration, followsTeam: member.followsTeam,
          teamSelection: tree.taskAgent.userLaunchSelection, agentSelection: member.userLaunchSelection,
        }).launch,
        ...(member.pendingRuntimeSwitch ? { pendingRuntimeSwitch: member.pendingRuntimeSwitch } : {}),
        memoryDir: this.layout.getTeamAgentRunDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }, member.agentRunId),
      })),
    };
  }

  private async teamFolderNames(): Promise<string[]> {
    const entries = await fs.readdir(this.layout.getTeamRootDirPath(), { withFileTypes: true }).catch(() => []);
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  }
}
