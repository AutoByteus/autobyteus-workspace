import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createPinia, setActivePinia } from 'pinia';
import { bootstrapMobileRemoteAccessSession, resolveCurrentGraphqlHttpEndpoint } from '~/utils/remoteAccess/mobileSessionBootstrap';
import {
  isMobileRemoteAccessBuild,
  isMobileRemoteAccessRuntime,
  isPathWithinMobileRuntime,
  mobileRemoteAccessHomePath,
  stripMobileRuntimePrefix,
} from '~/utils/remoteAccess/mobileRuntime';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import { getRemoteAccessAuthHeaders } from '~/utils/remoteAccess/authorizedTransport';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { MobileNodeSession } from '~/types/remoteAccess';

const { runtimeConfigMock } = vi.hoisted(() => ({
  runtimeConfigMock: {
    public: {
      mobileRemoteAccessBuild: false,
    },
  },
}));

mockNuxtImport('useRuntimeConfig', () => () => runtimeConfigMock);

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

describe('mobile session bootstrap', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    runtimeConfigMock.public.mobileRemoteAccessBuild = false;
  });

  it('detects mobile runtime paths and strips the static mobile prefix', () => {
    expect(isPathWithinMobileRuntime('/mobile')).toBe(true);
    expect(isPathWithinMobileRuntime('/mobile/workspace')).toBe(true);
    expect(isPathWithinMobileRuntime('/workspace')).toBe(false);
    expect(stripMobileRuntimePrefix('/mobile/workspace')).toBe('/workspace');
  });

  it('restores persisted mobile session before global GraphQL/auth transports are used', () => {
    mobileCredentialStorage.save(storedSession());

    expect(bootstrapMobileRemoteAccessSession('/mobile/workspace')).toBe(true);

    const windowNodeContextStore = useWindowNodeContextStore();
    expect(windowNodeContextStore.nodeBaseUrl).toBe('http://desktop-private.local:29695');
    expect(resolveCurrentGraphqlHttpEndpoint()).toBe('http://desktop-private.local:29695/graphql');
    expect(getRemoteAccessAuthHeaders()).toEqual({ Authorization: 'Bearer mra_secret' });
  });

  it('does not bind stored phone credentials outside mobile runtime paths', () => {
    mobileCredentialStorage.save(storedSession());

    expect(bootstrapMobileRemoteAccessSession('/workspace')).toBe(false);
    expect(useWindowNodeContextStore().nodeBaseUrl).not.toBe('http://desktop-private.local:29695');
  });

  it('treats the mobile static build root as the phone runtime entry', () => {
    runtimeConfigMock.public.mobileRemoteAccessBuild = true;
    mobileCredentialStorage.save(storedSession());

    expect(isMobileRemoteAccessBuild()).toBe(true);
    expect(mobileRemoteAccessHomePath()).toBe('/');
    expect(isMobileRemoteAccessRuntime('/')).toBe(true);
    expect(bootstrapMobileRemoteAccessSession('/')).toBe(true);
    expect(resolveCurrentGraphqlHttpEndpoint()).toBe('http://desktop-private.local:29695/graphql');
  });
});
