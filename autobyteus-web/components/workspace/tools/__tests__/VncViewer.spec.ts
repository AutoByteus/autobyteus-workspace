import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import VncViewer from '../VncViewer.vue';

const fetchNodeDesktop = vi.hoisted(() => vi.fn());
const endpoints = vi.hoisted(() => ({ rest: 'http://node-a.example:8001/rest' }));

vi.mock('~/utils/nodeDesktopClient', () => ({ fetchNodeDesktop }));
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => endpoints }),
}));

const mountViewer = async () => {
  const wrapper = mount(VncViewer, {
    global: { stubs: { NodeDesktopTile: { template: '<div data-testid="node-desktop-tile-stub" />' } } },
  });
  await flushPromises();
  return wrapper;
};

describe('VncViewer', () => {
  afterEach(() => {
    fetchNodeDesktop.mockReset();
    vi.restoreAllMocks();
  });

  it('shows the node desktop tile when the bound node has a node desktop', async () => {
    fetchNodeDesktop.mockResolvedValue({ available: true });
    const wrapper = await mountViewer();
    expect(fetchNodeDesktop).toHaveBeenCalledWith(endpoints);
    expect(wrapper.find('[data-testid="node-desktop-tile-stub"]').exists()).toBe(true);
  });

  it('says the node has no shared desktop (embedded node) and opens no tile', async () => {
    fetchNodeDesktop.mockResolvedValue({ available: false });
    const wrapper = await mountViewer();
    expect(wrapper.get('[data-testid="node-desktop-unavailable"]').text()).toBe('No shared desktop');
    expect(wrapper.find('[data-testid="node-desktop-tile-stub"]').exists()).toBe(false);
  });

  it('shows that the node cannot be reached, and retries', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchNodeDesktop.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ available: true });
    const wrapper = await mountViewer();
    expect(wrapper.get('[data-testid="node-desktop-error"]').text()).toContain('Cannot reach node');

    await wrapper.get('[data-testid="node-desktop-error"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="node-desktop-tile-stub"]').exists()).toBe(true);
  });
});
