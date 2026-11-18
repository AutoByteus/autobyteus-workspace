import { describe, expect, it } from 'vitest';
import { diagnosticFromHttpStatus } from '~/utils/remoteAccess/mobileConnectionDiagnostics';

describe('mobile connection diagnostics', () => {
  it('maps disabled and revoked HTTP failures to actionable states', () => {
    expect(diagnosticFromHttpStatus(403, 'PHONE_ACCESS_DISABLED').kind).toBe('phone_access_disabled');
    expect(diagnosticFromHttpStatus(403, 'REMOTE_ACCESS_DEVICE_REVOKED').kind).toBe('device_revoked');
  });
});
