import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamRunMemoryTopologyReader } from "../../run-history/services/team-run-memory-topology-reader.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import type {
  AgentMemoryScope,
  StandaloneAgentMemoryLocation,
  TaskAgentMemoryLocation,
  TeamAgentRunMemoryLocation,
  TeamMemberAgentMemoryLocation,
} from "../domain/agent-memory-location.js";
import { resolveTeamMemberRouteCandidate } from "../domain/team-member-route-selection.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";

const normalizeOptionalString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const samePath = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((segment, index) => segment === right[index]);

const resolveUnambiguous = <T>(items: T[]): T | null => items.length === 1 ? items[0] : null;

export class AgentMemoryLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly topologyReader: Pick<TeamRunMemoryTopologyReader, "loadRootTeamMetadataForMemoryLocation">;

  constructor(input: {
    layout?: AgentMemoryLayout;
    topologyReader?: Pick<TeamRunMemoryTopologyReader, "loadRootTeamMetadataForMemoryLocation">;
    memoryDir?: string;
  } = {}) {
    this.layout = input.layout ?? new AgentMemoryLayout(input.memoryDir ?? appConfigProvider.config.getMemoryDir());
    this.topologyReader = input.topologyReader ?? new TeamRunMemoryTopologyReader();
  }

  getStandaloneLocation(input: {
    agentRunId: string;
    storedMemoryDir?: string | null;
  }): StandaloneAgentMemoryLocation {
    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    return {
      kind: "standalone",
      agentRunId,
      memoryDir: normalizeOptionalString(input.storedMemoryDir) ?? this.layout.getStandaloneRunDirPath(agentRunId),
    };
  }

  getTeamAgentRunLocation(input: {
    rootTeamRunId: string;
    teamRunPath: string[];
    agentRunId: string;
  }): TeamAgentRunMemoryLocation {
    const scope = this.normalizeScope(input);
    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    return {
      kind: "team_agent_run",
      ...scope,
      agentRunId,
      memoryDir: this.layout.getTeamAgentRunDirPath(scope, agentRunId),
    };
  }

  async listTeamMemberLocations(input: { teamRunId: string }): Promise<TeamMemberAgentMemoryLocation[]> {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const metadata = await this.topologyReader.loadRootTeamMetadataForMemoryLocation(teamRunId);
    if (!metadata) {
      return [];
    }
    return this.listTeamMemberLocationsFromMetadata(metadata)
      .filter((location) => this.locationMatchesTeamScope(location, teamRunId));
  }

  async resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberRouteKey?: string;
    memberRunId?: string;
    memberPath?: string[];
  }): Promise<TeamMemberAgentMemoryLocation | null> {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const metadata = await this.topologyReader.loadRootTeamMetadataForMemoryLocation(teamRunId);
    if (!metadata) {
      return null;
    }
    return this.resolveTeamMemberLocationFromMetadata(metadata, input, teamRunId);
  }

  listTeamMemberLocationsFromMetadata(metadata: TeamRunMetadata): TeamMemberAgentMemoryLocation[] {
    const rootTeamRunId = normalizeRequiredString(metadata.teamRunId, "metadata.teamRunId");
    const locations: TeamMemberAgentMemoryLocation[] = [];
    this.collectMemberLocations(metadata.memberTree, { rootTeamRunId, teamRunPath: [] }, locations);
    return locations;
  }

  resolveTeamMemberLocationFromMetadata(
    metadata: TeamRunMetadata,
    input: {
      memberRouteKey?: string;
      memberRunId?: string;
      memberPath?: string[];
    },
    teamRunId: string = metadata.teamRunId,
  ): TeamMemberAgentMemoryLocation | null {
    const scopedLocations = this.listTeamMemberLocationsFromMetadata(metadata)
      .filter((location) => this.locationMatchesTeamScope(location, teamRunId));
    const memberRunId = normalizeOptionalString(input.memberRunId);
    if (memberRunId) {
      return scopedLocations.find((location) => location.memberRunId === memberRunId) ?? null;
    }

    const memberPath = Array.isArray(input.memberPath) && input.memberPath.length > 0
      ? input.memberPath
      : null;
    if (memberPath) {
      return resolveUnambiguous(scopedLocations.filter((location) => samePath(location.memberPath, memberPath)));
    }

    const memberRouteKey = normalizeOptionalString(input.memberRouteKey);
    if (!memberRouteKey) {
      return null;
    }
    return resolveTeamMemberRouteCandidate(scopedLocations, memberRouteKey);
  }

  getTaskAgentLocation(input: {
    logicalMemberLocation: TeamMemberAgentMemoryLocation | TeamAgentRunMemoryLocation;
    taskAgentRunId: string;
    logicalMemberRunId: string;
    logicalMemberRouteKey: string;
  }): TaskAgentMemoryLocation {
    const scope = {
      rootTeamRunId: input.logicalMemberLocation.rootTeamRunId,
      teamRunPath: [...input.logicalMemberLocation.teamRunPath],
    };
    const taskAgentRunId = normalizeRequiredString(input.taskAgentRunId, "taskAgentRunId");
    return {
      kind: "task_agent",
      ...scope,
      taskAgentRunId,
      logicalMemberRunId: normalizeRequiredString(input.logicalMemberRunId, "logicalMemberRunId"),
      logicalMemberRouteKey: normalizeRequiredString(input.logicalMemberRouteKey, "logicalMemberRouteKey"),
      memoryDir: this.layout.getTeamAgentRunDirPath(scope, taskAgentRunId),
    };
  }

  private collectMemberLocations(
    members: readonly TeamRunMemberMetadata[],
    scope: AgentMemoryScope,
    locations: TeamMemberAgentMemoryLocation[],
  ): void {
    for (const member of members) {
      if (member.memberKind === "agent") {
        const memberRunId = normalizeOptionalString(member.memberRunId);
        if (!memberRunId) {
          continue;
        }
        const memberCopy: TeamRunAgentMemberMetadata = {
          ...member,
          memberRunId,
          memberPath: [...member.memberPath],
        };
        locations.push({
          kind: "team_member",
          rootTeamRunId: scope.rootTeamRunId,
          teamRunPath: [...scope.teamRunPath],
          memberRunId,
          memberRouteKey: member.memberRouteKey,
          memberPath: [...member.memberPath],
          member: memberCopy,
          memoryDir: this.layout.getTeamAgentRunDirPath(scope, memberRunId),
        });
        continue;
      }

      const childTeamRunId = normalizeOptionalString(member.teamRunId) ?? normalizeOptionalString(member.memberRunId);
      if (!childTeamRunId) {
        continue;
      }
      this.collectMemberLocations(
        member.memberTree,
        {
          rootTeamRunId: scope.rootTeamRunId,
          teamRunPath: [...scope.teamRunPath, childTeamRunId],
        },
        locations,
      );
    }
  }

  private normalizeScope(input: AgentMemoryScope): AgentMemoryScope {
    return {
      rootTeamRunId: normalizeRequiredString(input.rootTeamRunId, "rootTeamRunId"),
      teamRunPath: input.teamRunPath.map((segment, index) => normalizeRequiredString(segment, `teamRunPath[${index}]`)),
    };
  }

  private locationMatchesTeamScope(
    location: TeamMemberAgentMemoryLocation,
    teamRunId: string,
  ): boolean {
    return location.rootTeamRunId === teamRunId || location.teamRunPath.includes(teamRunId);
  }
}

let cachedAgentMemoryLocationService: AgentMemoryLocationService | null = null;

export const getAgentMemoryLocationService = (): AgentMemoryLocationService => {
  if (!cachedAgentMemoryLocationService) {
    cachedAgentMemoryLocationService = new AgentMemoryLocationService();
  }
  return cachedAgentMemoryLocationService;
};
