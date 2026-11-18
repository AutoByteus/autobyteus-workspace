import type { MobileConnectionDiagnostic, MobileConnectionFailureKind } from '~/types/remoteAccess';

const diagnostics: Record<MobileConnectionFailureKind, MobileConnectionDiagnostic> = {
  network_unreachable: {
    kind: 'network_unreachable',
    title: 'Cannot reach AutoByteus desktop',
    message: 'Your phone cannot reach the desktop node over the current private network.',
    recoveryAction: 'Check that AutoByteus is running and your LAN, VPN, or tailnet is connected.',
  },
  network_refused: {
    kind: 'network_refused',
    title: 'This network is not allowed',
    message: 'The desktop node does not accept connections from the network your phone is on now.',
    recoveryAction: 'Connect through Tailscale, or allow this Wi-Fi network in Phone Setup on the desktop.',
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
  if (code === 'NODE_NETWORK_REFUSED') {
    return diagnosticForKind('network_refused');
  }
  if (status === 401 || code === 'NODE_CREDENTIAL_REQUIRED' || code === 'NODE_CREDENTIAL_INVALID') {
    return diagnosticForKind('auth_required');
  }
  return diagnosticForKind('network_unreachable');
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
