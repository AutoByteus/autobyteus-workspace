import { appConfigProvider } from "../../config/app-config-provider.js";
import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import { LocalMemoryRunViewProjectionProvider } from "../projection/providers/local-memory-run-view-projection-provider.js";
import {
  dedupeRunProjectionActivityEntries,
  dedupeRunProjectionConversationEntries,
} from "../projection/run-projection-dedupe.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
  RunProjectionSourceDescriptor,
} from "../projection/run-projection-types.js";
import { buildRunProjectionBundle } from "../projection/run-projection-utils.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const dedupeProjectionBundle = (projection: RunProjection): RunProjection => {
  const bundle = buildRunProjectionBundle(
    projection.runId,
    dedupeRunProjectionConversationEntries(projection.conversation),
    dedupeRunProjectionActivityEntries(projection.activities),
  );
  return {
    ...bundle,
    summary: bundle.summary ?? projection.summary,
    lastActivityAt: bundle.lastActivityAt ?? projection.lastActivityAt,
  };
};

export class AgentRunViewProjectionService {
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly localProjectionProvider: RunProjectionProvider;

  constructor(
    memoryDir: string,
    options: {
      metadataStore?: AgentRunMetadataStore;
      localProjectionProvider?: RunProjectionProvider;
    } = {},
  ) {
    this.metadataStore = options.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.localProjectionProvider =
      options.localProjectionProvider ?? new LocalMemoryRunViewProjectionProvider(memoryDir);
  }

  async getProjection(runId: string): Promise<RunProjection> {
    const metadata = await this.metadataStore.readMetadata(runId);
    return this.getProjectionFromMetadata({
      runId,
      metadata,
    });
  }

  async getProjectionFromMetadata(input: {
    runId: string;
    metadata: AgentRunMetadata | null;
  }): Promise<RunProjection> {
    const { runId, metadata } = input;
    const runtimeKind =
      runtimeKindFromString(metadata?.runtimeKind, RuntimeKind.AUTOBYTEUS) ??
      RuntimeKind.AUTOBYTEUS;
    const source: RunProjectionSourceDescriptor = {
      runId,
      runtimeKind,
      workspaceRootPath: metadata?.workspaceRootPath ?? null,
      memoryDir: metadata?.memoryDir ?? null,
      platformRunId: metadata?.platformAgentRunId ?? null,
      metadata,
    };
    const providerInput: RunProjectionProviderInput = { source };
    const localProjection = await this.tryBuildProjection(
      this.localProjectionProvider,
      providerInput,
    );
    return localProjection ?? buildRunProjectionBundle(runId, [], []);
  }

  private async tryBuildProjection(
    provider: RunProjectionProvider,
    input: RunProjectionProviderInput,
  ): Promise<RunProjection | null> {
    try {
      const projection = await provider.buildProjection(input);
      return projection ? dedupeProjectionBundle(projection) : null;
    } catch (error) {
      logger.warn(
        `[AgentRunViewProjectionService] local replay projection failed for run '${input.source.runId}' (${provider.runtimeKind ?? RuntimeKind.AUTOBYTEUS}): ${String(error)}`,
      );
      return null;
    }
  }
}

let cachedAgentRunViewProjectionService: AgentRunViewProjectionService | null = null;

export const getAgentRunViewProjectionService = (): AgentRunViewProjectionService => {
  if (!cachedAgentRunViewProjectionService) {
    cachedAgentRunViewProjectionService = new AgentRunViewProjectionService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunViewProjectionService;
};

export type { RunProjection } from "../projection/run-projection-types.js";
