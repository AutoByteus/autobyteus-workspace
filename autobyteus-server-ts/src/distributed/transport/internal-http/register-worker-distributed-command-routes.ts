import type { FastifyInstance } from "fastify";
import type { TeamEnvelope } from "../../envelope/envelope-builder.js";
import type { WorkerNodeBridgeServer } from "../../node-bridge/worker-node-bridge-server.js";
import type {
  InternalEnvelopeAuth,
  TransportSecurityMode,
} from "../../security/internal-envelope-auth.js";

type WorkerDistributedCommandRouteDependencies = {
  workerNodeBridgeServer: WorkerNodeBridgeServer;
  internalEnvelopeAuth: InternalEnvelopeAuth;
  securityMode?: TransportSecurityMode;
};

const normalizeMode = (value: TransportSecurityMode | null | undefined): TransportSecurityMode =>
  value === "trusted_lan" ? "trusted_lan" : "strict_signed";

const isTeamEnvelope = (value: unknown): value is TeamEnvelope => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.envelopeId === "string" &&
    typeof record.teamRunId === "string" &&
    (typeof record.runVersion === "string" || typeof record.runVersion === "number") &&
    typeof record.kind === "string" &&
    "payload" in record
  );
};

export async function registerWorkerDistributedCommandRoutes(
  app: FastifyInstance,
  deps: WorkerDistributedCommandRouteDependencies,
): Promise<void> {
  app.post("/internal/distributed/v1/commands", async (request, reply) => {
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

    if (!isTeamEnvelope(request.body)) {
      return reply.code(400).send({
        accepted: false,
        code: "INVALID_ENVELOPE",
        detail: "Request body must be a distributed team envelope.",
      });
    }

    try {
      const result = await deps.workerNodeBridgeServer.handleCommand(request.body);
      return reply.code(202).send({
        accepted: true,
        deduped: result.deduped,
      });
    } catch (error) {
      return reply.code(500).send({
        accepted: false,
        code: "WORKER_COMMAND_DISPATCH_FAILED",
        detail: String(error),
      });
    }
  });
}
