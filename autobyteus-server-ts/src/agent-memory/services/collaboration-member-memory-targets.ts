import path from "node:path";
import type {
  CollaborationMemberMemoryTargetSummary,
  MemoryAvailabilityBuildResult,
} from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { MemoryRunSummaryBuilder, hasMemoryAvailability } from "./memory-run-summary-builder.js";

/** One configured-placement Agent execution inside a team or org root, identified by its own run. */
export type CollaborationMemberMemoryLocation = Readonly<{
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  agentDefinitionId: string | null;
  memoryDir: string;
}>;

export type CollaborationMemberMemoryTarget = Readonly<{
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  agentDefinitionId: string | null;
  memory: MemoryAvailabilityBuildResult;
}>;

/** Keeps the members that have stored memory, sorted by display name. */
export const buildCollaborationMemberMemoryTargets = (
  members: readonly CollaborationMemberMemoryLocation[],
): CollaborationMemberMemoryTarget[] => {
  const targets: CollaborationMemberMemoryTarget[] = [];
  for (const member of members) {
    const memoryStore = new MemoryFileStore(path.dirname(member.memoryDir), { runRootSubdir: "" });
    const memory = new MemoryRunSummaryBuilder(memoryStore).build(path.basename(member.memoryDir));
    if (!hasMemoryAvailability(memory.availability)) continue;
    targets.push({
      memberAddress: member.memberAddress,
      displayName: member.displayName,
      agentRunId: member.agentRunId,
      agentDefinitionId: member.agentDefinitionId,
      memory,
    });
  }
  return targets.sort((a, b) => a.displayName.localeCompare(b.displayName));
};

export const toCollaborationMemberMemoryTargetSummary = (
  target: CollaborationMemberMemoryTarget,
): CollaborationMemberMemoryTargetSummary => ({
  memberAddress: target.memberAddress,
  displayName: target.displayName,
  agentRunId: target.agentRunId,
  agentDefinitionId: target.agentDefinitionId,
  lastUpdatedAt: target.memory.availability.latestMemoryAt,
  memory: target.memory.availability,
});
