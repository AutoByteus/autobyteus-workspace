import type { FastifyRequest } from "fastify";

export type RemoteAccessRouteClassification =
  | "PUBLIC_STATIC"
  | "PUBLIC_HEALTH"
  | "PUBLIC_HEALTH_STATUS"
  | "PUBLIC_PREFLIGHT"
  | "PUBLIC_PAIRING_EXCHANGE"
  | "TRUSTED_NETWORK_OWNER"
  | "TRUSTED_NETWORK_PROTECTED"
  | "TRUSTED_NETWORK_WEBSOCKET"
  /** `/rest/remote/*`: requests from peer nodes (remote collaboration); admitted by its peer gateway. */
  | "REMOTE_PEER"
  | "LOCAL_DEV_ONLY";

export type RemoteAccessAuthMode = "trusted_network" | "loopback" | "mobile";

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

/** How a phone reaches a node. */
export const CONNECTION_WAYS = ["company_address", "tailscale", "vpn", "local_network"] as const;
export type ConnectionWay = (typeof CONNECTION_WAYS)[number];

export const isConnectionWay = (value: unknown): value is ConnectionWay =>
  typeof value === "string" && (CONNECTION_WAYS as readonly string[]).includes(value);

/** The network ID used when this computer's local network cannot be recognised. */
export const THIS_COMPUTER_NETWORK_ID = "this-computer";

/** One node's report of the network of the computer it runs on. */
export type NodeNetwork = {
  computerName: string;
  runsInContainer: boolean;
  /** `AUTOBYTEUS_SERVER_HOST` unless it is a local-only address. */
  configuredBaseUrl: string | null;
  tailscale: { address: string; dnsName: string | null } | null;
  vpnAddresses: string[];
  /** In a container: network ID `this-computer` and no addresses. `null` only when a computer has no local network. */
  localNetwork: { networkId: string; addresses: string[]; allowed: boolean } | null;
};

export type RemoteAccessPairingPayload = {
  version: 1;
  serverBaseUrl: string;
  pairingCode: string;
  expiresAt: string;
  serverName: string;
};

export type RemoteAccessPairingSession = {
  sessionId: string;
  pairingCode: string;
  connectionWay: ConnectionWay;
  serverBaseUrl: string;
  serverName: string;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
};

export type CreatePairingSessionResult = {
  /** Opaque ID to discard the session; never the code. */
  sessionId: string;
  payload: RemoteAccessPairingPayload;
  qrText: string;
  mobileUrl: string;
};

export type PairedDeviceRecord = {
  deviceId: string;
  displayName: string;
  credentialHash: string;
  clientFacingBaseUrl: string;
  connectionWay: ConnectionWay | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export type PairedDeviceSummary = {
  deviceId: string;
  displayName: string;
  clientFacingBaseUrl: string;
  connectionWay: ConnectionWay | null;
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
  | "REMOTE_ACCESS_PAIRING_CONSUMED"
  | "REMOTE_ACCESS_PAIRING_URL_INVALID"
  | "REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY"
  | "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED"
  | "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED"
  | "REMOTE_ACCESS_PAIRING_WAY_INVALID"
  | "REMOTE_ACCESS_NETWORK_ID_INVALID"
  /** The request's browser Origin is not an allowed origin of the node. */
  | "REMOTE_ACCESS_ORIGIN_REFUSED"
  /** A paired phone's credential on a WebSocket route that is not a phone WebSocket route. */
  | "PHONE_ACCESS_ROUTE_REFUSED";

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

export const WEBSOCKET_ACCESS_TOKEN_QUERY_KEY = "access_token";
export const REMOTE_ACCESS_MOBILE_CREDENTIAL_PREFIX = "mra_";

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
  connectionWay: record.connectionWay,
  createdAt: record.createdAt,
  lastSeenAt: record.lastSeenAt,
  revokedAt: record.revokedAt,
});
