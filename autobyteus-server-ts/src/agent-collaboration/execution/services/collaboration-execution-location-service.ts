import type { TeamRunExecutionTreeLocationService, LocatedTeamAgentExecution } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { AgentOrgExecutionTreeLocationService, LocatedAgentOrgAgentExecution } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import { AgentOrgExecutionTreeLocationService as StoredAgentOrgExecutionTreeLocationService } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";

export type LocatedCollaborationAgentExecution =
  | Readonly<LocatedTeamAgentExecution & { rootSubjectKind: "agent_team"; rootRunId: string }>
  | LocatedAgentOrgAgentExecution;

type Input = { rootSubjectKind?: "agent_team" | "agent_org" | null; rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };

/** Explicit tagged compound index across the two independent persistence families. */
export class CollaborationExecutionLocationService {
  constructor(private readonly input: Readonly<{
    teams: Pick<TeamRunExecutionTreeLocationService, "findAgent" | "findAgentSync" | "listAgents" | "containsRunId">;
    orgs: Pick<AgentOrgExecutionTreeLocationService, "findAgent" | "findAgentSync" | "listAgents" | "containsRunId">;
  }>) {}
  async findAgent(input: Input): Promise<LocatedCollaborationAgentExecution | null> {
    if (input.rootSubjectKind === "agent_org") return this.input.orgs.findAgent(input);
    if (input.rootSubjectKind === "agent_team") {
      const team = await this.input.teams.findAgent({ ...input, rootTeamRunId: input.rootRunId });
      return team ? this.tagTeam(team) : null;
    }
    const [team, org] = await Promise.all([this.input.teams.findAgent(input), this.input.orgs.findAgent(input)]);
    return this.one(team ? this.tagTeam(team) : null, org);
  }
  findAgentSync(input: Input): LocatedCollaborationAgentExecution | null {
    if (input.rootSubjectKind === "agent_org") return this.input.orgs.findAgentSync(input);
    if (input.rootSubjectKind === "agent_team") {
      const team = this.input.teams.findAgentSync({ ...input, rootTeamRunId: input.rootRunId });
      return team ? this.tagTeam(team) : null;
    }
    const team = this.input.teams.findAgentSync(input);
    return this.one(team ? this.tagTeam(team) : null, this.input.orgs.findAgentSync(input));
  }
  async listAgents(): Promise<LocatedCollaborationAgentExecution[]> {
    const [teams, orgs] = await Promise.all([this.input.teams.listAgents(), this.input.orgs.listAgents()]);
    const output = [...teams.map((item) => this.tagTeam(item)), ...orgs];
    const seen = new Set<string>();
    for (const item of output) {
      if (seen.has(item.agentRunId)) throw new Error(`AgentRun '${item.agentRunId}' is present in more than one collaboration root.`);
      seen.add(item.agentRunId);
    }
    return output;
  }
  async containsRunId(runId: string): Promise<boolean> {
    const [team, org] = await Promise.all([this.input.teams.containsRunId(runId), this.input.orgs.containsRunId(runId)]);
    if (team && org) throw new Error(`Run identity '${runId}' is present in both collaboration root families.`);
    return team || org;
  }
  private tagTeam(item: LocatedTeamAgentExecution): LocatedCollaborationAgentExecution {
    return Object.freeze({ ...item, rootSubjectKind: "agent_team", rootRunId: item.rootTeamRunId });
  }
  private one(team: LocatedCollaborationAgentExecution | null, org: LocatedAgentOrgAgentExecution | null): LocatedCollaborationAgentExecution | null {
    if (team && org) throw new Error(`AgentRun lookup is ambiguous across collaboration root families.`);
    return team ?? org;
  }
}

export const createStoredCollaborationExecutionLocationService = (
  memoryDir: string,
): CollaborationExecutionLocationService => new CollaborationExecutionLocationService({
  teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
  orgs: new StoredAgentOrgExecutionTreeLocationService({ memoryDir }),
});
