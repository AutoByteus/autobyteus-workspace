import type { TeamRunExecutionTreeLocationService, LocatedTeamAgentExecution } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { AgentOrgExecutionTreeLocationService, LocatedAgentOrgAgentExecution } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import type { AgentRunCollaborationLocationService, LocatedAgentRunCollaborationAgentExecution } from "../../../agent-run-collaboration/services/agent-run-collaboration-location-service.js";
import type { AgentLaunchConfiguration } from "../../../agent-team-execution/domain/team-run-config.js";
import type { RootSubjectKind } from "../domain/root-execution-identity.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import { AgentOrgExecutionTreeLocationService as StoredAgentOrgExecutionTreeLocationService } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentRunCollaborationLocationService as StoredAgentRunCollaborationLocationService } from "../../../agent-run-collaboration/services/agent-run-collaboration-location-service.js";

export type LocatedCollaborationAgentExecution =
  | Readonly<LocatedTeamAgentExecution & { rootSubjectKind: "agent_team"; rootRunId: string }>
  | LocatedAgentOrgAgentExecution
  | LocatedAgentRunCollaborationAgentExecution;

type Input = { rootSubjectKind?: RootSubjectKind | null; rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };
type Family = "findAgent" | "findAgentSync" | "listAgents";

/** The launch settings an execution runs with: its configured placement, else its collaborator snapshot. */
export const locatedLaunchConfiguration = (location: LocatedCollaborationAgentExecution): AgentLaunchConfiguration | null => {
  switch (location.rootSubjectKind) {
    case "agent_team":
    case "agent_org":
      return location.configuredPlacement?.launchConfiguration ?? null;
    case "agent":
      return location.launchConfiguration;
  }
};

/** Explicit tagged compound index across the three independent persistence families. */
export class CollaborationExecutionLocationService {
  constructor(private readonly input: Readonly<{
    teams: Pick<TeamRunExecutionTreeLocationService, Family>;
    orgs: Pick<AgentOrgExecutionTreeLocationService, Family>;
    agents: Pick<AgentRunCollaborationLocationService, Family>;
  }>) {}
  async findAgent(input: Input): Promise<LocatedCollaborationAgentExecution | null> {
    switch (input.rootSubjectKind) {
      case "agent_org": return this.input.orgs.findAgent(input);
      case "agent": return this.input.agents.findAgent(input);
      case "agent_team": {
        const team = await this.input.teams.findAgent({ ...input, rootTeamRunId: input.rootRunId });
        return team ? this.tagTeam(team) : null;
      }
      default: {
        const [team, org, agent] = await Promise.all([
          this.input.teams.findAgent(input), this.input.orgs.findAgent(input), this.input.agents.findAgent(input),
        ]);
        return this.one([team ? this.tagTeam(team) : null, org, agent]);
      }
    }
  }
  findAgentSync(input: Input): LocatedCollaborationAgentExecution | null {
    switch (input.rootSubjectKind) {
      case "agent_org": return this.input.orgs.findAgentSync(input);
      case "agent": return this.input.agents.findAgentSync(input);
      case "agent_team": {
        const team = this.input.teams.findAgentSync({ ...input, rootTeamRunId: input.rootRunId });
        return team ? this.tagTeam(team) : null;
      }
      default: {
        const team = this.input.teams.findAgentSync(input);
        return this.one([team ? this.tagTeam(team) : null, this.input.orgs.findAgentSync(input), this.input.agents.findAgentSync(input)]);
      }
    }
  }
  async listAgents(): Promise<LocatedCollaborationAgentExecution[]> {
    const [teams, orgs, agents] = await Promise.all([
      this.input.teams.listAgents(), this.input.orgs.listAgents(), this.input.agents.listAgents(),
    ]);
    const output = [...teams.map((item) => this.tagTeam(item)), ...orgs, ...agents];
    const seen = new Set<string>();
    for (const item of output) {
      if (seen.has(item.agentRunId)) throw new Error(`AgentRun '${item.agentRunId}' is present in more than one collaboration root.`);
      seen.add(item.agentRunId);
    }
    return output;
  }

  private tagTeam(item: LocatedTeamAgentExecution): LocatedCollaborationAgentExecution {
    return Object.freeze({ ...item, rootSubjectKind: "agent_team", rootRunId: item.rootTeamRunId });
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
  agents: new StoredAgentRunCollaborationLocationService({ memoryDir }),
});
