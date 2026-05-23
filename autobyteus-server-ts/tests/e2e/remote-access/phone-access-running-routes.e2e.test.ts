import "reflect-metadata";
import { createHash } from "node:crypto";
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
import {
  NODE_ADMIN_CLAIM_ID_HEADER,
  NODE_ADMIN_CLAIM_SECRET_HEADER,
} from "../../../src/remote-access/domain/models.js";
import { resetRemoteAccessAuthServiceForTests } from "../../../src/remote-access/services/remote-access-auth-service.js";
import { resetRemoteNodeAdminServiceForTests } from "../../../src/remote-access/services/remote-node-admin-service.js";
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

const CLAIM_ID = "nac_e2e_docker_claim";
const CLAIM_SECRET = "nas_e2e_docker_claim_secret";
const CLAIM_HASH = createHash("sha256").update(CLAIM_SECRET, "utf8").digest("hex");
const CLAIM_HEADERS = {
  [NODE_ADMIN_CLAIM_ID_HEADER]: CLAIM_ID,
  [NODE_ADMIN_CLAIM_SECRET_HEADER]: CLAIM_SECRET,
};

describe("Phone Access running REST route behavior", () => {
  let app: FastifyInstance;
  let appDataDir: string;

  beforeEach(async () => {
    appDataDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-phone-access-routes-"));
    resetRemoteAccessSingletons();
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir });
    process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_ID = CLAIM_ID;
    process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH = CLAIM_HASH;
    process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_SCOPE = "phone-access-management";

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
    delete process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_ID;
    delete process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH;
    delete process.env.AUTOBYTEUS_NODE_ADMIN_CLAIM_SCOPE;
  });

  it("keeps active and revoked device routes separate while proving HTTPS QR pairing and mobile credential behavior", async () => {
    await enablePhoneAccess();

    const httpResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "127.0.0.1",
      payload: { serverBaseUrl: "http://192.168.1.25:29695/mobile" },
    });
    expect(httpResponse.statusCode).toBe(400);
    expect(httpResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_HTTPS_REQUIRED" });

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
      remoteAddress: "127.0.0.1",
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
      remoteAddress: "127.0.0.1",
    });
    expect(revokedResponse.statusCode).toBe(200);
    const revokedDevices = (revokedResponse.json() as DevicesResponse).devices;
    expect(revokedDevices).toHaveLength(19);
    expect(revokedDevices.every((device) => typeof device.revokedAt === "string")).toBe(true);

    const nonLoopbackRevokedResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
      headers: { authorization: `Bearer ${activeExchange.credential}` },
    });
    expect(nonLoopbackRevokedResponse.statusCode).toBe(401);
    expect(nonLoopbackRevokedResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_ADMIN_CLAIM_REQUIRED" });

    const claimBackedRevokedResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
      headers: CLAIM_HEADERS,
    });
    expect(claimBackedRevokedResponse.statusCode).toBe(200);
    expect((claimBackedRevokedResponse.json() as DevicesResponse).devices).toHaveLength(19);

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
      remoteAddress: "127.0.0.1",
    });
    expect(activeAfterRevokeResponse.statusCode).toBe(200);
    expect((activeAfterRevokeResponse.json() as DevicesResponse).devices).toEqual([]);

    const revokedAfterRevokeResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "127.0.0.1",
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

  it("authorizes Docker-node Phone Access owner routes by node-admin claim without granting general API authority", async () => {
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

    const missingClaimResponse = await inject({
      method: "PUT",
      url: "/rest/remote-access/settings",
      remoteAddress: "100.64.1.2",
      payload: { phoneAccessEnabled: true },
    });
    expect(missingClaimResponse.statusCode).toBe(401);
    expect(missingClaimResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_ADMIN_CLAIM_REQUIRED" });

    const wrongClaimResponse = await inject({
      method: "PUT",
      url: "/rest/remote-access/settings",
      remoteAddress: "100.64.1.2",
      headers: {
        [NODE_ADMIN_CLAIM_ID_HEADER]: CLAIM_ID,
        [NODE_ADMIN_CLAIM_SECRET_HEADER]: "wrong-secret",
      },
      payload: { phoneAccessEnabled: true },
    });
    expect(wrongClaimResponse.statusCode).toBe(403);
    expect(wrongClaimResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_ADMIN_CLAIM_INVALID" });

    const enableResponse = await inject({
      method: "PUT",
      url: "/rest/remote-access/settings",
      remoteAddress: "100.64.1.2",
      headers: CLAIM_HEADERS,
      payload: { phoneAccessEnabled: true },
    });
    expect(enableResponse.statusCode).toBe(200);
    expect(enableResponse.json()).toMatchObject({ settings: { phoneAccessEnabled: true } });

    const pairingResponse = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "100.64.1.2",
      headers: CLAIM_HEADERS,
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
    expect(exchange.serverBaseUrl).toBe("https://docker.tailnet.ts.net");
    expect(exchange.device.clientFacingBaseUrl).toBe("https://docker.tailnet.ts.net");

    const devicesResponse = await inject({
      method: "GET",
      url: "/rest/remote-access/devices",
      remoteAddress: "100.64.1.2",
      headers: CLAIM_HEADERS,
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

    const claimOnProtectedRouteResponse = await inject({
      method: "GET",
      url: "/rest/protected-probe",
      remoteAddress: "100.64.1.2",
      headers: CLAIM_HEADERS,
    });
    expect(claimOnProtectedRouteResponse.statusCode).toBe(401);
    expect(claimOnProtectedRouteResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_AUTH_REQUIRED" });

    const claimOnGraphqlResponse = await inject({
      method: "POST",
      url: "/graphql",
      remoteAddress: "100.64.1.2",
      headers: CLAIM_HEADERS,
      payload: { query: "{ __typename }" },
    });
    expect(claimOnGraphqlResponse.statusCode).toBe(401);
    expect(claimOnGraphqlResponse.json()).toMatchObject({ code: "REMOTE_ACCESS_AUTH_REQUIRED" });
  });

  async function enablePhoneAccess(): Promise<void> {
    const response = await inject({
      method: "PUT",
      url: "/rest/remote-access/settings",
      remoteAddress: "127.0.0.1",
      payload: { phoneAccessEnabled: true },
    });
    expect(response.statusCode).toBe(200);
  }

  async function createPairingSession(serverBaseUrl: string): Promise<CreatePairingSessionResult> {
    const response = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      remoteAddress: "127.0.0.1",
      payload: { serverBaseUrl, serverName: "AutoByteus Desktop" },
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
      remoteAddress: "127.0.0.1",
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
  resetRemoteNodeAdminServiceForTests();
  resetRemoteAccessPairingServiceForTests();
  resetRemoteAccessSettingsServiceForTests();
  resetServerInstanceIdentityServiceForTests();
  resetPairedDeviceServiceForTests();
  resetRemoteAccessSettingsStoreForTests();
  resetPairedDeviceStoreForTests();
}
