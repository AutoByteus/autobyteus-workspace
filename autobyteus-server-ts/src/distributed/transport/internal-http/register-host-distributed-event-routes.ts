import type { FastifyInstance } from "fastify";
import type { RemoteEventRebroadcastService } from "../../event-aggregation/remote-event-rebroadcast-service.js";
import type { TeamEventAggregator } from "../../event-aggregation/team-event-aggregator.js";
import { RemoteEventIdempotencyPolicy } from "../../policies/remote-event-idempotency-policy.js";
import type { RunVersionFencingPolicy } from "../../policies/run-version-fencing-policy.js";
import type {
  InternalEnvelopeAuth,
  TransportSecurityMode,
} from "../../security/internal-envelope-auth.js";

type HostDistributedEventRouteDependencies = {
  teamEventAggregator: TeamEventAggregator;
  internalEnvelopeAuth: InternalEnvelopeAuth;
  runVersionFencingPolicy?: RunVersionFencingPolicy;
  remoteEventIdempotencyPolicy?: RemoteEventIdempotencyPolicy;
  securityMode?: TransportSecurityMode;
  remoteEventRebroadcastService?: RemoteEventRebroadcastService;
};

type RemoteEventBody = {
  teamRunId: string;
  runVersion: string | number;
  sourceNodeId: string;
  sourceEventId: string;
  eventType: string;
  payload: unknown;
  memberName?: string | null;
  agentRunId?: string | null;
};

const normalizeMode = (value: TransportSecurityMode | null | undefined): TransportSecurityMode =>
  value === "trusted_lan" ? "trusted_lan" : "strict_signed";

const isRemoteEventBody = (value: unknown): value is RemoteEventBody => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.teamRunId === "string" &&
    (typeof record.runVersion === "string" || typeof record.runVersion === "number") &&
    typeof record.sourceNodeId === "string" &&
    typeof record.sourceEventId === "string" &&
    typeof record.eventType === "string" &&
    "payload" in record
  );
};

export async function registerHostDistributedEventRoutes(
  app: FastifyInstance,
  deps: HostDistributedEventRouteDependencies,
): Promise<void> {
  app.post("/internal/distributed/v1/events", async (request, reply) => {
    const verification = deps.internalEnvelopeAuth.verifyRequest({
      headers: request.headers as Record<string, unknown>,
      body: request.body,
      securityMode: normalizeMode(deps.securityMode),
    });
    if (!verification.accepted) {
      return reply.code(401).send({
        accepted: false,
        code: verification.code ?? "UNAUTHORIZED",
        detail: verification.message ?? "Transport request rejected.",
      });
    }

    if (!isRemoteEventBody(request.body)) {
      return reply.code(400).send({
        accepted: false,
        code: "INVALID_EVENT_PAYLOAD",
        detail: "Request body must be a distributed remote event envelope.",
      });
    }

    if (deps.runVersionFencingPolicy) {
      const stale = await deps.runVersionFencingPolicy.dropIfStale(
        request.body.teamRunId,
        request.body.runVersion,
      );
      if (stale) {
        return reply.code(202).send({
          accepted: true,
          dropped: true,
          reason: "STALE_RUN_VERSION",
        });
      }
    }

    const isDuplicate = deps.remoteEventIdempotencyPolicy?.shouldDropDuplicate({
      teamRunId: request.body.teamRunId,
      sourceNodeId: request.body.sourceNodeId,
      sourceEventId: request.body.sourceEventId,
    }) ?? false;
    if (isDuplicate) {
      return reply.code(202).send({
        accepted: true,
        dropped: true,
        reason: "DUPLICATE_SOURCE_EVENT",
      });
    }

    const aggregatedEvent = deps.teamEventAggregator.publishRemoteEvent({
      teamRunId: request.body.teamRunId,
      runVersion: request.body.runVersion,
      sourceNodeId: request.body.sourceNodeId,
      eventType: request.body.eventType,
      payload: request.body.payload,
      memberName: request.body.memberName ?? null,
      agentId: request.body.agentRunId ?? null,
    });

    try {
      await deps.remoteEventRebroadcastService?.rebroadcastRemoteEvent({
        aggregatedEvent,
      });
    } catch {
      // Keep ingestion resilient even when stream projection fails.
    }

    return reply.code(202).send({
      accepted: true,
      dropped: false,
    });
  });
}
