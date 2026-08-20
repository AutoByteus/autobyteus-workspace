import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { getBrowserServerBaseUrl } from '~/utils/browserServerConfig';

const { runtimeConfigMock } = vi.hoisted(() => ({
  runtimeConfigMock: {
    public: {
      restBaseUrl: '/rest',
      defaultNodeBaseUrl: 'http://127.0.0.1:29695',
    },
  },
}));

mockNuxtImport('useRuntimeConfig', () => () => runtimeConfigMock);

describe('browserServerConfig', () => {
  beforeEach(() => {
    runtimeConfigMock.public.restBaseUrl = '/rest';
    runtimeConfigMock.public.defaultNodeBaseUrl = 'http://127.0.0.1:29695';
  });

  it('uses the configured node base URL when browser dev REST calls are proxied through a relative path', () => {
    expect(getBrowserServerBaseUrl()).toBe('http://127.0.0.1:29695');
  });

  it('normalizes an absolute REST URL to its node base URL', () => {
    runtimeConfigMock.public.restBaseUrl = 'https://desktop.example.test:29695/rest';

    expect(getBrowserServerBaseUrl()).toBe('https://desktop.example.test:29695');
  });

  it('normalizes a default node base URL even when it includes a REST surface path', () => {
    runtimeConfigMock.public.defaultNodeBaseUrl = 'http://localhost:29695/rest/';

    expect(getBrowserServerBaseUrl()).toBe('http://localhost:29695');
  });
});
