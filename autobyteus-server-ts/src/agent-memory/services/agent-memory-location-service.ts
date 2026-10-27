import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AgentOrgExecutionTreeLocationService,
  type LocatedAgentOrgAgentExecution,
} from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import {
  createStoredTeamRunExecutionTreeLocationService,
  TeamRunExecutionTreeLocationService,
  type LocatedTeamAgentExecution,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import type {
  AgentMemoryScope,
  AgentOrgMemberAgentMemoryLocation,
  StandaloneAgentMemoryLocation,
  TeamAgentRunMemoryLocation,
  TeamMemberAgentMemoryLocation,
} from "../domain/agent-memory-location.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";
import { normalizeTeamRunPhysicalScope } from "../../agent-team-execution/domain/team-run-physical-scope.js";
import { TaskTeamRootMemorySource } from "./task-team-root-memory-source.js";

const optional = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

type OrgLocations = Pick<AgentOrgExecutionTreeLocationService, "findAgent">;
type TaskTeams = Pick<TaskTeamRootMemorySource, "readTaskTeam">;

/** Resolves current Team and AgentOrg member memory locations from the authoritative execution trees. */
export class AgentMemoryLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly locations: TeamRunExecutionTreeLocationService;
  private readonly orgLocations: OrgLocations;
  private readonly taskTeams: TaskTeams;

  constructor(input: {
    layout?: AgentMemoryLayout;
    locationService?: TeamRunExecutionTreeLocationService;
    orgLocationService?: OrgLocations;
    taskTeams?: TaskTeams;
    memoryDir?: string;
  } = {}) {
    const memoryDir = input.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.layout = input.layout ?? new AgentMemoryLayout(memoryDir);
    this.locations = input.locationService ?? createStoredTeamRunExecutionTreeLocationService(memoryDir);
    this.orgLocations = input.orgLocationService ?? new AgentOrgExecutionTreeLocationService({ memoryDir });
    this.taskTeams = input.taskTeams ?? new TaskTeamRootMemorySource(memoryDir);
  }

  getStandaloneLocation(input: { agentRunId: string; storedMemoryDir?: string | null }): StandaloneAgentMemoryLocation {
    const agentRunId = required(input.agentRunId, "agentRunId");
    return {
      kind: "standalone",
      agentRunId,
      memoryDir: optional(input.storedMemoryDir) ?? this.layout.getStandaloneRunDirPath(agentRunId),
    };
  }

  getTeamAgentRunLocation(input: AgentMemoryScope & { agentRunId: string }): TeamAgentRunMemoryLocation {
    const scope = this.normalizeScope(input);
    const agentRunId = required(input.agentRunId, "agentRunId");
    return {
      kind: "team_agent_run",
      ...scope,
      agentRunId,
      memoryDir: this.layout.getTeamAgentRunDirPath(scope, agentRunId),
    };
  }

  async resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberAddress?: string | null;
    agentRunId?: string | null;
  }): Promise<TeamMemberAgentMemoryLocation | null> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    const agentRunId = optional(input.agentRunId);
    const memberAddress = optional(input.memberAddress);
    const candidates = await this.listTeamRunAgents(teamRunId);
    const matches = candidates.filter((item) =>
      (!agentRunId || item.agentRunId === agentRunId) &&
      (!memberAddress || item.memberAddress === assertAgentTeamAddress(memberAddress)));
    if (matches.length === 1) return toMemoryLocation(matches[0]!);
    return matches.length ? null : this.resolveTaskTeamMember(teamRunId, agentRunId, memberAddress);
  }

  /** A member of a task team no root's tree holds (delegated by an agent root), read from the task team's own tree. */
  private async resolveTaskTeamMember(teamRunId: string, agentRunId: string | null, memberAddress: string | null): Promise<TeamMemberAgentMemoryLocation | null> {
    const team = await this.taskTeams.readTaskTeam(teamRunId);
    const members = team?.members.filter((member) =>
      (!agentRunId || member.agentRunId === agentRunId) && (!memberAddress || member.memberAddress === memberAddress)) ?? [];
    if (members.length !== 1) return null;
    const member = members[0]!;
    return {
      kind: "team_member", rootTeamRunId: teamRunId, ancestorTeamRunIds: [], memberAddress: member.memberAddress,
      agentRunId: member.agentRunId, configuredPlacement: null, memoryDir: member.memoryDir,
    };
  }

  async resolveAgentOrgMemberLocation(input: {
    orgRunId: string;
    agentRunId: string;
  }): Promise<AgentOrgMemberAgentMemoryLocation | null> {
    const orgRunId = required(input.orgRunId, "orgRunId");
    const agentRunId = required(input.agentRunId, "agentRunId");
    const located = await this.orgLocations.findAgent({ rootRunId: orgRunId, agentRunId });
    return located ? toOrgMemoryLocation(located) : null;
  }

  /**
   * Root-first lookup: an active or admitted root team run reads only its own tree. Any other team run ID
   * may name a team inside some root (an organization's team or a task agent team), so it is matched against
   * every root's agents.
   */
  private async listTeamRunAgents(teamRunId: string): Promise<LocatedTeamAgentExecution[]> {
    if ((await this.locations.listRootTeamRunIds()).includes(teamRunId)) {
      return this.locations.listAgents({ rootTeamRunId: teamRunId });
    }
    return (await this.locations.listAgents()).filter((item) => this.matchesTeam(item, teamRunId));
  }

  private normalizeScope(input: AgentMemoryScope): AgentMemoryScope {
    return normalizeTeamRunPhysicalScope(input);
  }

  private matchesTeam(location: LocatedTeamAgentExecution, teamRunId: string): boolean {
    return location.rootTeamRunId === teamRunId ||
      location.containingTeamRunId === teamRunId ||
      location.ancestorTeamRunIds.includes(teamRunId);
  }
}

const toMemoryLocation = (located: LocatedTeamAgentExecution): TeamMemberAgentMemoryLocation => ({
  kind: "team_member",
  rootTeamRunId: located.rootTeamRunId,
  ancestorTeamRunIds: located.ancestorTeamRunIds,
  memberAddress: located.memberAddress,
  agentRunId: located.agentRunId,
  configuredPlacement: located.configuredPlacement,
  memoryDir: located.memoryDir,
});

const toOrgMemoryLocation = (located: LocatedAgentOrgAgentExecution): AgentOrgMemberAgentMemoryLocation => ({
  kind: "agent_org_member",
  orgRunId: located.rootRunId,
  ancestorTeamRunIds: located.ancestorTeamRunIds,
  memberAddress: located.memberAddress,
  agentRunId: located.agentRunId,
  configuredPlacement: located.configuredPlacement,
  memoryDir: located.memoryDir,
});

let cached: AgentMemoryLocationService | null = null;
export const getAgentMemoryLocationService = (): AgentMemoryLocationService => cached ??= new AgentMemoryLocationService();
