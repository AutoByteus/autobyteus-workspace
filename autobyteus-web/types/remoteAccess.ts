export type RemoteAccessSettings = {
  phoneAccessEnabled: boolean;
  updatedAt: string;
  updatedBy?: 'loopback-desktop';
};

export type RemoteAccessUrlCandidateKind = 'loopback' | 'lan' | 'tailnet_like' | 'manual';

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

export type RemoteAccessPairingSessionResponse = {
  payload: RemoteAccessPairingPayload;
  qrText: string;
  mobileUrl: string;
};

export type PairedDeviceSummary = {
  deviceId: string;
  displayName: string;
  clientFacingBaseUrl: string;
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
  serverName: string;
};

/** The phone's paired session, stored by `mobileCredentialStorage`. `entryId` is the window's entry for the paired node. */
export type MobileNodeSession = {
  entryId: string;
  serverBaseUrl: string;
  credential: string;
  device: PairedDeviceSummary;
  pairedAt: string;
};

export type MobileConnectionFailureKind =
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
