import { EventEmitter } from "node:events";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import { normalizeMemoryHubBaseUrl } from "../hub/memory-hub-config.js";
import type { MemorySyncConfig, MemorySyncPublicConfig } from "../shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { requireMemorySyncReady } from "../shared/memory-sync-capability.js";
import {
  createDefaultMemorySyncConfig,
  normalizeMemorySyncConfig,
  toPublicMemorySyncConfig,
} from "./memory-sync-config.js";

type AppConfigLike = { getAppDataDir(): string };

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const normalizeInterval = (value: number | null | undefined): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 60_000;
  }
  return Math.min(24 * 60 * 60_000, Math.max(5_000, parsed));
};

const normalizeBatchSize = (value: number | null | undefined): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 25;
  }
  return Math.min(200, Math.max(1, parsed));
};

export class MemorySyncConfigService {
  private readonly events = new EventEmitter();

  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "memory-sync", "memory-sync-config.json");
  }

  async getConfig(): Promise<MemorySyncConfig> {
    requireMemorySyncReady();
    const raw = await readJsonFile<Partial<MemorySyncConfig>>(this.getFilePath(), createDefaultMemorySyncConfig());
    return normalizeMemorySyncConfig(raw);
  }

  async getPublicConfig(): Promise<MemorySyncPublicConfig> {
    return toPublicMemorySyncConfig(await this.getConfig());
  }

  async updateHubConfig(input: {
    enabled?: boolean | null;
    advertisedHubBaseUrl?: string | null;
  }): Promise<MemorySyncConfig> {
    const existing = await this.getConfig();
    const next: MemorySyncConfig = {
      ...existing,
      hub: {
        ...existing.hub,
        enabled: typeof input.enabled === "boolean" ? input.enabled : existing.hub.enabled,
        advertisedHubBaseUrl: input.advertisedHubBaseUrl === undefined
          ? existing.hub.advertisedHubBaseUrl
          : normalizeMemoryHubBaseUrl(input.advertisedHubBaseUrl),
        updatedAt: new Date().toISOString(),
      },
    };
    if (next.hub.enabled && !next.hub.advertisedHubBaseUrl) {
      throw new Error("advertisedHubBaseUrl is required when Memory Hub is enabled.");
    }
    await writeJsonFile(this.getFilePath(), next);
    this.events.emit("configChanged", next);
    return next;
  }

  async updateSourceConfig(input: {
    enabled?: boolean | null;
    memorySyncSourceId?: string | null;
    displayName?: string | null;
    hubBaseUrl?: string | null;
    hubToken?: string | null;
    backgroundEnabled?: boolean | null;
    intervalMs?: number | null;
    batchSize?: number | null;
  }): Promise<MemorySyncConfig> {
    const existing = await this.getConfig();
    const requestedToken = input.hubToken === undefined ? existing.source.hubToken : normalizeOptionalString(input.hubToken);
    const next: MemorySyncConfig = {
      ...existing,
      source: {
        ...existing.source,
        enabled: typeof input.enabled === "boolean" ? input.enabled : existing.source.enabled,
        memorySyncSourceId: input.memorySyncSourceId === undefined
          ? existing.source.memorySyncSourceId
          : (input.memorySyncSourceId ? normalizeMemorySyncSourceId(input.memorySyncSourceId) : null),
        displayName: input.displayName === undefined ? existing.source.displayName : normalizeOptionalString(input.displayName),
        hubBaseUrl: input.hubBaseUrl === undefined
          ? existing.source.hubBaseUrl
          : normalizeMemoryHubBaseUrl(input.hubBaseUrl),
        hubToken: requestedToken,
        backgroundEnabled: typeof input.backgroundEnabled === "boolean"
          ? input.backgroundEnabled
          : existing.source.backgroundEnabled,
        intervalMs: input.intervalMs === undefined ? existing.source.intervalMs : normalizeInterval(input.intervalMs),
        batchSize: input.batchSize === undefined ? existing.source.batchSize : normalizeBatchSize(input.batchSize),
        updatedAt: new Date().toISOString(),
      },
    };
    if (next.source.enabled) {
      if (!next.source.memorySyncSourceId) {
        throw new Error("memorySyncSourceId is required when Memory Sync source is enabled.");
      }
      if (!next.source.hubBaseUrl) {
        throw new Error("hubBaseUrl is required when Memory Sync source is enabled.");
      }
      if (!next.source.hubToken) {
        throw new Error("hubToken is required when Memory Sync source is enabled.");
      }
    }
    await writeJsonFile(this.getFilePath(), next);
    this.events.emit("configChanged", next);
    return next;
  }

  onConfigChanged(listener: (config: MemorySyncConfig) => void): () => void {
    this.events.on("configChanged", listener);
    return () => this.events.off("configChanged", listener);
  }
}

let singleton: MemorySyncConfigService | null = null;

export const getMemorySyncConfigService = (): MemorySyncConfigService => {
  singleton ??= new MemorySyncConfigService();
  return singleton;
};

export const resetMemorySyncConfigServiceForTests = (): void => {
  singleton = null;
};
