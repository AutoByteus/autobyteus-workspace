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
  const credential = getActiveRemoteAccessCredential();
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
  const headers = new Headers(init.headers);
  const credential = getActiveRemoteAccessCredential();
  if (credential) {
    headers.set('Authorization', `Bearer ${credential}`);
  }
  return fetch(input, { ...init, headers });
}
