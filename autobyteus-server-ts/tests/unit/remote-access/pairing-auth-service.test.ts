import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PairedDeviceService } from "../../../src/remote-access/services/paired-device-service.js";
import { PhoneCredentialVerifier } from "../../../src/remote-access/services/phone-credential-verifier.js";
import { RemoteAccessPairingService } from "../../../src/remote-access/services/remote-access-pairing-service.js";
import { RemoteAccessSettingsService } from "../../../src/remote-access/services/remote-access-settings-service.js";
import { PairedDeviceStore } from "../../../src/remote-access/stores/paired-device-store.js";
import { RemoteAccessSettingsStore } from "../../../src/remote-access/stores/remote-access-settings-store.js";

let tempDir = "";

const buildServices = () => {
  const config = { getAppDataDir: () => tempDir };
  const settingsService = new RemoteAccessSettingsService(new RemoteAccessSettingsStore(config));
  const deviceService = new PairedDeviceService(new PairedDeviceStore(config));
  const pairingService = new RemoteAccessPairingService(settingsService, deviceService, 60_000);
  const phoneVerifier = new PhoneCredentialVerifier(deviceService, settingsService);
  return { settingsService, deviceService, pairingService, phoneVerifier };
};

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-remote-access-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("remote access pairing and auth services", () => {
  it("blocks pairing creation while Phone Access is disabled", async () => {
    const { pairingService } = buildServices();
    await expect(pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "http://100.64.1.2:29695" }))
      .rejects.toMatchObject({ code: "PHONE_ACCESS_DISABLED" });
  });

  it("exchanges a single-use code for a credential and rejects reuse", async () => {
    const { settingsService, pairingService, phoneVerifier } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const session = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net/mobile" });
    expect(session.payload.serverBaseUrl).toBe("https://desktop.tailnet.ts.net");
    expect(session.mobileUrl).toMatch(/^https:\/\/desktop\.tailnet\.ts\.net\/mobile\?pairing=/);
    const exchange = await pairingService.exchangePairingCode({
      pairingCode: session.payload.pairingCode,
      serverBaseUrl: "https://desktop.tailnet.ts.net/mobile",
      deviceName: "Test Phone",
    });

    expect(exchange.credential).toMatch(/^mra_/);
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_CONSUMED" });

    await expect(phoneVerifier.verify(exchange.credential))
      .resolves.toEqual({ ok: true, identity: { kind: "phone", deviceId: exchange.device.deviceId } });
  });

  it("requires acknowledgement before creating trusted private HTTP pairing sessions", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);

    await expect(pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "http://100.64.1.2:29695" }))
      .rejects.toMatchObject({
        code: "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED",
        statusCode: 400,
      });

    const session = await pairingService.createPairingSession({ connectionWay: "tailscale",
      serverBaseUrl: "http://100.64.1.2:29695/mobile?pairing=old",
      trustedPrivateHttpAcknowledged: true,
    });

    expect(session.payload.serverBaseUrl).toBe("http://100.64.1.2:29695");
    expect(session.mobileUrl).toMatch(/^http:\/\/100\.64\.1\.2:29695\/mobile\?pairing=/);
  });

  it("rejects public HTTP and phone-unreachable local-only pairing URLs", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);

    await expect(pairingService.createPairingSession({ connectionWay: "tailscale",
      serverBaseUrl: "http://example.com:29695",
      trustedPrivateHttpAcknowledged: true,
    })).rejects.toMatchObject({
      code: "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED",
      statusCode: 400,
    });

    await expect(pairingService.createPairingSession({ connectionWay: "tailscale",
      serverBaseUrl: "https://127.0.0.1:29695/mobile",
    })).rejects.toMatchObject({
      code: "REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY",
      statusCode: 400,
    });
  });

  it("preserves deployment base paths when building mobile pairing URLs", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);

    const session = await pairingService.createPairingSession({ connectionWay: "tailscale",
      serverBaseUrl: "https://gateway.example.com/autobyteus/mobile?pairing=old",
    });

    expect(session.payload.serverBaseUrl).toBe("https://gateway.example.com/autobyteus");
    expect(session.mobileUrl).toMatch(/^https:\/\/gateway\.example\.com\/autobyteus\/mobile\?pairing=/);
    const exchange = await pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode });
    expect(exchange.serverBaseUrl).toBe("https://gateway.example.com/autobyteus");
  });

  it("NAS-10 refuses disabled, per-device revoked, and revoke-all credentials, and publishes each revocation", async () => {
    const { settingsService, pairingService, deviceService, phoneVerifier } = buildServices();
    const revocations: unknown[] = [];
    phoneVerifier.onClientRevoked((revocation) => revocations.push({ kind: revocation.kind, id: revocation.id, code: revocation.refusal.code }));
    await settingsService.setPhoneAccessEnabled(true);
    const firstSession = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const first = await pairingService.exchangePairingCode({ pairingCode: firstSession.payload.pairingCode });

    await settingsService.setPhoneAccessEnabled(false);
    await expect(phoneVerifier.verify(first.credential))
      .resolves.toMatchObject({ ok: false, refusal: { statusCode: 403, code: "PHONE_ACCESS_DISABLED" } });

    await settingsService.setPhoneAccessEnabled(true);
    await deviceService.revokeDevice(first.device.deviceId);
    await expect(phoneVerifier.verify(first.credential))
      .resolves.toMatchObject({ ok: false, refusal: { statusCode: 403, code: "REMOTE_ACCESS_DEVICE_REVOKED" } });
    await expect(phoneVerifier.verify("mra_made_up")).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401, code: "NODE_CREDENTIAL_INVALID" } });

    const secondSession = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const second = await pairingService.exchangePairingCode({ pairingCode: secondSession.payload.pairingCode });
    expect((await deviceService.revokeAllDevices()).revokedCount).toBe(1);
    await expect(phoneVerifier.verify(second.credential))
      .resolves.toMatchObject({ ok: false, refusal: { code: "REMOTE_ACCESS_DEVICE_REVOKED" } });
    expect(revocations).toEqual([
      { kind: "phone", id: null, code: "PHONE_ACCESS_DISABLED" },
      { kind: "phone", id: first.device.deviceId, code: "REMOTE_ACCESS_DEVICE_REVOKED" },
      { kind: "phone", id: second.device.deviceId, code: "REMOTE_ACCESS_DEVICE_REVOKED" },
    ]);
  });

  it("lists active and revoked device summaries through explicit service boundaries", async () => {
    const { settingsService, pairingService, deviceService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const firstSession = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const first = await pairingService.exchangePairingCode({
      pairingCode: firstSession.payload.pairingCode,
      deviceName: "Revoked Phone",
    });
    const secondSession = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const second = await pairingService.exchangePairingCode({
      pairingCode: secondSession.payload.pairingCode,
      deviceName: "Active Phone",
    });

    await deviceService.revokeDevice(first.device.deviceId, "2026-05-22T12:00:00.000Z");

    await expect(deviceService.listActiveDeviceSummaries()).resolves.toMatchObject([
      { deviceId: second.device.deviceId, displayName: "Active Phone", revokedAt: null },
    ]);
    await expect(deviceService.listRevokedDeviceSummaries()).resolves.toMatchObject([
      { deviceId: first.device.deviceId, displayName: "Revoked Phone", revokedAt: "2026-05-22T12:00:00.000Z" },
    ]);
  });

  it("refuses a pairing session without a known way to connect", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    for (const connectionWay of [undefined, "", "wifi", "LOCAL_NETWORK"]) {
      await expect(pairingService.createPairingSession({ connectionWay, serverBaseUrl: "https://desktop.tailnet.ts.net" }))
        .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_WAY_INVALID", statusCode: 400 });
    }
  });

  it("returns an opaque session ID and records the session's way on the paired device", async () => {
    const { settingsService, pairingService, deviceService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const session = await pairingService.createPairingSession({
      connectionWay: "local_network",
      serverBaseUrl: "http://192.168.1.20:29695",
      serverName: "Test Computer",
      trustedPrivateHttpAcknowledged: true,
    });
    expect(session.sessionId).toMatch(/^pss_[0-9a-f]{32}$/);
    expect(session.sessionId).not.toContain(session.payload.pairingCode);
    expect(session.payload).toEqual({
      version: 1,
      serverBaseUrl: "http://192.168.1.20:29695",
      pairingCode: session.payload.pairingCode,
      expiresAt: session.payload.expiresAt,
      serverName: "Test Computer",
    });

    const exchange = await pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode, deviceName: "Pixel" });
    expect(exchange.device.connectionWay).toBe("local_network");
    await expect(deviceService.listActiveDeviceSummaries()).resolves.toMatchObject([
      { deviceId: exchange.device.deviceId, connectionWay: "local_network" },
    ]);
  });

  it("answers a second use of a code with CONSUMED until the code expires", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const session = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    await pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode });
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_CONSUMED" });
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_CONSUMED" });
  });

  it("discards an open or consumed session by its session ID, and ignores unknown IDs", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const open = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const used = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    await pairingService.exchangePairingCode({ pairingCode: used.payload.pairingCode });

    pairingService.discardSession("pss_unknown");
    pairingService.discardSession(open.sessionId);
    pairingService.discardSession(used.sessionId);

    await expect(pairingService.exchangePairingCode({ pairingCode: open.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });
    await expect(pairingService.exchangePairingCode({ pairingCode: used.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });
  });

  it("discards every code when Phone Access is turned off, so none works after turning it on again", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const open = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const used = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    await pairingService.exchangePairingCode({ pairingCode: used.payload.pairingCode });

    await settingsService.setPhoneAccessEnabled(false);
    await settingsService.setPhoneAccessEnabled(true);

    await expect(pairingService.exchangePairingCode({ pairingCode: open.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });
    await expect(pairingService.exchangePairingCode({ pairingCode: used.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });
  });

  it("answers an expired code with EXPIRED once, then forgets it", async () => {
    const config = { getAppDataDir: () => tempDir };
    const settingsService = new RemoteAccessSettingsService(new RemoteAccessSettingsStore(config));
    const deviceService = new PairedDeviceService(new PairedDeviceStore(config));
    const pairingService = new RemoteAccessPairingService(settingsService, deviceService, 0);
    await settingsService.setPhoneAccessEnabled(true);
    const session = await pairingService.createPairingSession({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net" });
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_EXPIRED" });
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });
  });

  it("reads device rows written before devices carried a way to connect", async () => {
    const config = { getAppDataDir: () => tempDir };
    await mkdir(path.join(tempDir, "remote-access"), { recursive: true });
    await writeFile(path.join(tempDir, "remote-access", "paired-devices.json"), JSON.stringify([
      {
        deviceId: "device_old",
        displayName: "Old Phone",
        credentialHash: "ab".repeat(32),
        clientFacingBaseUrl: "http://192.168.1.20:29695",
        createdAt: "2026-05-01T00:00:00.000Z",
        lastSeenAt: null,
        revokedAt: null,
      },
    ]));
    const deviceService = new PairedDeviceService(new PairedDeviceStore(config));
    await expect(deviceService.listActiveDeviceSummaries()).resolves.toEqual([
      {
        deviceId: "device_old",
        displayName: "Old Phone",
        clientFacingBaseUrl: "http://192.168.1.20:29695",
        connectionWay: null,
        createdAt: "2026-05-01T00:00:00.000Z",
        lastSeenAt: null,
        revokedAt: null,
      },
    ]);
  });
});
