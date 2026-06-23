import { normalizeNodeBaseUrl } from "../../remote-access/services/url-normalization.js";

export const MEMORY_SYNC_REST_PREFIX = "/rest/memory-sync/v1";
export const MEMORY_SYNC_HEALTH_PATH = `${MEMORY_SYNC_REST_PREFIX}/health`;
export const MEMORY_SYNC_BATCHES_PATH = `${MEMORY_SYNC_REST_PREFIX}/batches`;

export const normalizeMemoryHubBaseUrl = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }
  return normalizeNodeBaseUrl(normalized);
};

export const buildMemoryHubIngestionEndpoint = (advertisedHubBaseUrl: string): string =>
  `${normalizeMemoryHubBaseUrl(advertisedHubBaseUrl) ?? advertisedHubBaseUrl}${MEMORY_SYNC_BATCHES_PATH}`;

export const buildMemoryHubHealthEndpoint = (advertisedHubBaseUrl: string): string =>
  `${normalizeMemoryHubBaseUrl(advertisedHubBaseUrl) ?? advertisedHubBaseUrl}${MEMORY_SYNC_HEALTH_PATH}`;
