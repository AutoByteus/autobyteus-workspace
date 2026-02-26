import type { FastifyInstance } from "fastify";
import type {
  InternalEnvelopeAuth,
  TransportSecurityMode,
} from "../../security/internal-envelope-auth.js";
import type { TeamHistoryWorkerCleanupHandler } from "../../../run-history/services/team-history-worker-cleanup-handler.js";
import type { TeamHistoryRuntimeStateProbeService } from "../../../run-history/services/team-history-runtime-state-probe-service.js";

type WorkerTeamHistoryRouteDependencies = {
  internalEnvelopeAuth: InternalEnvelopeAuth;
  securityMode?: TransportSecurityMode;
  cleanupHandler: TeamHistoryWorkerCleanupHandler;
  runtimeStateProbeService: TeamHistoryRuntimeStateProbeService;
};

const normalizeMode = (value: TransportSecurityMode | null | undefined): TransportSecurityMode =>
  value === "trusted_lan" ? "trusted_lan" : "strict_signed";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isCleanupPayload = (
  value: unknown,
): value is { teamRunId: string; memberAgentIds: string[] } => {
  if (!isRecord(value) || typeof value.teamRunId !== "string" || !Array.isArray(value.memberAgentIds)) {
    return false;
  }
  return value.memberAgentIds.every((memberAgentId) => typeof memberAgentId === "string");
};

const isRuntimeProbePayload = (value: unknown): value is { teamRunId: string } =>
  isRecord(value) && typeof value.teamRunId === "string";

export async function registerWorkerTeamHistoryCleanupRoutes(
  app: FastifyInstance,
  deps: WorkerTeamHistoryRouteDependencies,
): Promise<void> {
  app.post("/internal/distributed/v1/team-history/cleanup", async (request, reply) => {
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

    if (!isCleanupPayload(request.body)) {
      return reply.code(400).send({
        accepted: false,
        code: "INVALID_TEAM_HISTORY_CLEANUP_PAYLOAD",
        detail: "Body must contain { teamRunId: string, memberAgentIds: string[] }.",
      });
    }

    try {
      const result = await deps.cleanupHandler.cleanupMemberSubtrees({
        teamRunId: request.body.teamRunId,
        memberAgentIds: request.body.memberAgentIds,
      });
      return reply.code(202).send({
        accepted: true,
        deletedMemberCount: result.deletedMemberCount,
        code: "OK",
        detail: "Cleanup accepted.",
      });
    } catch (error) {
      return reply.code(500).send({
        accepted: false,
        code: "TEAM_HISTORY_CLEANUP_FAILED",
        detail: String(error),
      });
    }
  });

  app.post("/internal/distributed/v1/team-history/runtime-state", async (request, reply) => {
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

    if (!isRuntimeProbePayload(request.body)) {
      return reply.code(400).send({
        accepted: false,
        code: "INVALID_TEAM_RUNTIME_PROBE_PAYLOAD",
        detail: "Body must contain { teamRunId: string }.",
      });
    }

    try {
      const active = deps.runtimeStateProbeService.isRuntimeActiveOnLocalNode(request.body.teamRunId);
      return reply.code(200).send({
        accepted: true,
        active,
        code: "OK",
        detail: active ? "Runtime is active on this node." : "Runtime is inactive on this node.",
      });
    } catch (error) {
      return reply.code(500).send({
        accepted: false,
        active: false,
        code: "TEAM_RUNTIME_PROBE_FAILED",
        detail: String(error),
      });
    }
  });
}
