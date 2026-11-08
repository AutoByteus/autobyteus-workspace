export type RemoteAccessSettings = {
  phoneAccessEnabled: boolean;
  updatedAt: string;
  updatedBy?: 'loopback-desktop';
};

/** How a phone reaches a node. */
export type ConnectionWay = 'company_address' | 'tailscale' | 'vpn' | 'local_network';

/** One node's report of the network of the computer it runs on (`GET /rest/remote-access/network`). */
export type NodeNetwork = {
  computerName: string;
  runsInContainer: boolean;
  configuredBaseUrl: string | null;
  tailscale: { address: string; dnsName: string | null } | null;
  vpnAddresses: string[];
  localNetwork: { networkId: string; addresses: string[]; allowed: boolean } | null;
};

export type RemoteAccessPairingPayload = {
  version: 1;
  serverBaseUrl: string;
  pairingCode: string;
  expiresAt: string;
  serverName: string;
};

export type RemoteAccessPairingSessionResponse = {
  sessionId: string;
  payload: RemoteAccessPairingPayload;
  qrText: string;
  mobileUrl: string;
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

export type PairingExchangeResponse = {
  device: PairedDeviceSummary;
  credential: string;
  serverBaseUrl: string;
};

export type RemoteAccessStatus = {
  phoneAccessEnabled: boolean;
  pairingAvailable: boolean;
  nodeId?: string;
};

/**
 * The phone's paired session, stored by `mobileCredentialStorage`. `entryId` is the window's entry for the paired node.
 * `nodeName` is the node's name from the QR (absent for sessions paired before it was kept: the page then shows the
 * Android app's name for the node, or "AutoByteus node"; never the address).
 */
export type MobileNodeSession = {
  entryId: string;
  serverBaseUrl: string;
  nodeName?: string;
  credential: string;
  device: PairedDeviceSummary;
  pairedAt: string;
};

export type MobileConnectionFailureKind =
  | 'network_refused'
  | 'network_unreachable'
  | 'auth_required'
  | 'device_revoked'
  | 'phone_access_disabled'
  | 'websocket_blocked'
  | 'unsupported_mobile_feature';

export type MobileConnectionDiagnostic = {
  kind: MobileConnectionFailureKind;
  title: string;
  message: string;
  recoveryAction: string;
};
