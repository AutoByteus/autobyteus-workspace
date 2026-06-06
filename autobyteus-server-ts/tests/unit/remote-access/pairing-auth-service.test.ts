import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PairedDeviceService } from "../../../src/remote-access/services/paired-device-service.js";
import { RemoteAccessAuthService } from "../../../src/remote-access/services/remote-access-auth-service.js";
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
  const authService = new RemoteAccessAuthService(settingsService, deviceService);
  return { settingsService, deviceService, pairingService, authService };
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
    await expect(pairingService.createPairingSession({ serverBaseUrl: "http://100.64.1.2:29695" }))
      .rejects.toMatchObject({ code: "PHONE_ACCESS_DISABLED" });
  });

  it("exchanges a single-use code for a credential and rejects reuse", async () => {
    const { settingsService, pairingService, authService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const session = await pairingService.createPairingSession({ serverBaseUrl: "https://desktop.tailnet.ts.net/mobile" });
    expect(session.payload.serverBaseUrl).toBe("https://desktop.tailnet.ts.net");
    expect(session.mobileUrl).toMatch(/^https:\/\/desktop\.tailnet\.ts\.net\/mobile\?pairing=/);
    const exchange = await pairingService.exchangePairingCode({
      pairingCode: session.payload.pairingCode,
      serverBaseUrl: "https://desktop.tailnet.ts.net/mobile",
      deviceName: "Test Phone",
    });

    expect(exchange.credential).toMatch(/^mra_/);
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });

    await expect(authService.authorizeMobileCredential(exchange.credential))
      .resolves.toMatchObject({ ok: true, context: { mode: "mobile", deviceId: exchange.device.deviceId } });
  });

  it("requires acknowledgement before creating trusted private HTTP pairing sessions", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);

    await expect(pairingService.createPairingSession({ serverBaseUrl: "http://100.64.1.2:29695" }))
      .rejects.toMatchObject({
        code: "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED",
        statusCode: 400,
      });

    const session = await pairingService.createPairingSession({
      serverBaseUrl: "http://100.64.1.2:29695/mobile?pairing=old",
      trustedPrivateHttpAcknowledged: true,
    });

    expect(session.payload.serverBaseUrl).toBe("http://100.64.1.2:29695");
    expect(session.mobileUrl).toMatch(/^http:\/\/100\.64\.1\.2:29695\/mobile\?pairing=/);
  });

  it("rejects public HTTP and phone-unreachable local-only pairing URLs", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);

    await expect(pairingService.createPairingSession({
      serverBaseUrl: "http://example.com:29695",
      trustedPrivateHttpAcknowledged: true,
    })).rejects.toMatchObject({
      code: "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED",
      statusCode: 400,
    });

    await expect(pairingService.createPairingSession({
      serverBaseUrl: "https://127.0.0.1:29695/mobile",
    })).rejects.toMatchObject({
      code: "REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY",
      statusCode: 400,
    });
  });

  it("preserves deployment base paths when building mobile pairing URLs", async () => {
    const { settingsService, pairingService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);

    const session = await pairingService.createPairingSession({
      serverBaseUrl: "https://gateway.example.com/autobyteus/mobile?pairing=old",
    });

    expect(session.payload.serverBaseUrl).toBe("https://gateway.example.com/autobyteus");
    expect(session.mobileUrl).toMatch(/^https:\/\/gateway\.example\.com\/autobyteus\/mobile\?pairing=/);
    expect(pairingService.getSessionForTests(session.payload.pairingCode)).toMatchObject({
      serverBaseUrl: "https://gateway.example.com/autobyteus",
    });
  });

  it("rejects disabled, per-device revoked, and revoke-all credentials", async () => {
    const { settingsService, pairingService, deviceService, authService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const firstSession = await pairingService.createPairingSession({ serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const first = await pairingService.exchangePairingCode({ pairingCode: firstSession.payload.pairingCode });

    await settingsService.setPhoneAccessEnabled(false);
    await expect(authService.authorizeMobileCredential(first.credential))
      .resolves.toMatchObject({ ok: false, code: "PHONE_ACCESS_DISABLED" });

    await settingsService.setPhoneAccessEnabled(true);
    await deviceService.revokeDevice(first.device.deviceId);
    await expect(authService.authorizeMobileCredential(first.credential))
      .resolves.toMatchObject({ ok: false, code: "REMOTE_ACCESS_DEVICE_REVOKED" });

    const secondSession = await pairingService.createPairingSession({ serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const second = await pairingService.exchangePairingCode({ pairingCode: secondSession.payload.pairingCode });
    expect((await deviceService.revokeAllDevices()).revokedCount).toBe(1);
    await expect(authService.authorizeMobileCredential(second.credential))
      .resolves.toMatchObject({ ok: false, code: "REMOTE_ACCESS_DEVICE_REVOKED" });
  });

  it("lists active and revoked device summaries through explicit service boundaries", async () => {
    const { settingsService, pairingService, deviceService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const firstSession = await pairingService.createPairingSession({ serverBaseUrl: "https://desktop.tailnet.ts.net" });
    const first = await pairingService.exchangePairingCode({
      pairingCode: firstSession.payload.pairingCode,
      deviceName: "Revoked Phone",
    });
    const secondSession = await pairingService.createPairingSession({ serverBaseUrl: "https://desktop.tailnet.ts.net" });
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
});
