// The iPad's landscape layout (autobyteus-279, REQ-008): it follows the viewport width (1024 CSS px), and changes as the
// device rotates.
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { MOBILE_SPLIT_QUERY, useMobileSplitLayout } from '../useMobileSplitLayout';

describe('useMobileSplitLayout', () => {
  it('is split at 1024 px and wider, and follows a rotation', async () => {
    let listener: ((event: { matches: boolean }) => void) | null = null;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true, media: query,
      addEventListener: (_type: string, handler: typeof listener) => { listener = handler; },
      removeEventListener: vi.fn(),
    })) as never;
    let split: { value: boolean } | null = null;
    const wrapper = mount(defineComponent({ setup() { split = useMobileSplitLayout(); return () => h('div'); } }));
    expect(MOBILE_SPLIT_QUERY).toBe('(min-width: 1024px)');
    expect(split!.value).toBe(true);
    listener!({ matches: false });
    await nextTick();
    expect(split!.value).toBe(false);
    wrapper.unmount();
    window.matchMedia = original;
  });
});
