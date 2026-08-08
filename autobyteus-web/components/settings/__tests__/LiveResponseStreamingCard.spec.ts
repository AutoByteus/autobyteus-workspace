import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import LiveResponseStreamingCard from '../LiveResponseStreamingCard.vue';
import { useServerSettingsStore } from '~/stores/serverSettings';

const SETTING_KEY = 'AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS';
const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const mountCard = async (effectiveValue: number | null = 500) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        effectiveStreamingContentFlushIntervalMs: effectiveValue,
        isLoading: false,
        isUpdating: false,
      },
    },
  });
  setActivePinia(pinia);
  const store = useServerSettingsStore();
  store.updateServerSetting = vi.fn().mockResolvedValue(true);
  const wrapper = mount(LiveResponseStreamingCard, { global: { plugins: [pinia] } });
  await flushPromises();
  return { wrapper, store };
};

describe('LiveResponseStreamingCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['100', '2000'])('persists valid inclusive interval %s', async (value) => {
    const { wrapper, store } = await mountCard();
    await wrapper.get('[data-testid="live-response-streaming-input"]').setValue(value);
    await wrapper.get('[data-testid="live-response-streaming-save"]').trigger('click');
    await flushPromises();

    expect(store.updateServerSetting).toHaveBeenCalledWith(SETTING_KEY, value);
  });

  it.each(['99', '2001', '500.5', ''])('rejects invalid interval %s without a write', async (value) => {
    const { wrapper, store } = await mountCard();
    await wrapper.get('[data-testid="live-response-streaming-input"]').setValue(value);

    expect(wrapper.get('[role="alert"]').text()).toContain('whole number')
    expect(wrapper.get('[data-testid="live-response-streaming-save"]').attributes('disabled')).toBeDefined();
    expect(store.updateServerSetting).not.toHaveBeenCalled();
  });

  it('resets a changed draft to the 500 ms default', async () => {
    const { wrapper, store } = await mountCard(1000);
    await wrapper.get('[data-testid="live-response-streaming-input"]').setValue('750');
    await wrapper.get('[data-testid="live-response-streaming-reset"]').trigger('click');
    await flushPromises();

    expect(store.updateServerSetting).toHaveBeenCalledWith(SETTING_KEY, '500');
    expect((wrapper.get('[data-testid="live-response-streaming-input"]').element as HTMLInputElement).value).toBe('500');
  });

  it('disables editing when the bound server has no effective value', async () => {
    const { wrapper } = await mountCard(null);

    expect(wrapper.get('[data-testid="live-response-streaming-input"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="live-response-streaming-save"]').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('unavailable');
  });
});
