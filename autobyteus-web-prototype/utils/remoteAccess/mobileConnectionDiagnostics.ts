import type { MobileConnectionDiagnostic, MobileConnectionFailureKind } from '~/types/remoteAccess';

const diagnostics: Record<MobileConnectionFailureKind, MobileConnectionDiagnostic> = {
  network_unreachable: {
    kind: 'network_unreachable',
    title: 'Cannot reach AutoByteus desktop',
    message: 'Your phone cannot reach the desktop node over the current private network.',
    recoveryAction: 'Check that AutoByteus is running and your LAN, VPN, or tailnet is connected.',
  },
  auth_required: {
    kind: 'auth_required',
    title: 'Pair this phone again',
    message: 'The desktop rejected this request because a valid phone credential was missing or invalid.',
    recoveryAction: 'Generate a new Phone Access QR code from desktop settings and pair again.',
  },
  device_revoked: {
    kind: 'device_revoked',
    title: 'This phone was revoked',
    message: 'The desktop has revoked this phone credential.',
    recoveryAction: 'Ask the desktop user to generate a new Phone Access QR code.',
  },
  phone_access_disabled: {
    kind: 'phone_access_disabled',
    title: 'Phone Access is disabled',
    message: 'The desktop is reachable, but Phone Access is currently turned off.',
    recoveryAction: 'Enable Phone Access from desktop settings.',
  },
  websocket_blocked: {
    kind: 'websocket_blocked',
    title: 'Live connection blocked',
    message: 'The HTTP API is reachable, but a WebSocket stream could not be opened.',
    recoveryAction: 'Check firewall, VPN, proxy, or browser restrictions for WebSocket traffic.',
  },
  unsupported_mobile_feature: {
    kind: 'unsupported_mobile_feature',
    title: 'Feature is desktop-only',
    message: 'This area uses Electron or desktop-only capabilities that are not available on phone.',
    recoveryAction: 'Use this feature from the desktop app.',
  },
  server_version_incompatible: {
    kind: 'server_version_incompatible',
    title: 'Desktop version is incompatible',
    message: 'The mobile client and desktop server do not support the same Remote Access protocol.',
    recoveryAction: 'Update AutoByteus on desktop and reload this page.',
  },
};

export function diagnosticForKind(kind: MobileConnectionFailureKind): MobileConnectionDiagnostic {
  return diagnostics[kind];
}

export function diagnosticFromHttpStatus(status: number, code?: string): MobileConnectionDiagnostic {
  if (code === 'PHONE_ACCESS_DISABLED') {
    return diagnosticForKind('phone_access_disabled');
  }
  if (code === 'REMOTE_ACCESS_DEVICE_REVOKED') {
    return diagnosticForKind('device_revoked');
  }
  if (status === 401 || code === 'REMOTE_ACCESS_AUTH_REQUIRED' || code === 'REMOTE_ACCESS_AUTH_INVALID') {
    return diagnosticForKind('auth_required');
  }
  if (status === 426 || code === 'REMOTE_ACCESS_VERSION_UNSUPPORTED') {
    return diagnosticForKind('server_version_incompatible');
  }
  return diagnosticForKind('network_unreachable');
}

export function diagnosticFromWebSocketClose(code: number, reason?: string): MobileConnectionDiagnostic {
  if (reason === 'PHONE_ACCESS_DISABLED') {
    return diagnosticForKind('phone_access_disabled');
  }
  if (reason === 'REMOTE_ACCESS_DEVICE_REVOKED') {
    return diagnosticForKind('device_revoked');
  }
  if (code === 4401) {
    return diagnosticForKind('auth_required');
  }
  if (code === 4403) {
    return diagnosticForKind('device_revoked');
  }
  return diagnosticForKind('websocket_blocked');
}

export function diagnosticFromUnknownError(error: unknown): MobileConnectionDiagnostic {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { code?: string; error?: string } } }).response;
    if (typeof response?.status === 'number') {
      return diagnosticFromHttpStatus(response.status, response.data?.code || response.data?.error);
    }
  }
  return diagnosticForKind('network_unreachable');
}
