import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamRunExecutionTreeLocationService,
  type LocatedTeamAgentExecution,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import type {
  AgentMemoryScope,
  StandaloneAgentMemoryLocation,
  TeamAgentRunMemoryLocation,
  TeamMemberAgentMemoryLocation,
} from "../domain/agent-memory-location.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";
import { normalizeTeamRunPhysicalScope } from "../../agent-team-execution/domain/team-run-physical-scope.js";

const optional = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

/** Resolves current Team Agent memory locations from the authoritative V1 execution tree. */
export class AgentMemoryLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly locations: TeamRunExecutionTreeLocationService;

  constructor(input: {
    layout?: AgentMemoryLayout;
    locationService?: TeamRunExecutionTreeLocationService;
    memoryDir?: string;
  } = {}) {
    const memoryDir = input.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.layout = input.layout ?? new AgentMemoryLayout(memoryDir);
    this.locations = input.locationService ?? new TeamRunExecutionTreeLocationService({ memoryDir });
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

  async listTeamMemberLocations(input: { teamRunId: string }): Promise<TeamMemberAgentMemoryLocation[]> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    return (await this.locations.listAgents()).filter((item) => this.matchesTeam(item, teamRunId)).map(toMemoryLocation);
  }

  async resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberAddress?: string | null;
    agentRunId?: string | null;
  }): Promise<TeamMemberAgentMemoryLocation | null> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    const agentRunId = optional(input.agentRunId);
    const memberAddress = optional(input.memberAddress);
    const candidates = (await this.locations.listAgents()).filter((item) => this.matchesTeam(item, teamRunId));
    const matches = candidates.filter((item) =>
      (!agentRunId || item.agentRunId === agentRunId) &&
      (!memberAddress || item.memberAddress === assertAgentTeamAddress(memberAddress)));
    return matches.length === 1 ? toMemoryLocation(matches[0]!) : null;
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

let cached: AgentMemoryLocationService | null = null;
export const getAgentMemoryLocationService = (): AgentMemoryLocationService => cached ??= new AgentMemoryLocationService();
