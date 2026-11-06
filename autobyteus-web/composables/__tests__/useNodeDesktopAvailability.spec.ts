import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

const fetchNodeDesktop = vi.hoisted(() => vi.fn());
const bound = vi.hoisted(() => ({ rest: 'http://node-a.example:8001/rest' }));

vi.mock('~/utils/nodeDesktopClient', () => ({ fetchNodeDesktop }));
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ rest: bound.rest }) }),
}));

// The answer is cached per node for the window, so each case loads the module afresh.
const consumer = async () => {
  const { useNodeDesktopAvailability } = await import('../useNodeDesktopAvailability');
  let api!: ReturnType<typeof useNodeDesktopAvailability>;
  const wrapper = mount(defineComponent({ setup() { api = useNodeDesktopAvailability(); return () => h('div'); } }));
  return { wrapper, api };
};

describe('useNodeDesktopAvailability', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchNodeDesktop.mockReset();
    bound.rest = 'http://node-a.example:8001/rest';
  });

  it('asks the bound node once and shares the answer between viewers', async () => {
    fetchNodeDesktop.mockResolvedValue({ available: true });
    const { useNodeDesktopAvailability } = await import('../useNodeDesktopAvailability');
    const answers: Array<ReturnType<typeof useNodeDesktopAvailability>> = [];
    const Viewer = defineComponent({ setup() { answers.push(useNodeDesktopAvailability()); return () => h('div'); } });
    mount(Viewer);
    mount(Viewer);
    expect(answers.map((answer) => answer.availability.value)).toEqual(['loading', 'loading']);
    await flushPromises();
    expect(answers.map((answer) => answer.availability.value)).toEqual(['available', 'available']);
    expect(fetchNodeDesktop).toHaveBeenCalledTimes(1);
  });

  it('keeps one answer per node', async () => {
    fetchNodeDesktop.mockResolvedValueOnce({ available: true }).mockResolvedValueOnce({ available: false });
    const first = await consumer();
    await flushPromises();
    bound.rest = 'http://embedded.example:29695/rest';
    const { useNodeDesktopAvailability } = await import('../useNodeDesktopAvailability');
    let second!: ReturnType<typeof useNodeDesktopAvailability>;
    mount(defineComponent({ setup() { second = useNodeDesktopAvailability(); return () => h('div'); } }));
    await flushPromises();
    expect(first.api.availability.value).toBe('available');
    expect(second.availability.value).toBe('unavailable');
    expect(fetchNodeDesktop).toHaveBeenCalledTimes(2);
  });

  it('reports an error and asks again on reload', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchNodeDesktop.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ available: true });
    const { api } = await consumer();
    await flushPromises();
    expect(api.availability.value).toBe('error');
    await api.reload();
    expect(api.availability.value).toBe('available');
    expect(fetchNodeDesktop).toHaveBeenCalledTimes(2);
  });
});
