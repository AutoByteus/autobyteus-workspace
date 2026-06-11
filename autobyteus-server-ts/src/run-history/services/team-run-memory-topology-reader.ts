import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "./team-run-metadata-service.js";
import type { TeamRunMemberMetadata, TeamRunMetadata } from "../store/team-run-metadata-types.js";

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
      if (metadata && this.memberTreeContainsTeamRunId(metadata.memberTree, normalizedTeamRunId)) {
        return metadata;
      }
    }
    return null;
  }

  private memberTreeContainsTeamRunId(
    members: readonly TeamRunMemberMetadata[],
    teamRunId: string,
  ): boolean {
    for (const member of members) {
      if (member.memberKind !== "agent_team") {
        continue;
      }
      if (member.teamRunId === teamRunId || member.memberRunId === teamRunId) {
        return true;
      }
      if (this.memberTreeContainsTeamRunId(member.memberTree, teamRunId)) {
        return true;
      }
    }
    return false;
  }
}
