import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import type { VoiceTranscriptTarget } from '~/types/voiceInput';

/** autobyteus-320 item 6 (REQ-009, AC-011): voice input in Memory → Search, the existing button and status line. */
const memory = vi.hoisted(() => ({ store: null as any }));
let voice: any;

vi.mock('~/composables/useMemoryIndexView', () => ({
  useMemoryIndexView: () => ({ store: memory.store, index: { value: null }, status: { value: { spinner: false, attention: false, label: '' } } }),
}));
vi.mock('~/stores/voiceInputStore', () => ({ useVoiceInputStore: () => voice }));

import MemorySearchPanel from '../MemorySearchPanel.vue';

let wrapper: VueWrapper | null = null;
const mountPanel = () => {
  wrapper = mount(MemorySearchPanel, { attachTo: document.body });
  return wrapper;
};
const button = () => wrapper!.find('[data-test="memory-search-voice-button"]');
const input = () => wrapper!.get('[data-test="memory-search-input"]').element as HTMLInputElement;
/** The panel's voice target, as the button hands it to the store when the user starts recording. */
const startAndTakeTarget = async (): Promise<VoiceTranscriptTarget> => {
  await button().trigger('click');
  expect(voice.toggleRecording).toHaveBeenCalledWith(expect.objectContaining({ source: 'memory-search' }));
  return voice.toggleRecording.mock.calls.at(-1)![0].target;
};

beforeEach(() => {
  memory.store = reactive({ query: '', searchReady: true });
  voice = reactive({
    isAvailable: true, transcriptTarget: null, isStarting: false, isRecording: false, isTranscribing: false, latestResult: null,
    initialize: vi.fn(async () => undefined), toggleRecording: vi.fn(async () => undefined), cancelOperationForTarget: vi.fn(async () => undefined),
  });
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('MemorySearchPanel voice input', () => {
  it('shows the compact voice button inside the search box when voice input is available, and none when it is not', async () => {
    mountPanel();
    expect(button().exists()).toBe(true);
    expect(button().element.tagName).toBe('BUTTON');
    expect(button().attributes('type')).toBe('button');
    expect(button().classes()).toEqual(expect.arrayContaining(['h-8', 'w-8', 'absolute']));
    expect(input().className).toContain('pr-12');

    voice.isAvailable = false;
    await nextTick();
    expect(button().exists()).toBe(false);
    expect(input().className).toContain('pr-3');
  });

  it('disables the button while search is not ready', async () => {
    memory.store.searchReady = false;
    mountPanel();
    expect(button().attributes('disabled')).toBeDefined();
    memory.store.searchReady = true;
    await nextTick();
    expect(button().attributes('disabled')).toBeUndefined();
  });

  it('merges a transcript into the typed text and does not search until Search is pressed', async () => {
    mountPanel();
    await wrapper!.get('[data-test="memory-search-input"]').setValue('billing');
    const target = await startAndTakeTarget();
    expect(target.isCurrent()).toBe(true);

    target.appendTranscript('invoice totals');
    await nextTick();
    expect(input().value).toBe('billing invoice totals');
    expect(wrapper!.emitted('search')).toBeUndefined();

    await wrapper!.get('form').trigger('submit');
    expect(wrapper!.emitted('search')).toEqual([['billing invoice totals']]);
  });

  it('shows the shared voice status line for its own capture, and cancels its operation when the panel closes', async () => {
    mountPanel();
    const target = await startAndTakeTarget();
    voice.transcriptTarget = target;
    voice.isRecording = true;
    await nextTick();
    const status = wrapper!.get('[data-testid="memory-search-voice-status"]');
    expect(status.text()).toContain('Recording… Tap stop when you are done.');
    expect(wrapper!.find('[data-testid="memory-search-voice-cancel"]').exists()).toBe(true);

    wrapper!.unmount();
    wrapper = null;
    expect(target.isCurrent()).toBe(false);
    expect(voice.cancelOperationForTarget).toHaveBeenCalledWith(target.key);
  });
});
