import { appConfigProvider } from "../../config/app-config-provider.js";
import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import {
  getRunProjectionProviderRegistry,
  RunProjectionProviderRegistry,
} from "../projection/run-projection-provider-registry.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
  RunProjectionActivityEntry,
  RunProjectionConversationEntry,
  RunProjectionSourceDescriptor,
} from "../projection/run-projection-types.js";
import { buildRunProjectionBundle } from "../projection/run-projection-utils.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

const projectionRichnessScore = (projection: RunProjection | null | undefined): number => {
  if (!projection) {
    return -1;
  }
  const conversationScore = projection.conversation.length * 10;
  const activityScore = projection.activities.length * 10;
  const summaryScore = projection.summary ? 1 : 0;
  const lastActivityScore = projection.lastActivityAt ? 1 : 0;
  const siblingBundleBonus =
    projection.conversation.length > 0 && projection.activities.length > 0 ? 5 : 0;
  return conversationScore + activityScore + summaryScore + lastActivityScore + siblingBundleBonus;
};

const mergeProjectionRows = <T extends RunProjectionConversationEntry | RunProjectionActivityEntry>(
  primaryRows: T[],
  secondaryRows: T[],
): T[] => {
  const merged: T[] = [];
  const seen = new Set<string>();

  for (const row of [...primaryRows, ...secondaryRows]) {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(row);
  }

  return merged;
};

const mergeProjectionBundles = (
  runId: string,
  primaryProjection: RunProjection | null,
  secondaryProjection: RunProjection | null,
): RunProjection | null => {
  if (!primaryProjection) {
    return secondaryProjection;
  }
  if (!secondaryProjection) {
    return primaryProjection;
  }

  const bundle = buildRunProjectionBundle(
    runId,
    mergeProjectionRows(primaryProjection.conversation, secondaryProjection.conversation),
    mergeProjectionRows(primaryProjection.activities, secondaryProjection.activities),
  );

  return {
    ...bundle,
    summary: bundle.summary ?? primaryProjection.summary ?? secondaryProjection.summary,
    lastActivityAt:
      bundle.lastActivityAt ??
      primaryProjection.lastActivityAt ??
      secondaryProjection.lastActivityAt,
  };
};

export class AgentRunViewProjectionService {
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly providerRegistry: RunProjectionProviderRegistry;

  constructor(
    memoryDir: string,
    options: {
      metadataStore?: AgentRunMetadataStore;
      providerRegistry?: RunProjectionProviderRegistry;
    } = {},
  ) {
    this.metadataStore = options.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.providerRegistry =
      options.providerRegistry ?? getRunProjectionProviderRegistry();
  }

  async getProjection(runId: string): Promise<RunProjection> {
    const metadata = await this.metadataStore.readMetadata(runId);
    return this.getProjectionFromMetadata({
      runId,
      metadata,
      allowFallbackProvider: true,
    });
  }

  async getProjectionFromMetadata(input: {
    runId: string;
    metadata: AgentRunMetadata | null;
    localProjection?: RunProjection | null;
    allowFallbackProvider?: boolean;
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

    const primaryProvider = this.providerRegistry.resolveProvider(runtimeKind);
    const fallbackProvider = this.providerRegistry.resolveFallbackProvider();

    const primaryProjection = await this.tryBuildProjection(primaryProvider, providerInput, "primary");
    const localProjection = input.localProjection ?? null;
    const bestResolvedProjection = mergeProjectionBundles(
      runId,
      localProjection,
      primaryProjection,
    );
    if (
      this.hasUsableProjectionBundle(bestResolvedProjection) ||
      primaryProvider === fallbackProvider ||
      input.allowFallbackProvider === false
    ) {
      return bestResolvedProjection ?? buildRunProjectionBundle(runId, [], []);
    }

    logger.info(
      `[AgentRunViewProjectionService] fallback projection selected for run '${runId}' (${runtimeKind} -> ${fallbackProvider.runtimeKind ?? RuntimeKind.AUTOBYTEUS})`,
    );
    const fallbackProjection = await this.tryBuildProjection(
      fallbackProvider,
      providerInput,
      "fallback",
    );
    if (projectionRichnessScore(bestResolvedProjection) >= projectionRichnessScore(fallbackProjection)) {
      return bestResolvedProjection ?? buildRunProjectionBundle(runId, [], []);
    }
    return fallbackProjection ?? bestResolvedProjection ?? buildRunProjectionBundle(runId, [], []);
  }

  private async tryBuildProjection(
    provider: RunProjectionProvider,
    input: RunProjectionProviderInput,
    mode: "primary" | "fallback",
  ): Promise<RunProjection | null> {
    try {
      return await provider.buildProjection(input);
    } catch (error) {
      logger.warn(
        `[AgentRunViewProjectionService] ${mode} projection failed for run '${input.source.runId}' (${provider.runtimeKind ?? RuntimeKind.AUTOBYTEUS}): ${String(error)}`,
      );
      return null;
    }
  }

  private hasUsableProjectionBundle(projection: RunProjection | null): boolean {
    return Boolean(
      projection &&
        (projection.conversation.length > 0 || projection.activities.length > 0),
    );
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
