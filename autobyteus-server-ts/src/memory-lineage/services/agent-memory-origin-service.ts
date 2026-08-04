import { CompactionLineageResolver } from "autobyteus-ts/memory/lineage/compaction-lineage-resolver.js";
import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";
import type {
  MemoryArtifactRef,
  MemoryOriginResolution,
} from "autobyteus-ts/memory/lineage/memory-origin-resolution.js";
import { FileCompactionLineageStore } from "autobyteus-ts/memory/store/file-compaction-lineage-store.js";
import { RawTraceArchiveManager } from "autobyteus-ts/memory/store/raw-trace-archive-manager.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import {
  AgentMemoryLocationService,
  getAgentMemoryLocationService,
} from "../../agent-memory/services/agent-memory-location-service.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";

export type AgentMemoryOriginTarget =
  | {
      targetKind: "agent_run";
      runId: string;
      memberId: null;
    }
  | {
      targetKind: "team_member";
      runId: string;
      memberId: string;
    };

export class AgentMemoryOriginService {
  constructor(
    private readonly locationService: Pick<
      AgentMemoryLocationService,
      "getStandaloneLocation" | "resolveTeamMemberLocation"
    > = getAgentMemoryLocationService(),
    private readonly metadataService: Pick<
      AgentRunMetadataService,
      "readMetadata"
    > = getAgentRunMetadataService(),
  ) {}

  async resolve(
    target: AgentMemoryOriginTarget,
    artifact: MemoryArtifactRef,
  ): Promise<MemoryOriginResolution> {
    const scope = this.normalizeScope(target);
    const standaloneMetadata = target.targetKind === "agent_run"
      ? await this.metadataService.readMetadata(scope.runId)
      : null;
    const runDir = target.targetKind === "agent_run"
      ? this.locationService.getStandaloneLocation({
          agentRunId: scope.runId,
          storedMemoryDir: standaloneMetadata?.memoryDir,
        }).memoryDir
      : (await this.locationService.resolveTeamMemberLocation({
          teamRunId: scope.runId,
          agentRunId: target.memberId,
        }))?.memoryDir ?? null;
    if (!runDir) {
      throw new Error(
        `No run-local memory location exists for team member '${target.memberId}'.`,
      );
    }
    const lineageStore = new FileCompactionLineageStore(runDir, scope);
    return new CompactionLineageResolver(
      scope,
      lineageStore,
      new RawTraceArchiveManager(runDir),
      new RunMemoryFileStore(runDir),
    ).resolve(artifact);
  }

  private normalizeScope(target: AgentMemoryOriginTarget): CompactionLineageScope {
    const runId = target.runId.trim();
    if (!runId) throw new Error("Memory-origin target runId is required.");
    if (target.targetKind === "agent_run") {
      if (target.memberId !== null) {
        throw new Error("Standalone memory-origin target requires memberId null.");
      }
      return { targetKind: "agent_run", runId, memberId: null };
    }
    const memberId = target.memberId.trim();
    if (!memberId) throw new Error("Team memory-origin target memberId is required.");
    return { targetKind: "team_member", runId, memberId };
  }
}
