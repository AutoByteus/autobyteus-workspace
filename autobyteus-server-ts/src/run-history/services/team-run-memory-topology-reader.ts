import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "./team-run-metadata-service.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunMetadata } from "../store/team-run-metadata-types.js";

const normalizeOptionalString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class TeamRunMemoryTopologyReader {
  constructor(private readonly metadataService: Pick<TeamRunMetadataService, "readMetadata" | "listTeamRunIds"> = getTeamRunMetadataService()) {}

  async loadRootTeamMetadataForMemoryLocation(teamRunId: string): Promise<TeamRunMetadata | null> {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    if (!normalizedTeamRunId) {
      return null;
    }

    const direct = await this.metadataService.readMetadata(normalizedTeamRunId);
    if (direct) {
      return direct;
    }

    for (const storedTeamRunId of await this.metadataService.listTeamRunIds()) {
      const metadata = await this.metadataService.readMetadata(storedTeamRunId);
      if (metadata && this.treeContainsTeamRunId(metadata.rootTeam, normalizedTeamRunId)) {
        return metadata;
      }
    }
    return null;
  }

  private treeContainsTeamRunId(team: TeamRunAgentTeamNode, teamRunId: string): boolean {
    if (team.teamRunId === teamRunId) return true;
    return team.children.some((node: TeamRunNode) =>
      node.kind === "agent_team" && this.treeContainsTeamRunId(node, teamRunId),
    );
  }
}
