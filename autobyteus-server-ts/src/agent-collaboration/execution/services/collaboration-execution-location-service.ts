import type { TeamRunExecutionTreeLocationService, LocatedTeamAgentExecution } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { AgentOrgExecutionTreeLocationService, LocatedAgentOrgAgentExecution } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import type { StandaloneRootLocationService, LocatedStandaloneRootAgentExecution } from "../../../standalone-agent-run-root/services/standalone-root-location-service.js";
import type { AgentLaunchConfiguration } from "../../../agent-team-execution/domain/team-run-config.js";
import type { RootSubjectKind } from "../domain/root-execution-identity.js";
import type { TaskExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import {
  copyExecutionSource,
  taskExecutionListsOf,
  type CollaboratorExecutionSource,
} from "../../collaborators/collaborator-source-projector.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import { AgentOrgExecutionTreeLocationService as StoredAgentOrgExecutionTreeLocationService } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { StandaloneRootLocationService as StoredStandaloneRootLocationService } from "../../../standalone-agent-run-root/services/standalone-root-location-service.js";

/** A team-family location tagged with its root TeamRun. */
export type LocatedTeamCollaborationAgentExecution = Readonly<LocatedTeamAgentExecution & { rootSubjectKind: "agent_team"; rootRunId: string }>;

export type LocatedCollaborationAgentExecution =
  | LocatedTeamCollaborationAgentExecution
  | LocatedAgentOrgAgentExecution
  | LocatedStandaloneRootAgentExecution;

type Input = { rootSubjectKind?: RootSubjectKind | null; rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };
type Family = "findAgent" | "findAgentSync" | "listAgents";

/** Tags a team-family location as a collaboration location of its root TeamRun. */
export const tagTeamAgentExecution = (item: LocatedTeamAgentExecution): LocatedTeamCollaborationAgentExecution =>
  Object.freeze({ ...item, rootSubjectKind: "agent_team", rootRunId: item.rootTeamRunId });

/** Every task-execution list of the located tree: the lists its delegated copies are recorded in. */
const taskExecutionListsOfLocatedTree = (location: LocatedCollaborationAgentExecution): readonly (readonly TaskExecution[])[] => {
  switch (location.rootSubjectKind) {
    case "agent_team":
      return taskExecutionListsOf({ taskExecutions: location.tree.rootTeam.taskExecutions });
    case "agent_org":
      return taskExecutionListsOf({
        taskExecutions: location.tree.rootOrg.taskExecutions,
        teams: location.tree.rootOrg.members.flatMap((member) => "teamRunId" in member ? [member] : []),
      });
    case "agent":
      return taskExecutionListsOf(location.tree);
  }
};

/**
 * The definition and started launch a located execution runs with, decided by its execution kind: a
 * configured member's placement, or a delegated copy's own recorded source (never the placement at its
 * address). Reads only the located tree; null when the execution has neither.
 */
export const locatedExecutionSource = (location: LocatedCollaborationAgentExecution): CollaboratorExecutionSource | null =>
  location.executionKind === "configured"
    ? location.configuredPlacement
    : copyExecutionSource(taskExecutionListsOfLocatedTree(location), location.agentRunId);

/** The launch settings a located execution runs with (see `locatedExecutionSource`). */
export const locatedLaunchConfiguration = (location: LocatedCollaborationAgentExecution): AgentLaunchConfiguration | null =>
  locatedExecutionSource(location)?.launchConfiguration ?? null;

/** Explicit tagged compound index across the three independent persistence families. */
export class CollaborationExecutionLocationService {
  constructor(private readonly input: Readonly<{
    teams: Pick<TeamRunExecutionTreeLocationService, Family>;
    orgs: Pick<AgentOrgExecutionTreeLocationService, Family>;
    agents: Pick<StandaloneRootLocationService, Family>;
  }>) {}
  async findAgent(input: Input): Promise<LocatedCollaborationAgentExecution | null> {
    switch (input.rootSubjectKind) {
      case "agent_org": return this.input.orgs.findAgent(input);
      case "agent": return this.input.agents.findAgent(input);
      case "agent_team": {
        const team = await this.input.teams.findAgent({ ...input, rootTeamRunId: input.rootRunId });
        return team ? tagTeamAgentExecution(team) : null;
      }
      default: {
        const [team, org, agent] = await Promise.all([
          this.input.teams.findAgent(input), this.input.orgs.findAgent(input), this.input.agents.findAgent(input),
        ]);
        return this.one([team ? tagTeamAgentExecution(team) : null, org, agent]);
      }
    }
  }
  findAgentSync(input: Input): LocatedCollaborationAgentExecution | null {
    switch (input.rootSubjectKind) {
      case "agent_org": return this.input.orgs.findAgentSync(input);
      case "agent": return this.input.agents.findAgentSync(input);
      case "agent_team": {
        const team = this.input.teams.findAgentSync({ ...input, rootTeamRunId: input.rootRunId });
        return team ? tagTeamAgentExecution(team) : null;
      }
      default: {
        const team = this.input.teams.findAgentSync(input);
        return this.one([team ? tagTeamAgentExecution(team) : null, this.input.orgs.findAgentSync(input), this.input.agents.findAgentSync(input)]);
      }
    }
  }
  async listAgents(): Promise<LocatedCollaborationAgentExecution[]> {
    const [teams, orgs, agents] = await Promise.all([
      this.input.teams.listAgents(), this.input.orgs.listAgents(), this.input.agents.listAgents(),
    ]);
    const output = [...teams.map(tagTeamAgentExecution), ...orgs, ...agents];
    const seen = new Set<string>();
    for (const item of output) {
      if (seen.has(item.agentRunId)) throw new Error(`AgentRun '${item.agentRunId}' is present in more than one collaboration root.`);
      seen.add(item.agentRunId);
    }
    return output;
  }

  private one(candidates: readonly (LocatedCollaborationAgentExecution | null)[]): LocatedCollaborationAgentExecution | null {
    const found = candidates.filter((item): item is LocatedCollaborationAgentExecution => item !== null);
    if (found.length > 1) throw new Error("AgentRun lookup is ambiguous across collaboration root families.");
    return found[0] ?? null;
  }
}

export const createStoredCollaborationExecutionLocationService = (
  memoryDir: string,
): CollaborationExecutionLocationService => new CollaborationExecutionLocationService({
  teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
  orgs: new StoredAgentOrgExecutionTreeLocationService({ memoryDir }),
  agents: new StoredStandaloneRootLocationService({ memoryDir }),
});
