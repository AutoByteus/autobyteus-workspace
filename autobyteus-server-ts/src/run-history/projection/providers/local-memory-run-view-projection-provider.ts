import path from "node:path";
import { AgentMemoryService } from "../../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
} from "../run-projection-types.js";
import { buildRunProjectionBundleFromEvents } from "../run-projection-utils.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { buildHistoricalReplayEvents } from "../transformers/raw-trace-to-historical-replay-events.js";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class LocalMemoryRunViewProjectionProvider implements RunProjectionProvider {
  readonly runtimeKind = RuntimeKind.AUTOBYTEUS;
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

let cachedLocalMemoryRunViewProjectionProvider: LocalMemoryRunViewProjectionProvider | null = null;

export const getLocalMemoryRunViewProjectionProvider = (): LocalMemoryRunViewProjectionProvider => {
  if (!cachedLocalMemoryRunViewProjectionProvider) {
    cachedLocalMemoryRunViewProjectionProvider = new LocalMemoryRunViewProjectionProvider(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedLocalMemoryRunViewProjectionProvider;
};
