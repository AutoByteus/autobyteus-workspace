/**
 * Whether a failed read was refused for this phone's credential (a 401, or the remote-access auth codes): the paired
 * session is then rejected (E-27). Any other failure is a reachability problem.
 */
export const isRemoteAccessAuthFailure = (cause: unknown): boolean => {
  if (!cause) return false;
  const response = typeof cause === 'object' && 'response' in cause
    ? (cause as { response?: { status?: number; data?: { code?: string; error?: string } } }).response
    : null;
  if (response?.status === 401) return true;
  const code = response?.data?.code || response?.data?.error;
  if (code === 'REMOTE_ACCESS_AUTH_REQUIRED' || code === 'REMOTE_ACCESS_AUTH_INVALID') return true;
  const message = cause instanceof Error
    ? cause.message
    : typeof cause === 'string'
      ? cause
      : typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string' ? cause.message : '';
  return /\b401\b|REMOTE_ACCESS_AUTH_REQUIRED|REMOTE_ACCESS_AUTH_INVALID/i.test(message);
};
