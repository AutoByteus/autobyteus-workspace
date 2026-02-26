import type { NodeDirectoryService } from "../../node-directory/node-directory-service.js";
import type { RemoteExecutionEvent } from "../../worker-execution/remote-member-execution-gateway.js";
import type {
  InternalEnvelopeAuth,
  TransportSecurityMode,
} from "../../security/internal-envelope-auth.js";

type FetchLike = typeof fetch;

export type WorkerEventUplinkClientOptions = {
  hostNodeId: string;
  nodeDirectoryService: NodeDirectoryService;
  internalEnvelopeAuth: InternalEnvelopeAuth;
  defaultSecurityMode?: TransportSecurityMode;
  fetchImpl?: FetchLike;
  requestTimeoutMs?: number;
};

export class WorkerEventUplinkClient {
  private readonly hostNodeId: string;
  private readonly nodeDirectoryService: NodeDirectoryService;
  private readonly internalEnvelopeAuth: InternalEnvelopeAuth;
  private readonly defaultSecurityMode: TransportSecurityMode;
  private readonly fetchImpl: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: WorkerEventUplinkClientOptions) {
    this.hostNodeId = options.hostNodeId;
    this.nodeDirectoryService = options.nodeDirectoryService;
    this.internalEnvelopeAuth = options.internalEnvelopeAuth;
    this.defaultSecurityMode = options.defaultSecurityMode ?? "strict_signed";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 6_000;
  }

  async publishRemoteEvent(
    event: RemoteExecutionEvent,
    targetHostNodeId: string = this.hostNodeId,
  ): Promise<void> {
    const endpoint = this.nodeDirectoryService.resolveDistributedEventUrl(targetHostNodeId);
    // Sign the exact normalized JSON payload sent on the wire.
    const normalizedEvent = JSON.parse(JSON.stringify(event)) as RemoteExecutionEvent;
    const body = JSON.stringify(normalizedEvent);
    const headers = this.internalEnvelopeAuth.signRequest({
      body: normalizedEvent,
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
          `Worker event uplink failed (${response.status}) for host node '${targetHostNodeId}': ${responseBody}`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
