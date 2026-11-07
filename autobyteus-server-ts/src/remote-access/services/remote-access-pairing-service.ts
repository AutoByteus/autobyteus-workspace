import { randomBytes } from "node:crypto";
import { normalizeNodeBaseUrl } from "./url-normalization.js";
import { validatePairingServerBaseUrl } from "./pairing-url-policy.js";
import {
  RemoteAccessError,
  isConnectionWay,
  type ConnectionWay,
  type CreatePairingSessionResult,
  type PairingExchangeResult,
  type RemoteAccessPairingPayload,
  type RemoteAccessPairingSession,
  toDeviceSummary,
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
const generateSessionId = (): string => `pss_${randomBytes(16).toString("hex")}`;

const encodePairingParam = (payload: RemoteAccessPairingPayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

export const buildMobileUrlFromServerBaseUrl = (
  serverBaseUrl: string,
  payload: RemoteAccessPairingPayload,
): string => {
  const url = new URL(serverBaseUrl);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/mobile`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("pairing", encodePairingParam(payload));
  return url.toString();
};

export class RemoteAccessPairingService {
  /** Open and consumed sessions by code; a consumed session stays until it expires, so a second use is told apart. */
  private readonly sessionsByCode = new Map<string, RemoteAccessPairingSession>();

  constructor(
    private readonly settingsService: RemoteAccessSettingsService = getRemoteAccessSettingsService(),
    private readonly deviceService: PairedDeviceService = getPairedDeviceService(),
    private readonly ttlMs = DEFAULT_PAIRING_TTL_MS,
  ) {
    // Turning Phone Access off discards every code, so none works again if it is turned back on.
    this.settingsService.onSettingsChanged((settings) => {
      if (!settings.phoneAccessEnabled) {
        this.sessionsByCode.clear();
      }
    });
  }

  async createPairingSession(input: {
    serverBaseUrl: string;
    serverName?: string | null;
    connectionWay: unknown;
    trustedPrivateHttpAcknowledged?: boolean | null;
  }): Promise<CreatePairingSessionResult> {
    if (!isConnectionWay(input.connectionWay)) {
      throw new RemoteAccessError(
        "REMOTE_ACCESS_PAIRING_WAY_INVALID",
        "connectionWay must be one of company_address, tailscale, vpn, local_network.",
        400,
      );
    }
    const connectionWay: ConnectionWay = input.connectionWay;
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
    const pairingUrlPolicy = validatePairingServerBaseUrl(input.serverBaseUrl, {
      trustedPrivateHttpAcknowledged: input.trustedPrivateHttpAcknowledged,
    });
    const { normalizedBaseUrl: serverBaseUrl } = pairingUrlPolicy;
    const payload: RemoteAccessPairingPayload = {
      version: 1,
      serverBaseUrl,
      pairingCode: generatePairingCode(),
      expiresAt: toIso(createdAtMs + this.ttlMs),
      serverName: input.serverName?.trim() || "AutoByteus Desktop",
    };
    const sessionId = generateSessionId();
    this.sessionsByCode.set(payload.pairingCode, {
      sessionId,
      pairingCode: payload.pairingCode,
      connectionWay,
      serverBaseUrl: payload.serverBaseUrl,
      serverName: payload.serverName,
      expiresAt: payload.expiresAt,
      createdAt: toIso(createdAtMs),
    });

    const mobileUrl = buildMobileUrlFromServerBaseUrl(serverBaseUrl, payload);
    return {
      sessionId,
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

    const pairingCode = String(input.pairingCode ?? "").trim();
    const session = this.sessionsByCode.get(pairingCode);
    this.pruneExpiredSessions();
    if (!session) {
      throw new RemoteAccessError("REMOTE_ACCESS_PAIRING_INVALID", "Pairing code is invalid.", 400);
    }
    if (Date.parse(session.expiresAt) <= nowMs()) {
      throw new RemoteAccessError("REMOTE_ACCESS_PAIRING_EXPIRED", "Pairing code has expired.", 400);
    }
    if (session.consumedAt) {
      throw new RemoteAccessError("REMOTE_ACCESS_PAIRING_CONSUMED", "Pairing code was already used.", 400);
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
    const { record, credential } = await this.deviceService.createDevice({
      displayName: input.deviceName,
      clientFacingBaseUrl: session.serverBaseUrl,
      connectionWay: session.connectionWay,
    });

    return {
      credential,
      serverBaseUrl: session.serverBaseUrl,
      device: toDeviceSummary(record),
    };
  }

  /** Discards one session (open or consumed); unknown IDs are ignored. */
  discardSession(sessionId: string): void {
    for (const [code, session] of this.sessionsByCode) {
      if (session.sessionId === sessionId) {
        this.sessionsByCode.delete(code);
      }
    }
  }

  private pruneExpiredSessions(now = nowMs()): void {
    for (const [code, session] of this.sessionsByCode) {
      if (Date.parse(session.expiresAt) <= now) {
        this.sessionsByCode.delete(code);
      }
    }
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
