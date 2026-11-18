import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PairedDeviceService } from "../../../src/remote-access/services/paired-device-service.js";
import { RemoteAccessPairingService } from "../../../src/remote-access/services/remote-access-pairing-service.js";
import { RemoteAccessSettingsService } from "../../../src/remote-access/services/remote-access-settings-service.js";
import { PairedDeviceStore } from "../../../src/remote-access/stores/paired-device-store.js";
import { RemoteAccessSettingsStore } from "../../../src/remote-access/stores/remote-access-settings-store.js";

// autobyteus-416 REQ-002(e): the hosts of open pairing sessions and of non-revoked paired phones are node names.
let tempDir = "";

const buildServices = async (ttlMs = 60_000) => {
  const config = { getAppDataDir: () => tempDir };
  const settingsService = new RemoteAccessSettingsService(new RemoteAccessSettingsStore(config));
  const deviceService = new PairedDeviceService(new PairedDeviceStore(config));
  const pairingService = new RemoteAccessPairingService(settingsService, deviceService, ttlMs);
  await settingsService.setPhoneAccessEnabled(true);
  return { deviceService, pairingService };
};

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-paired-phone-host-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("RemoteAccessPairingService.isPairedPhoneHost", () => {
  it("knows the host of an open pairing session, and forgets it when the session is discarded", async () => {
    const { pairingService } = await buildServices();
    const session = await pairingService.createPairingSession({
      connectionWay: "company_address",
      serverBaseUrl: "https://node.corp.example",
    });
    await expect(pairingService.isPairedPhoneHost("node.corp.example")).resolves.toBe(true);
    await expect(pairingService.isPairedPhoneHost("other.corp.example")).resolves.toBe(false);
    pairingService.discardSession(session.sessionId);
    await expect(pairingService.isPairedPhoneHost("node.corp.example")).resolves.toBe(false);
  });

  it("does not count an expired session", async () => {
    const { pairingService } = await buildServices(0);
    await pairingService.createPairingSession({ connectionWay: "company_address", serverBaseUrl: "https://node.corp.example" });
    await expect(pairingService.isPairedPhoneHost("node.corp.example")).resolves.toBe(false);
  });

  it("knows the host of a paired phone after the exchange, and forgets it on revocation", async () => {
    const { pairingService, deviceService } = await buildServices();
    const session = await pairingService.createPairingSession({
      connectionWay: "company_address",
      serverBaseUrl: "https://phone-entry.corp.example",
    });
    const exchange = await pairingService.exchangePairingCode({ pairingCode: session.payload.pairingCode });
    await expect(pairingService.isPairedPhoneHost("phone-entry.corp.example")).resolves.toBe(true);
    await deviceService.revokeDevice(exchange.device.deviceId);
    await expect(pairingService.isPairedPhoneHost("phone-entry.corp.example")).resolves.toBe(false);
  });

  it("normalizes stored hosts as Host headers are normalized: case, trailing dot, IPv6 brackets (ARCH-REV R-3)", async () => {
    const { pairingService, deviceService } = await buildServices();
    await deviceService.createDevice({ clientFacingBaseUrl: "https://Node.Corp.Example.:8443", connectionWay: "company_address" });
    await deviceService.createDevice({ clientFacingBaseUrl: "http://[FD7A:115C:A1E0::1]:29695", connectionWay: "tailscale" });
    await expect(pairingService.isPairedPhoneHost("node.corp.example")).resolves.toBe(true);
    await expect(pairingService.isPairedPhoneHost("fd7a:115c:a1e0::1")).resolves.toBe(true);
  });
});
