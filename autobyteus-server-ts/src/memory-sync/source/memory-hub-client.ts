import {
  buildMemoryHubHealthEndpoint,
  buildMemoryHubIngestionEndpoint,
  buildMemoryHubStagedFileEndpoint,
  normalizeMemoryHubBaseUrl,
} from "../hub/memory-hub-config.js";
import type { MemorySyncBatch, MemorySyncBatchCommitResult } from "../shared/memory-sync-types.js";
import { parseMemoryHubJsonResponse } from "./memory-hub-response-parser.js";

export type MemoryHubHealthResult = {
  ok: boolean;
  hubEnabled: boolean;
  memorySyncSourceId: string;
  authenticated: boolean;
  message?: string | null;
};

export class MemoryHubClient {
  async testConnection(input: {
    hubBaseUrl: string;
    token: string;
    memorySyncSourceId: string;
  }): Promise<MemoryHubHealthResult> {
    const hubBaseUrl = normalizeMemoryHubBaseUrl(input.hubBaseUrl);
    if (!hubBaseUrl) {
      throw new Error("hubBaseUrl is required.");
    }
    const url = new URL(buildMemoryHubHealthEndpoint(hubBaseUrl));
    url.searchParams.set("memorySyncSourceId", input.memorySyncSourceId);
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

  /** How many bytes of the staged file `sha256` the hub already holds (0 when none). */
  async getStagedFileStatus(input: {
    hubBaseUrl: string;
    token: string;
    memorySyncSourceId: string;
    sha256: string;
  }): Promise<{ receivedBytes: number }> {
    const response = await fetch(buildMemoryHubStagedFileEndpoint(input.hubBaseUrl, input.memorySyncSourceId, input.sha256), {
      method: "GET",
      headers: { Authorization: `Bearer ${input.token}` },
    });
    return parseMemoryHubJsonResponse<{ receivedBytes: number }>(response);
  }

  /** Appends one piece (at most the piece limit) to the staged file at `offset`; a wrong offset throws a 409 error. */
  async putStagedFilePiece(input: {
    hubBaseUrl: string;
    token: string;
    memorySyncSourceId: string;
    sha256: string;
    offset: number;
    bytes: Buffer;
  }): Promise<{ receivedBytes: number }> {
    const url = new URL(buildMemoryHubStagedFileEndpoint(input.hubBaseUrl, input.memorySyncSourceId, input.sha256));
    url.searchParams.set("offset", String(input.offset));
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(input.bytes.buffer as ArrayBuffer, input.bytes.byteOffset, input.bytes.byteLength),
    });
    return parseMemoryHubJsonResponse<{ receivedBytes: number }>(response);
  }
}
