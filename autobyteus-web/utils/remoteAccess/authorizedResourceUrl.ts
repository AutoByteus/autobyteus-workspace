import { authorizedFetch, getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';

const PROTECTED_REST_PREFIXES = [
  '/rest/files/',
  '/rest/media',
  '/rest/workspaces/',
  '/rest/context-files/',
  '/rest/drafts/',
  '/rest/runs/',
  '/rest/team-runs/',
  '/rest/run-file-changes/',
  '/rest/team-communication/',
  '/rest/applications/',
  '/rest/application-bundles/',
];

const browserBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost';
};

const isBrowserManagedUrl = (url: string): boolean =>
  /^(blob:|data:|file:|local-file:)/i.test(url.trim());

export function protectedRestPathname(url: string): string | null {
  const raw = String(url ?? '').trim();
  if (!raw || isBrowserManagedUrl(raw)) {
    return null;
  }

  try {
    return new URL(raw, browserBaseUrl()).pathname;
  } catch {
    return raw.startsWith('/') ? raw.split('?', 1)[0] ?? raw : null;
  }
}

export function isProtectedRemoteAccessResourceUrl(url: string): boolean {
  const pathname = protectedRestPathname(url);
  return Boolean(pathname && PROTECTED_REST_PREFIXES.some((prefix) => pathname.startsWith(prefix)));
}

export function shouldLoadResourceThroughAuthorizedFetch(url: string): boolean {
  return isProtectedRemoteAccessResourceUrl(url) && Boolean(getActiveRemoteAccessCredential());
}

export async function fetchAuthorizedResourceBlob(url: string, init: RequestInit = {}): Promise<Blob> {
  const response = await authorizedFetch(url, { ...init, cache: init.cache ?? 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch protected resource (${response.status} ${response.statusText})`);
  }
  return response.blob();
}
