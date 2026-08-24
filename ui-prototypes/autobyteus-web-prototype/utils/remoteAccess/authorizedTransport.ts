import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';

const bearerHeader = (credential: string): Record<string, string> => ({
  Authorization: `Bearer ${credential}`,
});

export function getActiveRemoteAccessCredential(): string | null {
  try {
    const store = useMobileNodeSessionStore();
    return store.activeCredential;
  } catch {
    return null;
  }
}

export function getRemoteAccessAuthHeaders(): Record<string, string> {
  return getRemoteAccessAuthHeadersForCredential(getActiveRemoteAccessCredential());
}

export function getRemoteAccessAuthHeadersForCredential(
  credential: string | null,
): Record<string, string> {
  return credential ? bearerHeader(credential) : {};
}

export function addRemoteAccessAxiosAuth<T extends AxiosRequestConfig | InternalAxiosRequestConfig>(config: T): T {
  const headers = getRemoteAccessAuthHeaders();
  if (!headers.Authorization) {
    return config;
  }
  config.headers = {
    ...(config.headers as Record<string, unknown> | undefined),
    ...headers,
  } as T['headers'];
  return config;
}

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetchWithRemoteAccessCredential(input, init, getActiveRemoteAccessCredential());
}

export async function fetchWithRemoteAccessCredential(
  input: RequestInfo | URL,
  init: RequestInit = {},
  credential: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (credential) {
    headers.set('Authorization', `Bearer ${credential}`);
  } else {
    headers.delete('Authorization');
  }
  return fetch(input, { ...init, headers });
}
