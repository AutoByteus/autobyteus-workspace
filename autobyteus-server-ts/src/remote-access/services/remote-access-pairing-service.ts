import { randomBytes } from "node:crypto";
import { normalizeNodeBaseUrl } from "./url-normalization.js";
import {
  RemoteAccessError,
  type CreatePairingSessionResult,
  type PairingExchangeResult,
  type RemoteAccessPairingPayload,
  type RemoteAccessPairingSession,
} from "../domain/models.js";
import {
  getPairedDeviceService,
  type PairedDeviceService,
} from "./paired-device-service.js";
import {
  getRemoteAccessSettingsService,
  type RemoteAccessSettingsService,
} from "./remote-access-settings-service.js";

const DEFAULT_PAIRING_TTL_MS = 5 * 60 * 1000;

const nowMs = (): number => Date.now();
const toIso = (valueMs: number): string => new Date(valueMs).toISOString();
const generatePairingCode = (): string => randomBytes(18).toString("base64url");

const encodePairingParam = (payload: RemoteAccessPairingPayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const buildMobileUrl = (serverBaseUrl: string, payload: RemoteAccessPairingPayload): string => {
  const url = new URL("/mobile", serverBaseUrl);
  url.searchParams.set("pairing", encodePairingParam(payload));
  return url.toString();
};

export class RemoteAccessPairingService {
  private readonly sessionsByCode = new Map<string, RemoteAccessPairingSession>();

  constructor(
    private readonly settingsService: RemoteAccessSettingsService = getRemoteAccessSettingsService(),
    private readonly deviceService: PairedDeviceService = getPairedDeviceService(),
    private readonly ttlMs = DEFAULT_PAIRING_TTL_MS,
  ) {}

  async createPairingSession(input: {
    serverBaseUrl: string;
    serverName?: string | null;
  }): Promise<CreatePairingSessionResult> {
    const settings = await this.settingsService.getSettings();
    if (!settings.phoneAccessEnabled) {
      throw new RemoteAccessError(
        "PHONE_ACCESS_DISABLED",
        "Phone Access is disabled on this desktop.",
        403,
      );
    }

    this.pruneExpiredSessions();
    const createdAtMs = nowMs();
    const serverBaseUrl = normalizeNodeBaseUrl(input.serverBaseUrl);
    const payload: RemoteAccessPairingPayload = {
      version: 1,
      serverBaseUrl,
      pairingCode: generatePairingCode(),
      expiresAt: toIso(createdAtMs + this.ttlMs),
      serverName: input.serverName?.trim() || "AutoByteus Desktop",
    };
    this.sessionsByCode.set(payload.pairingCode, {
      pairingCode: payload.pairingCode,
      serverBaseUrl: payload.serverBaseUrl,
      serverName: payload.serverName,
      expiresAt: payload.expiresAt,
      createdAt: toIso(createdAtMs),
    });

    const mobileUrl = buildMobileUrl(serverBaseUrl, payload);
    return {
      payload,
      qrText: mobileUrl,
      mobileUrl,
    };
  }

  async exchangePairingCode(input: {
    pairingCode: string;
    deviceName?: string | null;
    serverBaseUrl?: string | null;
  }): Promise<PairingExchangeResult> {
    const settings = await this.settingsService.getSettings();
    if (!settings.phoneAccessEnabled) {
      throw new RemoteAccessError(
        "PHONE_ACCESS_DISABLED",
        "Phone Access is disabled on this desktop.",
        403,
      );
    }

    this.pruneExpiredSessions();
    const pairingCode = String(input.pairingCode ?? "").trim();
    const session = this.sessionsByCode.get(pairingCode);
    if (!session) {
      throw new RemoteAccessError("REMOTE_ACCESS_PAIRING_INVALID", "Pairing code is invalid.", 400);
    }
    if (session.consumedAt) {
      throw new RemoteAccessError("REMOTE_ACCESS_PAIRING_CONSUMED", "Pairing code was already used.", 400);
    }
    if (Date.parse(session.expiresAt) <= nowMs()) {
      this.sessionsByCode.delete(pairingCode);
      throw new RemoteAccessError("REMOTE_ACCESS_PAIRING_EXPIRED", "Pairing code has expired.", 400);
    }

    const normalizedInputBase = input.serverBaseUrl
      ? normalizeNodeBaseUrl(input.serverBaseUrl)
      : session.serverBaseUrl;
    if (normalizedInputBase !== session.serverBaseUrl) {
      throw new RemoteAccessError(
        "REMOTE_ACCESS_PAIRING_INVALID",
        "Pairing payload server URL does not match this pairing session.",
        400,
      );
    }

    session.consumedAt = new Date().toISOString();
    this.sessionsByCode.delete(pairingCode);
    const { record, credential } = await this.deviceService.createDevice({
      displayName: input.deviceName,
      clientFacingBaseUrl: session.serverBaseUrl,
    });

    return {
      credential,
      serverBaseUrl: session.serverBaseUrl,
      device: {
        deviceId: record.deviceId,
        displayName: record.displayName,
        clientFacingBaseUrl: record.clientFacingBaseUrl,
        createdAt: record.createdAt,
        lastSeenAt: record.lastSeenAt,
        revokedAt: record.revokedAt,
      },
    };
  }

  pruneExpiredSessions(now = nowMs()): void {
    for (const [code, session] of this.sessionsByCode) {
      if (session.consumedAt || Date.parse(session.expiresAt) <= now) {
        this.sessionsByCode.delete(code);
      }
    }
  }

  getSessionForTests(pairingCode: string): RemoteAccessPairingSession | null {
    return this.sessionsByCode.get(pairingCode) ?? null;
  }
}

let singleton: RemoteAccessPairingService | null = null;

export const getRemoteAccessPairingService = (): RemoteAccessPairingService => {
  singleton ??= new RemoteAccessPairingService();
  return singleton;
};

export const resetRemoteAccessPairingServiceForTests = (): void => {
  singleton = null;
};
