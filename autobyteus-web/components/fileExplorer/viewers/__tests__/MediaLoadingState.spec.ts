import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MediaLoadingState, { formatLoadingProgress } from '../MediaLoadingState.vue';

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string, params?: Record<string, string>) => `${params?.loaded} of ${params?.total}` }),
}));

const ofTotal = (loaded: string, total: string) => `${loaded} of ${total}`;
const MB = 1000 * 1000;

describe('formatLoadingProgress (autobyteus-572 D-3)', () => {
  it.each([
    [{ loaded: 4.1 * MB, total: 9.7 * MB }, '4.1 of 9.7 MB'],
    [{ loaded: 0, total: 9.7 * MB }, '0.0 of 9.7 MB'],
    [{ loaded: 300 * 1000, total: 900 * 1000 }, '300 of 900 KB'],
    [{ loaded: 4.1 * MB, total: null }, '4.1 MB'],
    [{ loaded: 0, total: null }, null],
    [null, null],
  ])('%o → %s', (progress, text) => {
    expect(formatLoadingProgress(progress, ofTotal)).toBe(text);
  });

  it('never shows more arrived than the total', () => {
    expect(formatLoadingProgress({ loaded: 11 * MB, total: 10 * MB }, ofTotal)).toBe('10.0 of 10.0 MB');
  });
});

describe('MediaLoadingState', () => {
  it('says what is loading and how much has arrived, as a status', () => {
    const wrapper = mount(MediaLoadingState, {
      props: { kind: 'video', progress: { loaded: 4.1 * MB, total: 9.7 * MB } },
      global: { mocks: { $t: (key: string) => key } },
    });
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.text()).toContain('tools.components.fileExplorer.viewers.MediaLoadingState.loading_video');
    expect(wrapper.get('[data-testid="media-loading-progress"]').text()).toBe('4.1 of 9.7 MB');
  });

  it('shows no size before anything is known', () => {
    const wrapper = mount(MediaLoadingState, { props: { kind: 'audio', progress: null }, global: { mocks: { $t: (key: string) => key } } });
    expect(wrapper.find('[data-testid="media-loading-progress"]').exists()).toBe(false);
  });
});
