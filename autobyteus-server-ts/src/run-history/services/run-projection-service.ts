import { appConfigProvider } from "../../config/app-config-provider.js";
import { DEFAULT_RUNTIME_KIND, normalizeRuntimeKind } from "../../runtime-management/runtime-kind.js";
import {
  getRunProjectionProviderRegistry,
  RunProjectionProviderRegistry,
} from "../projection/run-projection-provider-registry.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
} from "../projection/run-projection-provider-port.js";
import type { RunProjection } from "../projection/run-projection-types.js";
import { buildRunProjection } from "../projection/run-projection-utils.js";
import { RunManifestStore } from "../store/run-manifest-store.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class RunProjectionService {
  private readonly manifestStore: RunManifestStore;
  private readonly providerRegistry: RunProjectionProviderRegistry;

  constructor(
    memoryDir: string,
    options: {
      manifestStore?: RunManifestStore;
      providerRegistry?: RunProjectionProviderRegistry;
    } = {},
  ) {
    this.manifestStore = options.manifestStore ?? new RunManifestStore(memoryDir);
    this.providerRegistry =
      options.providerRegistry ?? getRunProjectionProviderRegistry();
  }

  async getProjection(runId: string): Promise<RunProjection> {
    const manifest = await this.manifestStore.readManifest(runId);
    const runtimeKind = normalizeRuntimeKind(manifest?.runtimeKind, DEFAULT_RUNTIME_KIND);
    const input: RunProjectionProviderInput = {
      runId,
      runtimeKind,
      manifest,
      runtimeReference: manifest?.runtimeReference ?? null,
    };

    const primaryProvider = this.providerRegistry.resolveProvider(runtimeKind);
    const fallbackProvider = this.providerRegistry.resolveFallbackProvider();

    const primaryProjection = await this.tryBuildProjection(primaryProvider, input, "primary");
    if (
      this.hasUsableConversation(primaryProjection) ||
      primaryProvider.providerId === fallbackProvider.providerId
    ) {
      return primaryProjection ?? buildRunProjection(runId, []);
    }

    logger.info(
      `[RunProjectionService] fallback provider selected for run '${runId}' (${runtimeKind} -> ${fallbackProvider.providerId})`,
    );
    const fallbackProjection = await this.tryBuildProjection(fallbackProvider, input, "fallback");
    return fallbackProjection ?? primaryProjection ?? buildRunProjection(runId, []);
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
        `[RunProjectionService] ${mode} projection provider '${provider.providerId}' failed for run '${input.runId}': ${String(error)}`,
      );
      return null;
    }
  }

  private hasUsableConversation(projection: RunProjection | null): boolean {
    return Boolean(projection && projection.conversation.length > 0);
  }
}

let cachedRunProjectionService: RunProjectionService | null = null;

export const getRunProjectionService = (): RunProjectionService => {
  if (!cachedRunProjectionService) {
    cachedRunProjectionService = new RunProjectionService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedRunProjectionService;
};

export type { RunProjection } from "../projection/run-projection-types.js";
