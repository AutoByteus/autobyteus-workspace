import type { TeamRunExecutionTreeLocationService, LocatedTeamAgentExecution } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { AgentOrgExecutionTreeLocationService, LocatedAgentOrgAgentExecution } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import type { AgentLaunchConfiguration } from "../../../agent-team-execution/domain/team-run-config.js";
import type { RootSubjectKind } from "../domain/root-execution-identity.js";
import type { CollaboratorExecutionSource } from "../../collaborators/collaborator-source-projector.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import { AgentOrgExecutionTreeLocationService as StoredAgentOrgExecutionTreeLocationService } from "../../../agent-org-execution/services/agent-org-execution-tree-location-service.js";

/** A team-family location tagged with its root TeamRun. */
export type LocatedTeamCollaborationAgentExecution = Readonly<LocatedTeamAgentExecution & { rootSubjectKind: "agent_team"; rootRunId: string }>;

/** A member of a team or Org run (a delegated agent run is located by its own ID, as a run of its own). */
export type LocatedCollaborationAgentExecution =
  | LocatedTeamCollaborationAgentExecution
  | LocatedAgentOrgAgentExecution;

type Input = { rootSubjectKind?: RootSubjectKind | null; rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };
type Family = "findAgent" | "findAgentSync" | "listAgents";

/** Tags a team-family location as a collaboration location of its root TeamRun. */
export const tagTeamAgentExecution = (item: LocatedTeamAgentExecution): LocatedTeamCollaborationAgentExecution =>
  Object.freeze({ ...item, rootSubjectKind: "agent_team", rootRunId: item.rootTeamRunId });

/**
 * The definition and launch a located member runs with: its configured placement in its team or organization.
 * Reads only the located files; null when it has none.
 */
export const locatedExecutionSource = (location: LocatedCollaborationAgentExecution): CollaboratorExecutionSource | null =>
  location.configuredPlacement;

/** The launch settings a located execution runs with (see `locatedExecutionSource`). */
export const locatedLaunchConfiguration = (location: LocatedCollaborationAgentExecution): AgentLaunchConfiguration | null =>
  locatedExecutionSource(location)?.launchConfiguration ?? null;

/** Explicit tagged compound index across the two member persistence families (team and Org). */
export class CollaborationExecutionLocationService {
  constructor(private readonly input: Readonly<{
    teams: Pick<TeamRunExecutionTreeLocationService, Family>;
    orgs: Pick<AgentOrgExecutionTreeLocationService, Family>;
  }>) {}
  async findAgent(input: Input): Promise<LocatedCollaborationAgentExecution | null> {
    switch (input.rootSubjectKind) {
      case "agent_org": return this.input.orgs.findAgent(input);
      case "agent": return null;
      case "agent_team": {
        const team = await this.input.teams.findAgent({ ...input, rootTeamRunId: input.rootRunId });
        return team ? tagTeamAgentExecution(team) : null;
      }
      default: {
        const [team, org] = await Promise.all([this.input.teams.findAgent(input), this.input.orgs.findAgent(input)]);
        return this.one([team ? tagTeamAgentExecution(team) : null, org]);
      }
    }
  }
  findAgentSync(input: Input): LocatedCollaborationAgentExecution | null {
    switch (input.rootSubjectKind) {
      case "agent_org": return this.input.orgs.findAgentSync(input);
      case "agent": return null;
      case "agent_team": {
        const team = this.input.teams.findAgentSync({ ...input, rootTeamRunId: input.rootRunId });
        return team ? tagTeamAgentExecution(team) : null;
      }
      default: {
        const team = this.input.teams.findAgentSync(input);
        return this.one([team ? tagTeamAgentExecution(team) : null, this.input.orgs.findAgentSync(input)]);
      }
    }
  }
  async listAgents(): Promise<LocatedCollaborationAgentExecution[]> {
    const [teams, orgs] = await Promise.all([this.input.teams.listAgents(), this.input.orgs.listAgents()]);
    const output = [...teams.map(tagTeamAgentExecution), ...orgs];
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

export const createStoredCollaborationExecutionLocationService = (memoryDir: string): CollaborationExecutionLocationService =>
  new CollaborationExecutionLocationService({
    teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
    orgs: new StoredAgentOrgExecutionTreeLocationService({ memoryDir }),
  });

/**
 * A lookup by an agent run's ID alone, in the stored team and Org families. A delegated run is never found under
 * another run by its ID alone (each is the run it is; the agent-root family answers only a lookup that names its
 * root), so that family has nothing to add here (the token display fields' lookup).
 */
export const createStoredRunMemberLocations = (memoryDir: string) => {
  const teams = createStoredTeamRunExecutionTreeLocationService(memoryDir);
  const orgs = new StoredAgentOrgExecutionTreeLocationService({ memoryDir });
  return Object.freeze({
    findAgent: async (input: Readonly<{ agentRunId: string }>): Promise<LocatedCollaborationAgentExecution | null> => {
      const [team, org] = await Promise.all([teams.findAgent(input), orgs.findAgent(input)]);
      if (team && org) throw new Error("AgentRun lookup is ambiguous across collaboration root families.");
      return team ? tagTeamAgentExecution(team) : org;
    },
  });
};
