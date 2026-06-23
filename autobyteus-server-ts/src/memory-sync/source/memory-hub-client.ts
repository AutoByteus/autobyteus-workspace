import { buildMemoryHubHealthEndpoint, buildMemoryHubIngestionEndpoint, normalizeMemoryHubBaseUrl } from "../hub/memory-hub-config.js";
import type { MemorySyncBatch, MemorySyncBatchCommitResult } from "../shared/memory-sync-types.js";
import { parseMemoryHubJsonResponse } from "./memory-hub-response-parser.js";

export type MemoryHubHealthResult = {
  ok: boolean;
  hubEnabled: boolean;
  sourceNodeId: string;
  authenticated: boolean;
  message?: string | null;
};

export class MemoryHubClient {
  async testConnection(input: {
    hubBaseUrl: string;
    token: string;
    sourceNodeId: string;
  }): Promise<MemoryHubHealthResult> {
    const hubBaseUrl = normalizeMemoryHubBaseUrl(input.hubBaseUrl);
    if (!hubBaseUrl) {
      throw new Error("hubBaseUrl is required.");
    }
    const url = new URL(buildMemoryHubHealthEndpoint(hubBaseUrl));
    url.searchParams.set("sourceNodeId", input.sourceNodeId);
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${input.token}` },
    });
    return parseMemoryHubJsonResponse<MemoryHubHealthResult>(response);
  }

  async pushBatch(input: {
    hubBaseUrl: string;
    token: string;
    batch: MemorySyncBatch;
  }): Promise<MemorySyncBatchCommitResult> {
    const hubBaseUrl = normalizeMemoryHubBaseUrl(input.hubBaseUrl);
    if (!hubBaseUrl) {
      throw new Error("hubBaseUrl is required.");
    }
    const response = await fetch(buildMemoryHubIngestionEndpoint(hubBaseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.batch),
    });
    return parseMemoryHubJsonResponse<MemorySyncBatchCommitResult>(response);
  }
}
