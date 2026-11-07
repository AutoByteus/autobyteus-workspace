import "reflect-metadata";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerRemoteAccessRoutes } from "../../../src/api/rest/remote-access.js";
import { registerRemoteAccessPolicyPlugin } from "../../../src/api/security/remote-access-policy-plugin.js";
import {
  getRemoteAccessAuthContext,
  resetRemoteAccessRoutePolicyForTests,
} from "../../../src/api/security/remote-access-route-policy.js";
import type {
  CreatePairingSessionResult,
  PairedDeviceSummary,
  PairingExchangeResult,
  RemoteAccessAuthContext,
} from "../../../src/remote-access/domain/models.js";
import { resetRemoteAccessAuthServiceForTests } from "../../../src/remote-access/services/remote-access-auth-service.js";
import { resetPairedDeviceServiceForTests } from "../../../src/remote-access/services/paired-device-service.js";
import { resetRemoteAccessPairingServiceForTests } from "../../../src/remote-access/services/remote-access-pairing-service.js";
import { resetRemoteAccessSettingsServiceForTests } from "../../../src/remote-access/services/remote-access-settings-service.js";
import {
  configureNodeIdentityCapability,
  resetNodeIdentityServiceForTests,
} from "../../../src/remote-access/services/node-identity-service.js";
import { resetPairedDeviceStoreForTests } from "../../../src/remote-access/stores/paired-device-store.js";
import { resetRemoteAccessSettingsStoreForTests } from "../../../src/remote-access/stores/remote-access-settings-store.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

type DevicesResponse = { devices: PairedDeviceSummary[] };
type ProtectedProbeResponse = {
  ok: true;
  authContext: RemoteAccessAuthContext | null;
};
type RemoteAccessStatusResponse = {
  phoneAccessEnabled: boolean;
  pairingAvailable: boolean;
  nodeId: string;
};

describe("Phone Access running REST route behavior", () => {
  let app: FastifyInstance;
  let appDataDir: string;

  beforeEach(async () => {
    appDataDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-phone-access-routes-"));
    resetRemoteAccessSingletons();
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir });
    // Startup marks the node identity ready once the app-data migrations have run
    // (applyCapabilityReadiness); this test builds its own app without that step.
    configureNodeIdentityCapability(true);

    app = fastify();
    await registerRemoteAccessPolicyPlugin(app);
    await app.register(registerRemoteAccessRoutes, { prefix: "/rest" });
    app.get("/rest/protected-probe", async (request: FastifyRequest): Promise<ProtectedProbeResponse> => ({
      ok: true,
      authContext: getRemoteAccessAuthContext(request),
    }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await rm(appDataDir, { recursive: true, force: true });
    resetRemoteAccessSingletons();
    appConfigProvider.resetForTests();
  });

  it("keeps active and revoked device routes separate while proving HTTPS and trusted LAN HTTP QR policy", async () => {
    await enablePhoneAccess();

    const httpWithoutAcknowledgementResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: { connectionWay: "tailscale", serverBaseUrl: "http://192.168.1.25:29695/mobile" },
    });
    expect(httpWithoutAcknowledgementResponse.statusCode).toBe(400);
    expect(httpWithoutAcknowledgementResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED" });

    const publicHttpResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: { connectionWay: "tailscale", serverBaseUrl: "http://example.com:29695/mobile", trustedPrivateHttpAcknowledged: true },
    });
    expect(publicHttpResponse.statusCode).toBe(400);
    expect(publicHttpResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED" });

    const localOnlyResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: { connectionWay: "tailscale", serverBaseUrl: "http://127.0.0.1:29695/mobile", trustedPrivateHttpAcknowledged: true },
    });
    expect(localOnlyResponse.statusCode).toBe(400);
    expect(localOnlyResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY" });

    const privateHttpSession = await createPairingSession("http://192.168.1.25:29695/mobile?pairing=old", true);
    expect(privateHttpSession.payload.serverBaseUrl).toBe("http://192.168.1.25:29695");
    expect(privateHttpSession.mobileUrl).toMatch(/^http:\/\/192\.168\.1\.25:29695\/mobile\?pairing=/);
    expect(decodePairingParam(privateHttpSession.mobileUrl)).toMatchObject({
      serverBaseUrl: "http://192.168.1.25:29695",
      pairingCode: privateHttpSession.payload.pairingCode,
    });

    const basePathSession = await createPairingSession("https://gateway.example.com/autobyteus/mobile?pairing=old");
    expect(basePathSession.payload.serverBaseUrl).toBe("https://gateway.example.com/autobyteus");
    expect(basePathSession.mobileUrl).toMatch(/^https:\/\/gateway\.example\.com\/autobyteus\/mobile\?pairing=/);

    for (let index = 1; index <= 19; index += 1) {
      const session = await createPairingSession("https://desktop.tailnet.ts.net/mobile?pairing=old");
      expect(session.payload.serverBaseUrl).toBe("https://desktop.tailnet.ts.net");
      expect(session.mobileUrl).toMatch(/^https:\/\/desktop\.tailnet\.ts\.net\/mobile\?pairing=/);
      expect(decodePairingParam(session.mobileUrl)).toMatchObject({
        serverBaseUrl: "https://desktop.tailnet.ts.net",
        pairingCode: session.payload.pairingCode,
      });

      const exchange = await exchangePairingSession(session, `Revoked Phone ${index}`);
      expect(exchange.serverBaseUrl).toBe("https://desktop.tailnet.ts.net");
      expect(exchange.device.clientFacingBaseUrl).toBe("https://desktop.tailnet.ts.net");
      await revokeDevice(exchange.device.deviceId);
    }

    const activeSession = await createPairingSession("https://desktop.tailnet.ts.net/mobile?pairing=old");
    const activeExchange = await exchangePairingSession(activeSession, "Active Phone");

    const activeResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices",
      remoteAddress: "100.64.1.2",
    });
    expect(activeResponse.statusCode).toBe(200);
    expect((activeResponse.json() as DevicesResponse).devices).toMatchObject([
      {
        deviceId: activeExchange.device.deviceId,
        displayName: "Active Phone",
        clientFacingBaseUrl: "https://desktop.tailnet.ts.net",
        revokedAt: null,
      },
    ]);

    const revokedResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
    });
    expect(revokedResponse.statusCode).toBe(200);
    const revokedDevices = (revokedResponse.json() as DevicesResponse).devices;
    expect(revokedDevices).toHaveLength(19);
    expect(revokedDevices.every((device) => typeof device.revokedAt === "string")).toBe(true);

    const mobileOnManagementRouteResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
      headers: { authorization: `Bearer ${activeExchange.credential}` },
    });
    expect(mobileOnManagementRouteResponse.statusCode).toBe(403);
    expect(mobileOnManagementRouteResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_AUTH_INVALID" });

    const mobileProtectedResponse = await inject({
      method: "GET",
      url: "/rest/protected-probe",
      remoteAddress: "100.64.1.2",
      headers: { authorization: `Bearer ${activeExchange.credential}` },
    });
    expect(mobileProtectedResponse.statusCode).toBe(200);
    expect(mobileProtectedResponse.json() as ProtectedProbeResponse).toMatchObject({
      ok: true,
      authContext: {
        mode: "mobile",
        isAuthenticated: true,
        deviceId: activeExchange.device.deviceId,
        clientFacingBaseUrl: "https://desktop.tailnet.ts.net",
      },
    });

    await revokeDevice(activeExchange.device.deviceId);

    const activeAfterRevokeResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices",
      remoteAddress: "100.64.1.2",
    });
    expect(activeAfterRevokeResponse.statusCode).toBe(200);
    expect((activeAfterRevokeResponse.json() as DevicesResponse).devices).toEqual([]);

    const revokedAfterRevokeResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
    });
    expect(revokedAfterRevokeResponse.statusCode).toBe(200);
    expect((revokedAfterRevokeResponse.json() as DevicesResponse).devices).toHaveLength(20);

    const revokedCredentialResponse = await inject({
      method: "GET",
      url: "/rest/protected-probe",
      remoteAddress: "100.64.1.2",
      headers: { authorization: `Bearer ${activeExchange.credential}` },
    });
    expect(revokedCredentialResponse.statusCode).toBe(403);
    expect(revokedCredentialResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_DEVICE_REVOKED" });
  });

  it("restores trusted-network remote-node management and protected routes without additional credentials", async () => {
    const firstStatusResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/status",
      remoteAddress: "100.64.1.2",
    });
    expect(firstStatusResponse.statusCode).toBe(200);
    const firstStatus = firstStatusResponse.json() as RemoteAccessStatusResponse;
    expect(firstStatus.nodeId).toMatch(/^srv_[A-Za-z0-9_-]{32,}$/);
    expect(Object.keys(firstStatus).sort()).toEqual(["nodeId", "pairingAvailable", "phoneAccessEnabled"]);

    resetNodeIdentityServiceForTests();
    const secondStatusResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/status",
      remoteAddress: "100.64.1.2",
    });
    expect(secondStatusResponse.statusCode).toBe(200);
    expect((secondStatusResponse.json() as RemoteAccessStatusResponse).nodeId)
      .toBe(firstStatus.nodeId);

    const enableResponse = await inject({
      method: "PUT",
      url: "/rest/remote-access/settings",
      remoteAddress: "100.64.1.2",
      payload: { phoneAccessEnabled: true },
    });
    expect(enableResponse.statusCode).toBe(200);
    expect(enableResponse.json()).toMatchObject({ settings: { phoneAccessEnabled: true } });

    const pairingResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: {
        connectionWay: "tailscale",
        serverBaseUrl: "https://docker.tailnet.ts.net/mobile?pairing=old",
        serverName: "AutoByteus Docker Node",
      },
    });
    expect(pairingResponse.statusCode).toBe(201);
    const pairingSession = pairingResponse.json() as CreatePairingSessionResult;
    expect(pairingSession.payload).toMatchObject({
      serverBaseUrl: "https://docker.tailnet.ts.net",
      serverName: "AutoByteus Docker Node",
    });
    expect(decodePairingParam(pairingSession.mobileUrl)).toMatchObject({
      serverBaseUrl: "https://docker.tailnet.ts.net",
      pairingCode: pairingSession.payload.pairingCode,
    });

    const exchange = await exchangePairingSession(pairingSession, "Docker Android");
    expect(exchange.credential).toMatch(/^mra_/);
    expect(exchange.serverBaseUrl).toBe("https://docker.tailnet.ts.net");
    expect(exchange.device.clientFacingBaseUrl).toBe("https://docker.tailnet.ts.net");

    const devicesResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices",
      remoteAddress: "100.64.1.2",
    });
    expect(devicesResponse.statusCode).toBe(200);
    expect((devicesResponse.json() as DevicesResponse).devices).toMatchObject([
      {
        deviceId: exchange.device.deviceId,
        displayName: "Docker Android",
        clientFacingBaseUrl: "https://docker.tailnet.ts.net",
        revokedAt: null,
      },
    ]);

    const protectedNoCredentialResponse = await inject({
      method: "GET",
      url: "/rest/protected-probe",
      remoteAddress: "100.64.1.2",
    });
    expect(protectedNoCredentialResponse.statusCode).toBe(200);
    expect(protectedNoCredentialResponse.json() as ProtectedProbeResponse).toMatchObject({
      ok: true,
      authContext: {
        mode: "trusted_network",
        isAuthenticated: false,
      },
    });

    const graphqlNoCredentialResponse = await inject({
      method: "POST",
      url: "/graphql",
      remoteAddress: "100.64.1.2",
      payload: { query: "{ __typename }" },
    });
    expect(graphqlNoCredentialResponse.statusCode).not.toBe(401);
  });

  it("serves the node's network facts, remembers an allowed local network, discards a session by its ID and records each phone's way", async () => {
    // The network route reads the configured base URL, which needs a fully initialized config.
    const originalServerHost = process.env.AUTOBYTEUS_SERVER_HOST;
    process.env.AUTOBYTEUS_SERVER_HOST = "http://127.0.0.1:29695";
    await writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695\nAPP_ENV=test\n");
    try {
      appConfigProvider.config.initialize();
    } finally {
      if (originalServerHost === undefined) delete process.env.AUTOBYTEUS_SERVER_HOST;
      else process.env.AUTOBYTEUS_SERVER_HOST = originalServerHost;
    }

    const networkResponse = await inject({ method: "GET", url: "/rest/remote-access/network", remoteAddress: "100.64.1.2" });
    expect(networkResponse.statusCode).toBe(200);
    const { network } = networkResponse.json() as { network: Record<string, unknown> };
    expect(Object.keys(network).sort()).toEqual([
      "computerName", "configuredBaseUrl", "localNetwork", "runsInContainer", "tailscale", "vpnAddresses",
    ]);
    // A loopback configured address is never offered to a phone.
    expect(network.configuredBaseUrl).toBeNull();

    const badNetworkId = await inject({
      method: "PUT",
      url: "/rest/remote-access/network/local-networks/not-a-network",
      remoteAddress: "100.64.1.2",
      payload: { allowed: true },
    });
    expect(badNetworkId.statusCode).toBe(400);
    expect(badNetworkId.json()).toMatchObject({ code: "REMOTE_ACCESS_NETWORK_ID_INVALID" });

    const allowResponse = await inject({
      method: "PUT",
      url: "/rest/remote-access/network/local-networks/this-computer",
      remoteAddress: "100.64.1.2",
      payload: { allowed: true },
    });
    expect(allowResponse.statusCode).toBe(200);
    expect(JSON.parse(await readFile(path.join(appDataDir, "remote-access", "allowed-local-networks.json"), "utf8")))
      .toEqual({ networkIds: ["this-computer"] });

    await enablePhoneAccess();
    const missingWay = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: { serverBaseUrl: "https://desktop.tailnet.ts.net" },
    });
    expect(missingWay.statusCode).toBe(400);
    expect(missingWay.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_WAY_INVALID" });

    const discarded = await createPairingSession("http://192.168.1.25:29695", true, "local_network");
    expect(discarded.sessionId).toMatch(/^pss_[0-9a-f]{32}$/);
    const deleteResponse = await inject({
      method: "DELETE",
      url: `/rest/remote-access/pairing-sessions/${discarded.sessionId}`,
      remoteAddress: "100.64.1.2",
    });
    expect(deleteResponse.statusCode).toBe(204);
    const unknownDelete = await inject({
      method: "DELETE",
      url: "/rest/remote-access/pairing-sessions/pss_unknown",
      remoteAddress: "100.64.1.2",
    });
    expect(unknownDelete.statusCode).toBe(204);
    const discardedExchange = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-exchanges",
      remoteAddress: "192.168.1.30",
      payload: { pairingCode: discarded.payload.pairingCode, deviceName: "Phone" },
    });
    expect(discardedExchange.statusCode).toBe(400);
    expect(discardedExchange.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });

    const used = await createPairingSession("http://192.168.1.25:29695", true, "local_network");
    const exchange = await exchangePairingSession(used, "Wi-Fi Phone");
    expect(exchange.device.connectionWay).toBe("local_network");
    const secondUse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-exchanges",
      remoteAddress: "192.168.1.30",
      payload: { pairingCode: used.payload.pairingCode, deviceName: "Phone" },
    });
    expect(secondUse.statusCode).toBe(400);
    expect(secondUse.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_CONSUMED" });

    const devices = await inject({ method: "GET", url: "/rest/remote-access/devices", remoteAddress: "100.64.1.2" });
    expect((devices.json() as DevicesResponse).devices).toMatchObject([
      { deviceId: exchange.device.deviceId, connectionWay: "local_network" },
    ]);

    const mobileOnNetworkRoute = await inject({
      method: "GET",
      url: "/rest/remote-access/network",
      remoteAddress: "192.168.1.30",
      headers: { authorization: `Bearer ${exchange.credential}` },
    });
    expect(mobileOnNetworkRoute.statusCode).toBe(403);
    expect(mobileOnNetworkRoute.json()).toMatchObject({ code: "REMOTE_ACCESS_AUTH_INVALID" });
  });

  async function enablePhoneAccess(): Promise<void> {
    const response = await inject({
      method: "PUT",
      url: "/rest/remote-access/settings",
      remoteAddress: "100.64.1.2",
      payload: { phoneAccessEnabled: true },
    });
    expect(response.statusCode).toBe(200);
  }

  async function createPairingSession(
    serverBaseUrl: string,
    trustedPrivateHttpAcknowledged = false,
    connectionWay = "tailscale",
  ): Promise<CreatePairingSessionResult> {
    const response = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: {
        connectionWay,
        serverBaseUrl,
        serverName: "AutoByteus Desktop",
        ...(trustedPrivateHttpAcknowledged ? { trustedPrivateHttpAcknowledged: true } : {}),
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as CreatePairingSessionResult;
  }

  async function exchangePairingSession(
    session: CreatePairingSessionResult,
    deviceName: string,
  ): Promise<PairingExchangeResult> {
    const response = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-exchanges",
      remoteAddress: "100.64.1.2",
      payload: {
        pairingCode: session.payload.pairingCode,
        serverBaseUrl: session.mobileUrl.split("?", 1)[0],
        deviceName,
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as PairingExchangeResult;
  }

  async function revokeDevice(deviceId: string): Promise<void> {
    const response = await inject({
      method: "DELETE",
      url: `/rest/remote-access/devices/${encodeURIComponent(deviceId)}`,
      remoteAddress: "100.64.1.2",
    });
    expect(response.statusCode).toBe(200);
  }

  function inject(options: {
    method: string;
    url: string;
    remoteAddress: string;
    payload?: unknown;
    headers?: Record<string, string>;
  }) {
    return app.inject(options as Parameters<typeof app.inject>[0] & { remoteAddress: string });
  }
});

function decodePairingParam(mobileUrl: string): unknown {
  const encoded = new URL(mobileUrl).searchParams.get("pairing");
  if (!encoded) {
    throw new Error("Expected mobile pairing URL to include a pairing parameter.");
  }
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}

function resetRemoteAccessSingletons(): void {
  resetRemoteAccessRoutePolicyForTests();
  resetRemoteAccessAuthServiceForTests();
  resetRemoteAccessPairingServiceForTests();
  resetRemoteAccessSettingsServiceForTests();
  resetNodeIdentityServiceForTests();
  resetPairedDeviceServiceForTests();
  resetRemoteAccessSettingsStoreForTests();
  resetPairedDeviceStoreForTests();
}
