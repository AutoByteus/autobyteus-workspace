import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import PreviewPanel from '../PreviewPanel.vue';
import { usePreviewShellStore } from '~/stores/previewShellStore';

describe('PreviewPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  it('renders preview sessions from the store without crashing on mount', async () => {
    const store = usePreviewShellStore();
    store.previewVisible = true;
    store.activePreviewSessionId = 'abc123';
    store.sessions = [
      {
        preview_session_id: 'abc123',
        title: 'Google Preview Test',
        url: 'https://www.google.com/',
      },
    ];

    const wrapper = mount(PreviewPanel);
    await nextTick();

    expect(wrapper.text()).toContain('Google Preview Test');
    expect(wrapper.findAll('button')).toHaveLength(1);
  });
});
