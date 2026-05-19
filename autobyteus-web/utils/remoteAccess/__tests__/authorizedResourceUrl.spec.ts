import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  fetchAuthorizedResourceBlob,
  isProtectedRemoteAccessResourceUrl,
  shouldLoadResourceThroughAuthorizedFetch,
} from '~/utils/remoteAccess/authorizedResourceUrl';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import type { MobileNodeSession } from '~/types/remoteAccess';

const storedSession = (): MobileNodeSession => ({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://desktop-private.local:29695',
  credential: 'mra_secret',
  pairedAt: '2026-05-16T00:00:00.000Z',
  device: {
    deviceId: 'device-1',
    displayName: 'Phone',
    clientFacingBaseUrl: 'http://desktop-private.local:29695',
    createdAt: '2026-05-16T00:00:00.000Z',
    lastSeenAt: null,
    revokedAt: null,
  },
});

describe('authorized resource URLs', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('classifies protected REST resource URL families', () => {
    expect(isProtectedRemoteAccessResourceUrl('/rest/files/media.png')).toBe(true);
    expect(isProtectedRemoteAccessResourceUrl('http://node/rest/workspaces/ws/content?path=a.png')).toBe(true);
    expect(isProtectedRemoteAccessResourceUrl('/rest/context-files/file-1')).toBe(true);
    expect(isProtectedRemoteAccessResourceUrl('/rest/health')).toBe(false);
    expect(isProtectedRemoteAccessResourceUrl('blob:http://node/blob-id')).toBe(false);
  });

  it('loads protected resources through authorized fetch when a mobile credential is active', async () => {
    mobileCredentialStorage.save(storedSession());
    useMobileNodeSessionStore().initializeFromStorage();
    expect(shouldLoadResourceThroughAuthorizedFetch('/rest/files/media.png')).toBe(true);

    const blob = new Blob(['ok'], { type: 'text/plain' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      blob: () => Promise.resolve(blob),
    } as Response);

    await expect(fetchAuthorizedResourceBlob('/rest/files/media.png')).resolves.toBe(blob);

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer mra_secret');
  });
});
