import { AgentMemoryService } from "../../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
} from "../run-projection-types.js";
import { buildRunProjection } from "../run-projection-utils.js";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class AutoByteusRunViewProjectionProvider implements RunProjectionProvider {
  readonly runtimeKind = RuntimeKind.AUTOBYTEUS;
  private readonly memoryService: AgentMemoryService;

  constructor(
    memoryDir: string,
    memoryService?: AgentMemoryService,
  ) {
    this.memoryService =
      memoryService ?? new AgentMemoryService(new MemoryFileStore(memoryDir));
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection> {
    const runtimeRunId = asString(input.metadata?.platformAgentRunId) ?? input.runId;
    const view = this.memoryService.getRunMemoryView(runtimeRunId, {
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

let cachedAutoByteusRunViewProjectionProvider: AutoByteusRunViewProjectionProvider | null = null;

export const getAutoByteusRunViewProjectionProvider = (): AutoByteusRunViewProjectionProvider => {
  if (!cachedAutoByteusRunViewProjectionProvider) {
    cachedAutoByteusRunViewProjectionProvider = new AutoByteusRunViewProjectionProvider(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAutoByteusRunViewProjectionProvider;
};
