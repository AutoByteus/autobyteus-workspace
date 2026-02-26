import { AgentMemoryViewService } from "../../../agent-memory-view/services/agent-memory-view-service.js";
import { MemoryFileStore } from "../../../agent-memory-view/store/memory-file-store.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import type { RunProjectionProvider, RunProjectionProviderInput } from "../run-projection-provider-port.js";
import { buildRunProjection } from "../run-projection-utils.js";
import type { RunProjection } from "../run-projection-types.js";

export class LocalMemoryRunProjectionProvider implements RunProjectionProvider {
  readonly providerId = "local_memory_projection";
  readonly runtimeKind = "autobyteus" as const;
  private readonly memoryViewService: AgentMemoryViewService;

  constructor(
    memoryDir: string,
    memoryViewService?: AgentMemoryViewService,
  ) {
    this.memoryViewService =
      memoryViewService ?? new AgentMemoryViewService(new MemoryFileStore(memoryDir));
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection> {
    const view = this.memoryViewService.getRunMemoryView(input.runId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeConversation: true,
      includeRawTraces: false,
      includeArchive: true,
    });
    return buildRunProjection(input.runId, view.conversation ?? []);
  }
}

let cachedLocalMemoryRunProjectionProvider: LocalMemoryRunProjectionProvider | null = null;

export const getLocalMemoryRunProjectionProvider = (): LocalMemoryRunProjectionProvider => {
  if (!cachedLocalMemoryRunProjectionProvider) {
    cachedLocalMemoryRunProjectionProvider = new LocalMemoryRunProjectionProvider(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedLocalMemoryRunProjectionProvider;
};
