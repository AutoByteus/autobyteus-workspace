import type { MemoryAvailabilityBuildResult } from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";
import { getTeamRunLeafAgentMetadata } from "../../run-history/services/team-run-metadata-flattener.js";
import {
  MemoryRunSummaryBuilder,
  hasMemoryAvailability,
} from "./memory-run-summary-builder.js";

export type TeamMemoryMemberTargetRecord = {
  member: TeamRunAgentMemberMetadata;
  memory: MemoryAvailabilityBuildResult;
};

export class TeamMemoryMemberTargetBuilder {
  constructor(private readonly metadataStore: TeamRunMetadataStore) {}

  build(teamRunId: string, metadata: TeamRunMetadata): TeamMemoryMemberTargetRecord[] {
    const teamDir = this.metadataStore.getTeamDirPath(teamRunId);
    const memoryStore = new MemoryFileStore(teamDir, { runRootSubdir: "" });
    const summaryBuilder = new MemoryRunSummaryBuilder(memoryStore);
    const targets: TeamMemoryMemberTargetRecord[] = [];
    for (const member of getTeamRunLeafAgentMetadata(metadata)) {
      const memory = summaryBuilder.build(member.memberRunId);
      if (hasMemoryAvailability(memory.availability)) {
        targets.push({ member, memory });
      }
    }
    return targets.sort((a, b) => a.member.memberName.localeCompare(b.member.memberName));
  }
}
