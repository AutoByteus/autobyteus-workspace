import { describe, expect, it } from 'vitest';
import { ApolloError } from '@apollo/client/core';
import { remoteAccessReadRefusal } from '~/utils/remoteAccess/remoteAccessReadRefusal';

// The node refuses a phone's GraphQL read with HTTP 403 {error, code, message}; Apollo keeps the code only in
// `networkError.result` (IMP-02).
const apolloRefusal = (statusCode: number, code?: string) => new ApolloError({
  networkError: Object.assign(new Error(`Response not successful: Received status code ${statusCode}`), {
    name: 'ServerError', statusCode, response: {}, result: code ? { error: code, code, message: 'refused' } : {},
  }),
});
const axiosRefusal = (status: number, code?: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data: code ? { code } : {} } });

describe('remoteAccessReadRefusal (autobyteus-426 REQ-002)', () => {
  it('rejects the session for a revoked device, as for a 401 or the auth codes', () => {
    expect(remoteAccessReadRefusal(apolloRefusal(403, 'REMOTE_ACCESS_DEVICE_REVOKED'))).toBe('session_rejected');
    expect(remoteAccessReadRefusal(apolloRefusal(401))).toBe('session_rejected');
    expect(remoteAccessReadRefusal(apolloRefusal(401, 'REMOTE_ACCESS_AUTH_INVALID'))).toBe('session_rejected');
    expect(remoteAccessReadRefusal(axiosRefusal(403, 'REMOTE_ACCESS_DEVICE_REVOKED'))).toBe('session_rejected');
    expect(remoteAccessReadRefusal(axiosRefusal(401))).toBe('session_rejected');
    expect(remoteAccessReadRefusal(axiosRefusal(400, 'REMOTE_ACCESS_AUTH_REQUIRED'))).toBe('session_rejected');
  });

  it('names Phone Access off without rejecting the session', () => {
    expect(remoteAccessReadRefusal(apolloRefusal(403, 'PHONE_ACCESS_DISABLED'))).toBe('phone_access_off');
    expect(remoteAccessReadRefusal(axiosRefusal(403, 'PHONE_ACCESS_DISABLED'))).toBe('phone_access_off');
  });

  it('keeps the message-text rule for a failure that kept only its message', () => {
    expect(remoteAccessReadRefusal('Response not successful: Received status code 401')).toBe('session_rejected');
    expect(remoteAccessReadRefusal(new Error('REMOTE_ACCESS_AUTH_REQUIRED'))).toBe('session_rejected');
    // A bare 403 message cannot say which refusal it was: a reachability failure, as before.
    expect(remoteAccessReadRefusal('Response not successful: Received status code 403')).toBeNull();
    // The new codes are read from the status and body only, never from message text.
    expect(remoteAccessReadRefusal(new Error('REMOTE_ACCESS_DEVICE_REVOKED'))).toBeNull();
    expect(remoteAccessReadRefusal('PHONE_ACCESS_DISABLED')).toBeNull();
  });

  it('treats every other failure as reachability', () => {
    expect(remoteAccessReadRefusal(apolloRefusal(403, 'REMOTE_ACCESS_ORIGIN_REFUSED'))).toBeNull();
    expect(remoteAccessReadRefusal(apolloRefusal(502))).toBeNull();
    expect(remoteAccessReadRefusal(new ApolloError({ networkError: new TypeError('Failed to fetch') }))).toBeNull();
    expect(remoteAccessReadRefusal('offline')).toBeNull();
    expect(remoteAccessReadRefusal(null)).toBeNull();
  });
});
