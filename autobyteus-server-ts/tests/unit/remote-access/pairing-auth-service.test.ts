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
    const session = await pairingService.createPairingSession({ serverBaseUrl: "http://100.64.1.2:29695" });
    const exchange = await pairingService.exchangePairingCode({
      pairingCode: session.payload.pairingCode,
      serverBaseUrl: session.payload.serverBaseUrl,
      deviceName: "Test Phone",
    });

    expect(exchange.credential).toMatch(/^mra_/);
    await expect(pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode }))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_PAIRING_INVALID" });

    await expect(authService.authorizeMobileCredential(exchange.credential))
      .resolves.toMatchObject({ ok: true, context: { mode: "mobile", deviceId: exchange.device.deviceId } });
  });

  it("rejects disabled, per-device revoked, and revoke-all credentials", async () => {
    const { settingsService, pairingService, deviceService, authService } = buildServices();
    await settingsService.setPhoneAccessEnabled(true);
    const firstSession = await pairingService.createPairingSession({ serverBaseUrl: "http://100.64.1.2:29695" });
    const first = await pairingService.exchangePairingCode({ pairingCode: firstSession.payload.pairingCode });

    await settingsService.setPhoneAccessEnabled(false);
    await expect(authService.authorizeMobileCredential(first.credential))
      .resolves.toMatchObject({ ok: false, code: "PHONE_ACCESS_DISABLED" });

    await settingsService.setPhoneAccessEnabled(true);
    await deviceService.revokeDevice(first.device.deviceId);
    await expect(authService.authorizeMobileCredential(first.credential))
      .resolves.toMatchObject({ ok: false, code: "REMOTE_ACCESS_DEVICE_REVOKED" });

    const secondSession = await pairingService.createPairingSession({ serverBaseUrl: "http://100.64.1.2:29695" });
    const second = await pairingService.exchangePairingCode({ pairingCode: secondSession.payload.pairingCode });
    expect((await deviceService.revokeAllDevices()).revokedCount).toBe(1);
    await expect(authService.authorizeMobileCredential(second.credential))
      .resolves.toMatchObject({ ok: false, code: "REMOTE_ACCESS_DEVICE_REVOKED" });
  });
});
