import type { FastifyInstance } from "fastify";
import { RemoteAccessError } from "../../remote-access/domain/models.js";
import { getNodeNetworkService } from "../../remote-access/services/node-network-service.js";
import { getPairedDeviceService } from "../../remote-access/services/paired-device-service.js";
import { getRemoteAccessPairingService } from "../../remote-access/services/remote-access-pairing-service.js";
import { getRemoteAccessSettingsService } from "../../remote-access/services/remote-access-settings-service.js";
import { getNodeIdentityService, NodeIdentityNotMigratedError } from "../../remote-access/services/node-identity-service.js";

const sendRemoteAccessError = (reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) => {
  if (error instanceof RemoteAccessError) {
    return reply.code(error.statusCode).send({
      error: error.code,
      code: error.code,
      message: error.message,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("URL") || message.includes("required")) {
    return reply.code(400).send({ detail: message, message });
  }
  return reply.code(500).send({ detail: "Remote Access request failed.", message: "Remote Access request failed." });
};

export async function registerRemoteAccessRoutes(app: FastifyInstance): Promise<void> {
  app.get("/remote-access/status", async (_request, reply) => {
    const settings = await getRemoteAccessSettingsService().getSettings();
    let nodeId: string;
    try {
      nodeId = await getNodeIdentityService().getNodeId();
    } catch (error) {
      // autobyteus-290 N-910: the reason, so a probe says "waiting for its data migration", not "not AutoByteus".
      if (error instanceof NodeIdentityNotMigratedError) return reply.code(503).send({ code: error.code, message: error.message });
      throw error;
    }
    return {
      phoneAccessEnabled: settings.phoneAccessEnabled,
      pairingAvailable: settings.phoneAccessEnabled,
      nodeId,
    };
  });

  app.get("/remote-access/network", async () => ({
    network: await getNodeNetworkService().getNodeNetwork(),
  }));

  app.put<{ Params: { networkId: string }; Body: { allowed?: boolean } }>(
    "/remote-access/network/local-networks/:networkId",
    async (request, reply) => {
      if (typeof request.body?.allowed !== "boolean") {
        return reply.code(400).send({ detail: "allowed boolean is required." });
      }
      try {
        await getNodeNetworkService().setLocalNetworkAllowed(request.params.networkId, request.body.allowed);
        return { networkId: request.params.networkId, allowed: request.body.allowed };
      } catch (error) {
        return sendRemoteAccessError(reply, error);
      }
    },
  );

  app.get("/remote-access/settings", async () => ({
    settings: await getRemoteAccessSettingsService().getSettings(),
  }));

  app.put<{ Body: { phoneAccessEnabled?: boolean } }>("/remote-access/settings", async (request, reply) => {
    if (typeof request.body?.phoneAccessEnabled !== "boolean") {
      return reply.code(400).send({ detail: "phoneAccessEnabled boolean is required." });
    }
    return {
      settings: await getRemoteAccessSettingsService().setPhoneAccessEnabled(request.body.phoneAccessEnabled),
    };
  });

  app.post<{
    Body: {
      serverBaseUrl?: string;
      serverName?: string | null;
      connectionWay?: string;
      trustedPrivateHttpAcknowledged?: boolean;
    };
  }>("/remote-access/pairing-sessions", async (request, reply) => {
    try {
      const result = await getRemoteAccessPairingService().createPairingSession({
        serverBaseUrl: request.body?.serverBaseUrl ?? "",
        serverName: request.body?.serverName,
        connectionWay: request.body?.connectionWay,
        trustedPrivateHttpAcknowledged: request.body?.trustedPrivateHttpAcknowledged,
      });
      return reply.code(201).send(result);
    } catch (error) {
      return sendRemoteAccessError(reply, error);
    }
  });

  app.delete<{ Params: { sessionId: string } }>("/remote-access/pairing-sessions/:sessionId", async (request, reply) => {
    getRemoteAccessPairingService().discardSession(request.params.sessionId);
    return reply.code(204).send();
  });

  app.post<{
    Body: { pairingCode?: string; deviceName?: string | null; serverBaseUrl?: string | null };
  }>("/remote-access/pairing-exchanges", async (request, reply) => {
    try {
      const result = await getRemoteAccessPairingService().exchangePairingCode({
        pairingCode: request.body?.pairingCode ?? "",
        deviceName: request.body?.deviceName,
        serverBaseUrl: request.body?.serverBaseUrl,
      });
      return reply.code(201).send(result);
    } catch (error) {
      return sendRemoteAccessError(reply, error);
    }
  });

  app.get("/remote-access/devices", async () => ({
    devices: await getPairedDeviceService().listActiveDeviceSummaries(),
  }));

  app.get("/remote-access/devices/revoked", async () => ({
    devices: await getPairedDeviceService().listRevokedDeviceSummaries(),
  }));

  app.delete<{ Params: { deviceId: string } }>("/remote-access/devices/:deviceId", async (request, reply) => {
    const device = await getPairedDeviceService().revokeDevice(request.params.deviceId);
    if (!device) {
      return reply.code(404).send({ detail: "Paired device not found." });
    }
    return { device };
  });

  app.delete("/remote-access/devices", async () => ({
    result: await getPairedDeviceService().revokeAllDevices(),
  }));
}
