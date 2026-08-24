import path from "node:path";
import type { ConfiguredAgentExecutionNode } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { MemoryAvailabilityBuildResult } from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { AgentMemoryLocationService } from "./agent-memory-location-service.js";
import { MemoryRunSummaryBuilder, hasMemoryAvailability } from "./memory-run-summary-builder.js";

export type TeamMemoryMemberTargetRecord = {
  member: ConfiguredAgentExecutionNode;
  memory: MemoryAvailabilityBuildResult;
};

export class TeamMemoryMemberTargetBuilder {
  constructor(
    private readonly memoryLocationService: AgentMemoryLocationService = new AgentMemoryLocationService(),
  ) {}

  async build(teamRunId: string): Promise<TeamMemoryMemberTargetRecord[]> {
    const targets: TeamMemoryMemberTargetRecord[] = [];
    for (const target of await this.memoryLocationService.listTeamMemberLocations({ teamRunId })) {
      if (!target.configuredPlacement) continue;
      const memoryStore = new MemoryFileStore(path.dirname(target.memoryDir), { runRootSubdir: "" });
      const memory = new MemoryRunSummaryBuilder(memoryStore).build(path.basename(target.memoryDir));
      if (hasMemoryAvailability(memory.availability)) {
        targets.push({ member: target.configuredPlacement, memory });
      }
    }
    return targets.sort((a, b) =>
      (getAgentTeamAddressBasename(a.member.address) ?? a.member.address)
        .localeCompare(getAgentTeamAddressBasename(b.member.address) ?? b.member.address));
  }
}
