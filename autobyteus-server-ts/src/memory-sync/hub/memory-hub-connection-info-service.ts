import { buildMemoryHubHealthEndpoint, buildMemoryHubIngestionEndpoint } from "./memory-hub-config.js";
import { getMemoryHubCredentialService, type MemoryHubCredentialService } from "./memory-hub-credential-service.js";
import { getMemorySyncConfigService, type MemorySyncConfigService } from "../source/memory-sync-config-service.js";
import type { MemoryHubSourceCredentialSummary } from "../shared/memory-sync-types.js";

export type MemoryHubConnectionInfo = {
  hubEnabled: boolean;
  advertisedHubBaseUrl: string | null;
  ingestEndpointUrl: string | null;
  healthEndpointUrl: string | null;
  credentials: MemoryHubSourceCredentialSummary[];
  secureTransportWarning: string | null;
};

const transportWarning = (baseUrl: string | null): string | null => {
  if (!baseUrl) {
    return null;
  }
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "host.docker.internal";
    if (url.protocol === "http:" && !local) {
      return "Memory Sync imports can contain sensitive memory data. Use HTTPS, a private network, or Kubernetes ingress/network policy for non-local deployments.";
    }
  } catch {
    return null;
  }
  return null;
};

export class MemoryHubConnectionInfoService {
  constructor(
    private readonly configService: MemorySyncConfigService = getMemorySyncConfigService(),
    private readonly credentialService: MemoryHubCredentialService = getMemoryHubCredentialService(),
  ) {}

  async getConnectionInfo(): Promise<MemoryHubConnectionInfo> {
    const config = await this.configService.getConfig();
    const baseUrl = config.hub.advertisedHubBaseUrl;
    return {
      hubEnabled: config.hub.enabled,
      advertisedHubBaseUrl: baseUrl,
      ingestEndpointUrl: baseUrl ? buildMemoryHubIngestionEndpoint(baseUrl) : null,
      healthEndpointUrl: baseUrl ? buildMemoryHubHealthEndpoint(baseUrl) : null,
      credentials: await this.credentialService.listCredentialSummaries(),
      secureTransportWarning: transportWarning(baseUrl),
    };
  }
}

let singleton: MemoryHubConnectionInfoService | null = null;

export const getMemoryHubConnectionInfoService = (): MemoryHubConnectionInfoService => {
  singleton ??= new MemoryHubConnectionInfoService();
  return singleton;
};

export const resetMemoryHubConnectionInfoServiceForTests = (): void => {
  singleton = null;
};
