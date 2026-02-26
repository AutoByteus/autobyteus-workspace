import type { FastifyInstance } from "fastify";
import {
  createDiscoveryAdmissionPolicy,
  type DiscoveryAdmissionDecision,
} from "../../discovery/admission/discovery-admission-policy.js";
import { getDiscoveryRuntime } from "../../discovery/runtime/discovery-runtime.js";
import { resolveEffectiveBaseUrl } from "../../discovery/services/discovery-endpoint-normalizer.js";
import { DiscoveryRegistryConflictError } from "../../discovery/services/node-discovery-registry-service.js";

type RegisterDiscoveryBody = {
  nodeId?: string;
  nodeName?: string;
  baseUrl?: string;
  capabilities?: Record<string, boolean> | null;
};

type HeartbeatDiscoveryBody = {
  nodeId?: string;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" ? normalizeOptionalString(value) : null;
};

const validateRegisterBody = (body: RegisterDiscoveryBody): {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  capabilities: Record<string, boolean> | null;
} => {
  const nodeId = asString(body.nodeId);
  const nodeName = asString(body.nodeName);
  const baseUrl = asString(body.baseUrl);

  if (!nodeId || !nodeName || !baseUrl) {
    throw new Error("INVALID_DISCOVERY_REGISTRATION: nodeId, nodeName, and baseUrl are required.");
  }

  let capabilities: Record<string, boolean> | null = null;
  if (body.capabilities && typeof body.capabilities === "object") {
    capabilities = {};
    for (const [key, value] of Object.entries(body.capabilities)) {
      if (typeof value === "boolean") {
        capabilities[key] = value;
      }
    }
  }

  return {
    nodeId,
    nodeName,
    baseUrl,
    capabilities,
  };
};

const evaluateAdmission = (
  body: { nodeId: string; baseUrl: string },
  requestIp: string | null,
): DiscoveryAdmissionDecision => {
  const runtime = getDiscoveryRuntime();
  const policy = runtime.admissionPolicy ?? createDiscoveryAdmissionPolicy(runtime.admissionMode);
  return policy.evaluateAdmission({
    nodeId: body.nodeId,
    baseUrl: body.baseUrl,
    requestIp,
  });
};

export async function registerNodeDiscoveryRoutes(app: FastifyInstance): Promise<void> {
  app.post("/node-discovery/register", async (request, reply) => {
    const runtime = getDiscoveryRuntime();
    if (!runtime.roleConfig.discoveryEnabled) {
      return reply.code(503).send({
        code: "DISCOVERY_DISABLED",
        message: "Discovery runtime is disabled.",
      });
    }

    if (runtime.roleConfig.role !== "registry") {
      return reply.code(409).send({
        code: "DISCOVERY_ROLE_MISMATCH",
        message: "Register endpoint is only available on registry role.",
      });
    }

    let body;
    try {
      body = validateRegisterBody((request.body ?? {}) as RegisterDiscoveryBody);
    } catch (error) {
      return reply.code(400).send({
        code: "INVALID_DISCOVERY_REGISTRATION",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (body.nodeId === runtime.selfIdentity.nodeId) {
      return reply.send({
        accepted: false,
        code: "SELF_REGISTRATION_NOOP",
      });
    }

    const admissionDecision = evaluateAdmission(body, request.ip ?? null);
    if (!admissionDecision.allow) {
      return reply.code(403).send({
        code: admissionDecision.code ?? "DISCOVERY_ADMISSION_DENIED",
        message: admissionDecision.reason ?? "Discovery registration denied.",
      });
    }

    let effectiveBaseUrl: string;
    try {
      effectiveBaseUrl = resolveEffectiveBaseUrl(body.baseUrl, request.ip ?? null);
    } catch (error) {
      return reply.code(400).send({
        code: "INVALID_DISCOVERY_REGISTRATION",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const peer = runtime.registryService.announce({
        nodeId: body.nodeId,
        nodeName: body.nodeName,
        baseUrl: effectiveBaseUrl,
        advertisedBaseUrl: body.baseUrl,
        capabilities: body.capabilities,
        trustMode: runtime.admissionMode,
      });
      return reply.send({
        accepted: true,
        peer,
      });
    } catch (error) {
      if (error instanceof DiscoveryRegistryConflictError) {
        return reply.code(409).send({
          code: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        code: "DISCOVERY_REGISTER_FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/node-discovery/heartbeat", async (request, reply) => {
    const runtime = getDiscoveryRuntime();
    if (!runtime.roleConfig.discoveryEnabled) {
      return reply.code(503).send({
        code: "DISCOVERY_DISABLED",
        message: "Discovery runtime is disabled.",
      });
    }

    if (runtime.roleConfig.role !== "registry") {
      return reply.code(409).send({
        code: "DISCOVERY_ROLE_MISMATCH",
        message: "Heartbeat endpoint is only available on registry role.",
      });
    }

    const body = (request.body ?? {}) as HeartbeatDiscoveryBody;
    const nodeId = asString(body.nodeId);
    if (!nodeId) {
      return reply.code(400).send({
        code: "INVALID_DISCOVERY_REGISTRATION",
        message: "nodeId is required.",
      });
    }

    if (nodeId === runtime.selfIdentity.nodeId) {
      return reply.send({
        accepted: false,
        code: "SELF_REGISTRATION_NOOP",
      });
    }

    const updated = runtime.registryService.heartbeat({ nodeId });
    return reply.send({
      accepted: updated,
      code: updated ? "HEARTBEAT_UPDATED" : "HEARTBEAT_UNKNOWN_NODE",
    });
  });

  app.get("/node-discovery/peers", async (_request, reply) => {
    const runtime = getDiscoveryRuntime();
    if (!runtime.roleConfig.discoveryEnabled) {
      return reply.send({ peers: [] });
    }

    return reply.send({
      peers: runtime.registryService.listPeers(),
    });
  });

  app.get("/node-discovery/self", async (_request, reply) => {
    const runtime = getDiscoveryRuntime();
    return reply.send({
      nodeId: runtime.selfIdentity.nodeId,
      nodeName: runtime.selfIdentity.nodeName,
      baseUrl: runtime.selfIdentity.baseUrl,
      discoveryEnabled: runtime.roleConfig.discoveryEnabled,
      discoveryRole: runtime.roleConfig.role,
      discoveryRegistryUrl: runtime.roleConfig.registryUrl,
    });
  });
}
