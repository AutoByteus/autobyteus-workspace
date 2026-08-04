import path from "node:path";
import type { MemoryAvailabilityBuildResult } from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";
import { AgentMemoryLocationService } from "./agent-memory-location-service.js";
import {
  MemoryRunSummaryBuilder,
  hasMemoryAvailability,
} from "./memory-run-summary-builder.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";

export type TeamMemoryMemberTargetRecord = {
  member: TeamRunAgentMemberMetadata;
  memory: MemoryAvailabilityBuildResult;
};

export class TeamMemoryMemberTargetBuilder {
  private readonly memoryLocationService: AgentMemoryLocationService;

  constructor(
    _metadataStore: TeamRunMetadataStore,
    memoryLocationService?: AgentMemoryLocationService,
  ) {
    this.memoryLocationService = memoryLocationService ?? new AgentMemoryLocationService();
  }

  build(_teamRunId: string, metadata: TeamRunMetadata): TeamMemoryMemberTargetRecord[] {
    const targets: TeamMemoryMemberTargetRecord[] = [];
    for (const target of this.memoryLocationService.listTeamMemberLocationsFromMetadata(metadata)) {
      const memoryStore = new MemoryFileStore(path.dirname(target.memoryDir), {
        runRootSubdir: "",
      });
      const memory = new MemoryRunSummaryBuilder(memoryStore).build(path.basename(target.memoryDir));
      if (hasMemoryAvailability(memory.availability)) {
        targets.push({ member: target.member, memory });
      }
    }
    return targets.sort((a, b) =>
      (getAgentTeamAddressBasename(a.member.address) ?? a.member.address)
        .localeCompare(getAgentTeamAddressBasename(b.member.address) ?? b.member.address));
  }
}
