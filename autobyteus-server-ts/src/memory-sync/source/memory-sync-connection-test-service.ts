import { normalizeMemoryHubBaseUrl } from "../hub/memory-hub-config.js";
import { normalizeSourceId } from "../shared/source-id.js";
import { MemoryHubClient, type MemoryHubHealthResult } from "./memory-hub-client.js";
import { getMemorySyncConfigService, type MemorySyncConfigService } from "./memory-sync-config-service.js";

export type MemorySyncConnectionTestInput =
  | { mode: "saved" }
  | {
      mode: "draft";
      hubBaseUrl?: string | null;
      sourceId?: string | null;
      token?: string | null;
    };

const requireNonEmpty = (value: string | null | undefined, message: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
};

export class MemorySyncConnectionTestService {
  constructor(
    private readonly configService: MemorySyncConfigService = getMemorySyncConfigService(),
    private readonly hubClient = new MemoryHubClient(),
  ) {}

  async testConnection(input: MemorySyncConnectionTestInput): Promise<MemoryHubHealthResult> {
    if (input.mode === "saved") {
      return this.testSavedConnection();
    }
    return this.testDraftConnection(input);
  }

  private async testSavedConnection(): Promise<MemoryHubHealthResult> {
    const config = await this.configService.getConfig();
    const source = config.source;
    const hubBaseUrl = requireNonEmpty(
      source.hubBaseUrl,
      "Saved Memory Sync source hubBaseUrl is required before testing connection.",
    );
    const sourceId = requireNonEmpty(
      source.sourceId,
      "Saved Memory Sync source ID is required before testing connection.",
    );
    const token = requireNonEmpty(
      source.hubToken,
      "Saved Memory Sync source hub token is required before testing connection.",
    );

    return this.hubClient.testConnection({ hubBaseUrl, sourceId, token });
  }

  private async testDraftConnection(input: Extract<MemorySyncConnectionTestInput, { mode: "draft" }>): Promise<MemoryHubHealthResult> {
    const hubBaseUrl = normalizeMemoryHubBaseUrl(input.hubBaseUrl);
    if (!hubBaseUrl) {
      throw new Error("hubBaseUrl is required.");
    }
    const sourceId = normalizeSourceId(input.sourceId);
    const token = requireNonEmpty(input.token, "Hub token is required for draft connection testing.");

    return this.hubClient.testConnection({ hubBaseUrl, sourceId, token });
  }
}

let singleton: MemorySyncConnectionTestService | null = null;

export const getMemorySyncConnectionTestService = (): MemorySyncConnectionTestService => {
  singleton ??= new MemorySyncConnectionTestService();
  return singleton;
};

export const resetMemorySyncConnectionTestServiceForTests = (): void => {
  singleton = null;
};
