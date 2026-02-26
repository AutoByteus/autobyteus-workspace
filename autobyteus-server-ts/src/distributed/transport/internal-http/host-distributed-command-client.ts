import type { TeamEnvelope } from "../../envelope/envelope-builder.js";
import type { NodeDirectoryService } from "../../node-directory/node-directory-service.js";
import type {
  InternalEnvelopeAuth,
  TransportSecurityMode,
} from "../../security/internal-envelope-auth.js";

type FetchLike = typeof fetch;

export type HostDistributedCommandClientOptions = {
  nodeDirectoryService: NodeDirectoryService;
  internalEnvelopeAuth: InternalEnvelopeAuth;
  defaultSecurityMode?: TransportSecurityMode;
  fetchImpl?: FetchLike;
  requestTimeoutMs?: number;
};

export class HostDistributedCommandClient {
  private readonly nodeDirectoryService: NodeDirectoryService;
  private readonly internalEnvelopeAuth: InternalEnvelopeAuth;
  private readonly defaultSecurityMode: TransportSecurityMode;
  private readonly fetchImpl: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: HostDistributedCommandClientOptions) {
    this.nodeDirectoryService = options.nodeDirectoryService;
    this.internalEnvelopeAuth = options.internalEnvelopeAuth;
    this.defaultSecurityMode = options.defaultSecurityMode ?? "strict_signed";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 6_000;
  }

  async sendCommand(targetNodeId: string, envelope: TeamEnvelope): Promise<void> {
    const endpoint = this.nodeDirectoryService.resolveDistributedCommandUrl(targetNodeId);
    // Sign the exact normalized JSON payload sent on the wire.
    const normalizedEnvelope = JSON.parse(JSON.stringify(envelope)) as TeamEnvelope;
    const body = JSON.stringify(normalizedEnvelope);
    const headers = this.internalEnvelopeAuth.signRequest({
      body: normalizedEnvelope,
      securityMode: this.defaultSecurityMode,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          `Host distributed command request failed (${response.status}) for node '${targetNodeId}': ${responseBody}`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
