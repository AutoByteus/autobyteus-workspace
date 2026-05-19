const ACCESS_TOKEN_QUERY_KEY = 'access_token';

export function buildAuthenticatedWebSocketUrl(endpoint: string, credential: string): string {
  const trimmedCredential = credential.trim();
  if (!trimmedCredential) {
    return endpoint;
  }
  const parsed = new URL(endpoint, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
  parsed.searchParams.set(ACCESS_TOKEN_QUERY_KEY, trimmedCredential);
  return parsed.toString();
}

export function redactRemoteAccessWebSocketUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    if (parsed.searchParams.has(ACCESS_TOKEN_QUERY_KEY)) {
      parsed.searchParams.set(ACCESS_TOKEN_QUERY_KEY, '[REDACTED]');
    }
    return parsed.toString();
  } catch {
    return url.replace(/([?&]access_token=)[^&]+/i, '$1[REDACTED]');
  }
}
