import type { MemorySyncConfig, MemorySyncPublicConfig } from "../shared/memory-sync-types.js";

export const DEFAULT_MEMORY_SYNC_INTERVAL_MS = 60_000;
export const DEFAULT_MEMORY_SYNC_BATCH_SIZE = 25;

export const createDefaultMemorySyncConfig = (): MemorySyncConfig => ({
  schemaVersion: 1,
  hub: {
    enabled: false,
    advertisedHubBaseUrl: null,
    updatedAt: null,
  },
  source: {
    enabled: false,
    sourceNodeId: null,
    displayName: null,
    hubBaseUrl: null,
    hubToken: null,
    backgroundEnabled: false,
    intervalMs: DEFAULT_MEMORY_SYNC_INTERVAL_MS,
    batchSize: DEFAULT_MEMORY_SYNC_BATCH_SIZE,
    updatedAt: null,
  },
});

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizePositiveInteger = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
};

export const normalizeMemorySyncConfig = (value: Partial<MemorySyncConfig> | null | undefined): MemorySyncConfig => {
  const fallback = createDefaultMemorySyncConfig();
  const hub = value?.hub ?? fallback.hub;
  const source = value?.source ?? fallback.source;
  return {
    schemaVersion: 1,
    hub: {
      enabled: Boolean(hub.enabled),
      advertisedHubBaseUrl: normalizeOptionalString(hub.advertisedHubBaseUrl),
      updatedAt: normalizeOptionalString(hub.updatedAt),
    },
    source: {
      enabled: Boolean(source.enabled),
      sourceNodeId: normalizeOptionalString(source.sourceNodeId),
      displayName: normalizeOptionalString(source.displayName),
      hubBaseUrl: normalizeOptionalString(source.hubBaseUrl),
      hubToken: normalizeOptionalString(source.hubToken),
      backgroundEnabled: Boolean(source.backgroundEnabled),
      intervalMs: normalizePositiveInteger(source.intervalMs, DEFAULT_MEMORY_SYNC_INTERVAL_MS, 5_000, 24 * 60 * 60_000),
      batchSize: normalizePositiveInteger(source.batchSize, DEFAULT_MEMORY_SYNC_BATCH_SIZE, 1, 200),
      updatedAt: normalizeOptionalString(source.updatedAt),
    },
  };
};

const maskToken = (token: string | null): string | null => {
  if (!token) {
    return null;
  }
  return "••••••••";
};

export const toPublicMemorySyncConfig = (config: MemorySyncConfig): MemorySyncPublicConfig => {
  const { hubToken, ...publicSource } = config.source;
  return {
    schemaVersion: config.schemaVersion,
    hub: { ...config.hub },
    source: {
      ...publicSource,
      hubTokenConfigured: Boolean(hubToken),
      hubTokenPreview: maskToken(hubToken),
    },
  };
};
