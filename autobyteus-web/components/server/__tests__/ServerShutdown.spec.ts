import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServerShutdown from '../ServerShutdown.vue';

const { serverStoreMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  serverStoreMock: {
    status: 'shutting-down',
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}));

vi.mock('~/stores/serverStore', () => ({
  useServerStore: () => serverStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

describe('ServerShutdown', () => {
  it('renders shutdown overlay only for embedded windows', () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    const embeddedWrapper = mount(ServerShutdown);
    expect(embeddedWrapper.find('.shutdown-container').exists()).toBe(true);
    embeddedWrapper.unmount();

    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const remoteWrapper = mount(ServerShutdown);
    expect(remoteWrapper.find('.shutdown-container').exists()).toBe(false);
    remoteWrapper.unmount();
  });
});
