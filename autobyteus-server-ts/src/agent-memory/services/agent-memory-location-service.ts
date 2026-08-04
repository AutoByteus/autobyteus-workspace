import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../../agent-team-execution/domain/team-run-config.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import { TeamRunMemoryTopologyReader } from "../../run-history/services/team-run-memory-topology-reader.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import type {
  AgentMemoryScope,
  StandaloneAgentMemoryLocation,
  TaskAgentMemoryLocation,
  TeamAgentRunMemoryLocation,
  TeamMemberAgentMemoryLocation,
} from "../domain/agent-memory-location.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";

const optional = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

export class AgentMemoryLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly topologyReader: Pick<TeamRunMemoryTopologyReader, "loadRootTeamMetadataForMemoryLocation">;

  constructor(input: {
    layout?: AgentMemoryLayout;
    topologyReader?: Pick<TeamRunMemoryTopologyReader, "loadRootTeamMetadataForMemoryLocation">;
    memoryDir?: string;
  } = {}) {
    const memoryDir = input.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.layout = input.layout ?? new AgentMemoryLayout(memoryDir);
    this.topologyReader = input.topologyReader ?? new TeamRunMemoryTopologyReader(new TeamRunMetadataService(memoryDir));
  }

  getStandaloneLocation(input: { agentRunId: string; storedMemoryDir?: string | null }): StandaloneAgentMemoryLocation {
    const agentRunId = required(input.agentRunId, "agentRunId");
    return { kind: "standalone", agentRunId, memoryDir: optional(input.storedMemoryDir) ?? this.layout.getStandaloneRunDirPath(agentRunId) };
  }

  getTeamAgentRunLocation(input: AgentMemoryScope & { agentRunId: string }): TeamAgentRunMemoryLocation {
    const scope = this.normalizeScope(input);
    const agentRunId = required(input.agentRunId, "agentRunId");
    return { kind: "team_agent_run", ...scope, agentRunId, memoryDir: this.layout.getTeamAgentRunDirPath(scope, agentRunId) };
  }

  async listTeamMemberLocations(input: { teamRunId: string }): Promise<TeamMemberAgentMemoryLocation[]> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    const metadata = await this.topologyReader.loadRootTeamMetadataForMemoryLocation(teamRunId);
    return metadata ? this.listTeamMemberLocationsFromMetadata(metadata).filter((item) => this.matchesTeam(item, teamRunId)) : [];
  }

  async resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberAddress?: string | null;
    agentRunId?: string | null;
  }): Promise<TeamMemberAgentMemoryLocation | null> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    const metadata = await this.topologyReader.loadRootTeamMetadataForMemoryLocation(teamRunId);
    return metadata ? this.resolveTeamMemberLocationFromMetadata(metadata, input, teamRunId) : null;
  }

  listTeamMemberLocationsFromMetadata(metadata: TeamRunMetadata): TeamMemberAgentMemoryLocation[] {
    const locations: TeamMemberAgentMemoryLocation[] = [];
    this.collect(metadata.rootTeam, { rootTeamRunId: metadata.rootTeam.teamRunId, ancestorTeamRunIds: [] }, locations);
    return locations;
  }

  resolveTeamMemberLocationFromMetadata(
    metadata: TeamRunMetadata,
    input: { memberAddress?: string | null; agentRunId?: string | null },
    teamRunId: string = metadata.rootTeam.teamRunId,
  ): TeamMemberAgentMemoryLocation | null {
    const candidates = this.listTeamMemberLocationsFromMetadata(metadata).filter((item) => this.matchesTeam(item, teamRunId));
    const agentRunId = optional(input.agentRunId);
    if (agentRunId) return candidates.find((item) => item.agentRunId === agentRunId) ?? null;
    const rawAddress = optional(input.memberAddress);
    if (!rawAddress) return null;
    const memberAddress = assertAgentTeamAddress(rawAddress);
    return candidates.find((item) => item.memberAddress === memberAddress) ?? null;
  }

  getTaskAgentLocation(input: {
    logicalMemberLocation: TeamMemberAgentMemoryLocation | TeamAgentRunMemoryLocation;
    taskAgentRunId: string;
    executionAddress: TeamExecutionAddress;
  }): TaskAgentMemoryLocation {
    const scope = this.normalizeScope(input.logicalMemberLocation);
    const taskAgentRunId = required(input.taskAgentRunId, "taskAgentRunId");
    return {
      kind: "task_agent",
      ...scope,
      taskAgentRunId,
      executionAddress: createTeamExecutionAddress(input.executionAddress),
      memoryDir: this.layout.getTeamAgentRunDirPath(scope, taskAgentRunId),
    };
  }

  private collect(team: TeamRunAgentTeamNode, scope: AgentMemoryScope, output: TeamMemberAgentMemoryLocation[]): void {
    for (const node of team.children) {
      if (node.kind === "agent") {
        output.push({
          kind: "team_member",
          ...scope,
          memberAddress: node.address,
          agentRunId: node.agentRunId,
          member: node,
          memoryDir: this.layout.getTeamAgentRunDirPath(scope, node.agentRunId),
        });
      } else {
        this.collect(node, { rootTeamRunId: scope.rootTeamRunId, ancestorTeamRunIds: [...scope.ancestorTeamRunIds, node.teamRunId] }, output);
      }
    }
  }

  private normalizeScope(input: AgentMemoryScope): AgentMemoryScope {
    return {
      rootTeamRunId: required(input.rootTeamRunId, "rootTeamRunId"),
      ancestorTeamRunIds: input.ancestorTeamRunIds.map((id, index) => required(id, `ancestorTeamRunIds[${index}]`)),
    };
  }

  private matchesTeam(location: TeamMemberAgentMemoryLocation, teamRunId: string): boolean {
    return location.rootTeamRunId === teamRunId || location.ancestorTeamRunIds.includes(teamRunId);
  }
}

let cached: AgentMemoryLocationService | null = null;
export const getAgentMemoryLocationService = (): AgentMemoryLocationService => cached ??= new AgentMemoryLocationService();
