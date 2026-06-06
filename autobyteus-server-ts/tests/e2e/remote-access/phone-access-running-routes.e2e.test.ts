import "reflect-metadata";
import { mkdtemp, rm } from "node:fs/promises";
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
import { resetServerInstanceIdentityServiceForTests } from "../../../src/remote-access/services/server-instance-identity-service.js";
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
  compatibilityVersion: number;
  serverInstanceId: string;
  serverName: string;
};

describe("Phone Access running REST route behavior", () => {
  let app: FastifyInstance;
  let appDataDir: string;

  beforeEach(async () => {
    appDataDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-phone-access-routes-"));
    resetRemoteAccessSingletons();
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir });

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
      payload: { serverBaseUrl: "http://192.168.1.25:29695/mobile" },
    });
    expect(httpWithoutAcknowledgementResponse.statusCode).toBe(400);
    expect(httpWithoutAcknowledgementResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED" });

    const publicHttpResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: { serverBaseUrl: "http://example.com:29695/mobile", trustedPrivateHttpAcknowledged: true },
    });
    expect(publicHttpResponse.statusCode).toBe(400);
    expect(publicHttpResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED" });

    const localOnlyResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: { serverBaseUrl: "http://127.0.0.1:29695/mobile", trustedPrivateHttpAcknowledged: true },
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
    expect(firstStatus.serverInstanceId).toMatch(/^srv_[A-Za-z0-9_-]{32,}$/);

    resetServerInstanceIdentityServiceForTests();
    const secondStatusResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/status",
      remoteAddress: "100.64.1.2",
    });
    expect(secondStatusResponse.statusCode).toBe(200);
    expect((secondStatusResponse.json() as RemoteAccessStatusResponse).serverInstanceId)
      .toBe(firstStatus.serverInstanceId);

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
  ): Promise<CreatePairingSessionResult> {
    const response = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      payload: {
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
  resetServerInstanceIdentityServiceForTests();
  resetPairedDeviceServiceForTests();
  resetRemoteAccessSettingsStoreForTests();
  resetPairedDeviceStoreForTests();
}
