import path from "node:path";
import { AgentMemoryService } from "../../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
} from "../run-projection-types.js";
import { buildRunProjectionBundleFromEvents } from "../run-projection-utils.js";
import { buildHistoricalReplayEvents } from "../transformers/raw-trace-to-historical-replay-events.js";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class LocalMemoryRunViewProjectionProvider implements RunProjectionProvider {
  /**
   * Local application-owned replay trace display authority. The runtime kind in
   * the source descriptor is metadata only; normal UI history for Codex, Claude
   * Agent SDK, and AutoByteus is hydrated through this provider.
   */
  private readonly defaultMemoryService: AgentMemoryService;

  constructor(
    memoryDir: string,
    memoryService?: AgentMemoryService,
  ) {
    this.defaultMemoryService =
      memoryService ?? new AgentMemoryService(new MemoryFileStore(memoryDir));
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection> {
    const explicitMemoryDir = asString(input.source.memoryDir);
    const localRunId = explicitMemoryDir ? path.basename(explicitMemoryDir) : input.source.runId;
    const memoryService = explicitMemoryDir
      ? new AgentMemoryService(
          new MemoryFileStore(path.dirname(explicitMemoryDir), { runRootSubdir: "" }),
        )
      : this.defaultMemoryService;
    const view = memoryService.getRunMemoryView(localRunId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeRawTraces: true,
      includeArchive: true,
    });
    return buildRunProjectionBundleFromEvents(
      input.source.runId,
      buildHistoricalReplayEvents(view.rawTraces ?? []),
    );
  }
}
