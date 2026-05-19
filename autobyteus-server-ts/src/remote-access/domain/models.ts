import type { FastifyRequest } from "fastify";

export type RemoteAccessRouteClassification =
  | "PUBLIC_STATIC"
  | "PUBLIC_HEALTH"
  | "PUBLIC_HEALTH_STATUS"
  | "PUBLIC_PREFLIGHT"
  | "PUBLIC_PAIRING_EXCHANGE"
  | "LOCAL_ONLY"
  | "LOCAL_DEV_ONLY"
  | "LOCAL_OR_MOBILE"
  | "LOCAL_OR_MOBILE_WS"
  | "EXTERNAL_SIGNATURE"
  | "DEFAULT_PROTECTED";

export type RemoteAccessAuthMode = "loopback" | "mobile";

export type RemoteAccessAuthContext = {
  mode: RemoteAccessAuthMode;
  isAuthenticated: boolean;
  deviceId?: string;
  clientFacingBaseUrl?: string;
};

export type RemoteAccessSettings = {
  phoneAccessEnabled: boolean;
  updatedAt: string;
  updatedBy?: "loopback-desktop";
};

export type RemoteAccessUrlCandidateKind = "loopback" | "lan" | "tailnet_like" | "manual";

export type RemoteAccessUrlCandidate = {
  id: string;
  kind: RemoteAccessUrlCandidateKind;
  label: string;
  serverBaseUrl: string;
  source: string;
};

export type RemoteAccessPairingPayload = {
  version: 1;
  serverBaseUrl: string;
  pairingCode: string;
  expiresAt: string;
  serverName: string;
};

export type RemoteAccessPairingSession = {
  pairingCode: string;
  serverBaseUrl: string;
  serverName: string;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
};

export type CreatePairingSessionResult = {
  payload: RemoteAccessPairingPayload;
  qrText: string;
  mobileUrl: string;
};

export type PairedDeviceRecord = {
  deviceId: string;
  displayName: string;
  credentialHash: string;
  clientFacingBaseUrl: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export type PairedDeviceSummary = {
  deviceId: string;
  displayName: string;
  clientFacingBaseUrl: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export type PairingExchangeResult = {
  device: PairedDeviceSummary;
  credential: string;
  serverBaseUrl: string;
};

export type RemoteAccessAuthFailureCode =
  | "REMOTE_ACCESS_AUTH_REQUIRED"
  | "REMOTE_ACCESS_AUTH_INVALID"
  | "REMOTE_ACCESS_DEVICE_REVOKED"
  | "PHONE_ACCESS_DISABLED"
  | "REMOTE_ACCESS_ROUTE_UNSUPPORTED"
  | "REMOTE_ACCESS_LOCAL_ONLY"
  | "REMOTE_ACCESS_PAIRING_EXPIRED"
  | "REMOTE_ACCESS_PAIRING_INVALID"
  | "REMOTE_ACCESS_PAIRING_CONSUMED";

export type RemoteAccessRejection = {
  ok: false;
  statusCode: number;
  code: RemoteAccessAuthFailureCode;
  message: string;
};

export type RemoteAccessAuthorizationResult =
  | { ok: true; context: RemoteAccessAuthContext }
  | RemoteAccessRejection;

export type ClientFacingUrlContext = {
  request?: FastifyRequest;
  authContext?: RemoteAccessAuthContext | null;
  pairedDeviceClientBaseUrl?: string | null;
  configuredExternalBaseUrl?: string | null;
  localFallbackBaseUrl: string;
};

export type ResolveRestResourceUrlInput = {
  context: ClientFacingUrlContext;
  restPath: string;
  prefer?: "relative" | "absolute";
};

export type WebSocketAuthPolicy = "WEBSOCKET_AUTH_QUERY_TOKEN";

export const WEBSOCKET_AUTH_POLICY: WebSocketAuthPolicy = "WEBSOCKET_AUTH_QUERY_TOKEN";
export const WEBSOCKET_ACCESS_TOKEN_QUERY_KEY = "access_token";

export const REMOTE_ACCESS_AUTH_CONTEXT_PROPERTY = "remoteAccessAuthContext";

export class RemoteAccessError extends Error {
  constructor(
    public readonly code: RemoteAccessAuthFailureCode,
    message: string,
    public readonly statusCode = 401,
  ) {
    super(message);
    this.name = "RemoteAccessError";
  }
}

export const toDeviceSummary = (record: PairedDeviceRecord): PairedDeviceSummary => ({
  deviceId: record.deviceId,
  displayName: record.displayName,
  clientFacingBaseUrl: record.clientFacingBaseUrl,
  createdAt: record.createdAt,
  lastSeenAt: record.lastSeenAt,
  revokedAt: record.revokedAt,
});
