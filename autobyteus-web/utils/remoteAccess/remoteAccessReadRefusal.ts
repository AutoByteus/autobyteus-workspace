/**
 * Why the node refused a phone's read, when the refusal is about the phone and not about reaching the node:
 * - `session_rejected`: the credential no longer works (401, `REMOTE_ACCESS_AUTH_REQUIRED`/`_INVALID`, or the device was
 *   revoked, `REMOTE_ACCESS_DEVICE_REVOKED`); the paired session ends;
 * - `phone_access_off`: Phone Access is off on the node (`PHONE_ACCESS_DISABLED`); the phone stays paired.
 * `null` for every other failure (a reachability problem).
 */
export type RemoteAccessReadRefusal = 'session_rejected' | 'phone_access_off';

const SESSION_REJECTED_CODES = new Set(['REMOTE_ACCESS_AUTH_REQUIRED', 'REMOTE_ACCESS_AUTH_INVALID', 'REMOTE_ACCESS_DEVICE_REVOKED']);
const PHONE_ACCESS_OFF_CODE = 'PHONE_ACCESS_DISABLED';

type RefusalBody = { code?: unknown; error?: unknown };

/** The HTTP status and code of a failed read: an Apollo network error (`networkError.statusCode`/`result`) or an axios one. */
const readStatusAndCode = (cause: object): { status: number | null; code: string | null } => {
  const network = (cause as { networkError?: { statusCode?: unknown; result?: unknown } | null }).networkError;
  const response = (cause as { response?: { status?: unknown; data?: unknown } | null }).response;
  const status = network?.statusCode ?? response?.status;
  const body = (network?.result ?? response?.data) as RefusalBody | undefined | null;
  const code = body?.code ?? body?.error;
  return {
    status: typeof status === 'number' ? status : null,
    code: typeof code === 'string' ? code : null,
  };
};

const messageOf = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') return cause.message;
  return '';
};

export const remoteAccessReadRefusal = (cause: unknown): RemoteAccessReadRefusal | null => {
  if (!cause) return null;
  const { status, code } = typeof cause === 'object' ? readStatusAndCode(cause) : { status: null, code: null };
  if (code === PHONE_ACCESS_OFF_CODE) return 'phone_access_off';
  if (status === 401 || (code !== null && SESSION_REJECTED_CODES.has(code))) return 'session_rejected';
  // A read whose failure only kept its message text (today's 401 and auth-code rule).
  const message = messageOf(cause);
  if (message.includes(PHONE_ACCESS_OFF_CODE)) return 'phone_access_off';
  return /\b401\b|REMOTE_ACCESS_AUTH_REQUIRED|REMOTE_ACCESS_AUTH_INVALID|REMOTE_ACCESS_DEVICE_REVOKED/i.test(message)
    ? 'session_rejected'
    : null;
};
