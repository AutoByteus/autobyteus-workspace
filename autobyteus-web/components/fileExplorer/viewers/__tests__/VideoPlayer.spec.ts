import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoPlayer from '../VideoPlayer.vue';

const resolvedUrl = ref<string | null>(null);
const resourceError = ref<string | null>(null);
const refresh = vi.fn(async () => undefined);

vi.mock('~/composables/useAuthorizedObjectUrl', () => ({
  useAuthorizedObjectUrl: () => ({
    resolvedUrl,
    error: resourceError,
    refresh,
  }),
}));

const translations: Record<string, string> = {
  'tools.components.fileExplorer.viewers.VideoPlayer.video_could_not_be_played':
    'This video could not be played.',
  'tools.components.fileExplorer.viewers.VideoPlayer.retry': 'Retry',
  'tools.components.fileExplorer.viewers.VideoPlayer.video_url_is_not_available':
    'Video URL is not available.',
  'tools.components.fileExplorer.viewers.VideoPlayer.your_browser_does_not_support_the':
    'Your browser does not support video.',
};

const wrappers: VueWrapper[] = [];

const mountSubject = (url: string | null): VueWrapper => {
  const wrapper = mount(VideoPlayer, {
    props: { url },
    global: {
      mocks: {
        $t: (key: string) => translations[key] ?? key,
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  resolvedUrl.value = null;
  resourceError.value = null;
  refresh.mockClear();
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount();
  }
});

describe('VideoPlayer media attempts', () => {
  it('preserves the no-source state separately from media failure', () => {
    const wrapper = mountSubject(null);

    expect(wrapper.find('video').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Video URL is not available.');
  });

  it('renders native controls without autoplay for an available source', () => {
    resolvedUrl.value = 'local-file:///tmp/video.mp4';
    const wrapper = mountSubject('local-file:///tmp/video.mp4');
    const video = wrapper.get('video');

    expect(video.attributes('src')).toBe('local-file:///tmp/video.mp4');
    expect(video.attributes()).toHaveProperty('controls');
    expect(video.attributes()).not.toHaveProperty('autoplay');
    expect(video.attributes('data-media-attempt')).toBe('0');
  });

  it('replaces a native media failure with a generic accessible Retry state', async () => {
    resolvedUrl.value = 'local-file:///tmp/private-video.mp4';
    const wrapper = mountSubject('local-file:///tmp/private-video.mp4');

    await wrapper.get('video').trigger('error');

    expect(wrapper.find('video').exists()).toBe(false);
    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain('This video could not be played.');
    expect(alert.text()).not.toContain('/tmp/private-video.mp4');
    expect(alert.get('button').text()).toBe('Retry');
    expect(alert.get('button').attributes('type')).toBe('button');
  });

  it('uses the same generic state for resource failures without exposing raw errors', async () => {
    resourceError.value = 'fetch failed for /Users/person/secret.mp4';
    const wrapper = mountSubject('https://example.com/video.mp4');
    await nextTick();

    expect(wrapper.get('[role="alert"]').text()).toContain('This video could not be played.');
    expect(wrapper.text()).not.toContain('fetch failed');
    expect(wrapper.text()).not.toContain('/Users/person/secret.mp4');
  });

  it('refreshes the resource and mounts a new media attempt on Retry', async () => {
    resolvedUrl.value = 'local-file:///tmp/video.mp4';
    const wrapper = mountSubject('local-file:///tmp/video.mp4');
    await wrapper.get('video').trigger('error');

    await wrapper.get('button').trigger('click');

    expect(refresh).toHaveBeenCalledOnce();
    expect(wrapper.get('video').attributes('data-media-attempt')).toBe('1');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('clears stale failure and starts a new attempt when the URL changes', async () => {
    resolvedUrl.value = 'local-file:///tmp/first.mp4';
    const wrapper = mountSubject('local-file:///tmp/first.mp4');
    await wrapper.get('video').trigger('error');

    resolvedUrl.value = 'local-file:///tmp/second.mp4';
    await wrapper.setProps({ url: 'local-file:///tmp/second.mp4' });

    const video = wrapper.get('video');
    expect(video.attributes('src')).toBe('local-file:///tmp/second.mp4');
    expect(video.attributes('data-media-attempt')).toBe('1');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
