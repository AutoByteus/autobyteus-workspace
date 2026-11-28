import { readResponseBlobWithProgress, type DownloadProgress } from '~/utils/download/responseBlobProgress';
import {
  fetchWithRemoteAccessCredential,
  getActiveRemoteAccessCredential,
} from '~/utils/remoteAccess/authorizedTransport';

const PROTECTED_REST_PREFIXES = [
  '/rest/files/',
  '/rest/media',
  '/rest/workspaces/',
  '/rest/node-files/',
  '/rest/context-files/',
  '/rest/drafts/',
  '/rest/runs/',
  '/rest/team-runs/',
  '/rest/run-file-changes/',
  // Message reference files of every root kind (autobyteus-615).
  '/rest/collaboration-messages/',
  '/rest/applications/',
  '/rest/application-bundles/',
  // A definition's package picture (autobyteus-669): read with the credential, never in the address.
  '/rest/definition-avatars/',
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
  return shouldLoadResourceThroughAuthorizedFetchWithCredential(
    url,
    getActiveRemoteAccessCredential(),
  );
}

export function shouldLoadResourceThroughAuthorizedFetchWithCredential(
  url: string,
  credential: string | null,
): boolean {
  return isProtectedRemoteAccessResourceUrl(url) && Boolean(credential);
}

/** A protected resource's bytes; `onProgress` reports each part as it arrives (autobyteus-572 D-1). */
export async function fetchAuthorizedResourceBlob(
  url: string,
  init: RequestInit = {},
  credentialSnapshot: string | null = getActiveRemoteAccessCredential(),
  onProgress?: (progress: DownloadProgress) => void,
): Promise<Blob> {
  const response = await fetchWithRemoteAccessCredential(
    url,
    { ...init, cache: init.cache ?? 'no-store' },
    credentialSnapshot,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch protected resource (${response.status} ${response.statusText})`);
  }
  return onProgress ? readResponseBlobWithProgress(response, onProgress) : response.blob();
}
