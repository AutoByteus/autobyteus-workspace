/**
 * Why the node refused the phone's credential check, when the refusal is about the phone and not about reaching the node:
 * - `session_rejected`: the credential no longer works (401, `REMOTE_ACCESS_AUTH_REQUIRED`/`_INVALID`, or the device was
 *   revoked, `REMOTE_ACCESS_DEVICE_REVOKED`); the paired session ends;
 * - `phone_access_off`: Phone Access is off on the node (`PHONE_ACCESS_DISABLED`); the phone stays paired.
 * `null` for every other answer (a reachability problem).
 * It reads the answer's HTTP status and the `code` of the node's refusal body (`{ error, code, message }`) only.
 */
export type RemoteAccessReadRefusal = 'session_rejected' | 'phone_access_off';

const SESSION_REJECTED_CODES: ReadonlySet<string> = new Set([
  'REMOTE_ACCESS_AUTH_REQUIRED',
  'REMOTE_ACCESS_AUTH_INVALID',
  'REMOTE_ACCESS_DEVICE_REVOKED',
]);

export const remoteAccessReadRefusal = (answer: { status: number; code: string | null }): RemoteAccessReadRefusal | null => {
  if (answer.code === 'PHONE_ACCESS_DISABLED') return 'phone_access_off';
  if (answer.status === 401 || (answer.code !== null && SESSION_REJECTED_CODES.has(answer.code))) return 'session_rejected';
  return null;
};
