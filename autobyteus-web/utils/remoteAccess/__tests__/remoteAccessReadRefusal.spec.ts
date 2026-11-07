import { describe, expect, it } from 'vitest';
import { remoteAccessReadRefusal } from '~/utils/remoteAccess/remoteAccessReadRefusal';

// autobyteus-426 REQ-002 (SR-008): the credential check's answer is classified by its status and the refusal code only.
describe('remoteAccessReadRefusal', () => {
  it('rejects the session for a revoked device, a 401 or the auth codes', () => {
    expect(remoteAccessReadRefusal({ status: 403, code: 'REMOTE_ACCESS_DEVICE_REVOKED' })).toBe('session_rejected');
    expect(remoteAccessReadRefusal({ status: 401, code: null })).toBe('session_rejected');
    expect(remoteAccessReadRefusal({ status: 401, code: 'REMOTE_ACCESS_AUTH_INVALID' })).toBe('session_rejected');
    expect(remoteAccessReadRefusal({ status: 400, code: 'REMOTE_ACCESS_AUTH_REQUIRED' })).toBe('session_rejected');
  });

  it('names Phone Access off without rejecting the session', () => {
    expect(remoteAccessReadRefusal({ status: 403, code: 'PHONE_ACCESS_DISABLED' })).toBe('phone_access_off');
  });

  it('treats every other answer as reachability', () => {
    expect(remoteAccessReadRefusal({ status: 403, code: 'REMOTE_ACCESS_ORIGIN_REFUSED' })).toBeNull();
    expect(remoteAccessReadRefusal({ status: 403, code: null })).toBeNull();
    expect(remoteAccessReadRefusal({ status: 502, code: null })).toBeNull();
  });
});
