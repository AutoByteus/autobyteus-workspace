import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { getRemoteAccessAuthHeaders } from '~/utils/remoteAccess/authorizedTransport';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import type { MobileNodeSession } from '~/types/remoteAccess';

const mobileSession = (): MobileNodeSession => ({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://desktop-private.local:29695',
  credential: 'mra_mobile_secret',
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

describe('authorized transport credential selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
  });

  it('uses the paired mobile credential when a mobile session is active', () => {
    mobileCredentialStorage.save(mobileSession());
    useMobileNodeSessionStore().initializeFromStorage();

    expect(getRemoteAccessAuthHeaders()).toEqual({ Authorization: 'Bearer mra_mobile_secret' });
  });

  it('does not attach extra trusted-node credentials for remote-node windows', () => {
    expect(getRemoteAccessAuthHeaders()).toEqual({});
  });
});
