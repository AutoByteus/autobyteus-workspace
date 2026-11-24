import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoPlayer from '../VideoPlayer.vue';

const resolvedUrl = ref<string | null>(null);
const resourceError = ref<string | null>(null);
const loading = ref(false);
const progress = ref<{ loaded: number; total: number | null } | null>(null);
const refresh = vi.fn(async () => undefined);

vi.mock('~/composables/useAuthorizedObjectUrl', () => ({
  useAuthorizedObjectUrl: () => ({
    resolvedUrl,
    error: resourceError,
    loading,
    progress,
    refresh,
  }),
}));
// Outside the phone apps (VideoPlayer.native.spec.ts covers the apps' player).
vi.mock('~/composables/mobile/useNativeMediaPlayback', () => ({
  useNativeMediaPlayback: () => ({ modeFor: () => 'page', play: () => false }),
  mediaTitleOf: () => 'clip.mp4',
}));
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (_key: string, params?: Record<string, string>) => `${params?.loaded} of ${params?.total}` }),
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
  loading.value = false;
  progress.value = null;
  refresh.mockClear();
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount();
  }
});

describe('VideoPlayer while its file loads (autobyteus-572 AC-001)', () => {
  it('shows the loading view with progress, never "not available", then the video', async () => {
    loading.value = true;
    progress.value = { loaded: 4_100_000, total: 9_684_568 };
    const wrapper = mountSubject('/rest/workspaces/ws/content?path=big.mp4');
    expect(wrapper.find('[data-testid="media-loading-state"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('4.1 of 9.7 MB');
    expect(wrapper.text()).not.toContain('Video URL is not available.');
    expect(wrapper.find('video').exists()).toBe(false);

    loading.value = false;
    progress.value = null;
    resolvedUrl.value = 'blob:http://phone/1';
    await nextTick();
    expect(wrapper.find('[data-testid="media-loading-state"]').exists()).toBe(false);
    expect(wrapper.get('video').attributes('src')).toBe('blob:http://phone/1');
  });

  it('a failure while loading shows the plain failure with Retry, not the loading view', async () => {
    loading.value = true;
    resourceError.value = 'Failed to fetch protected resource (404 Not Found)';
    const wrapper = mountSubject('/rest/workspaces/ws/content?path=gone.mp4');
    expect(wrapper.get('[role="alert"]').text()).toContain('This video could not be played.');
    expect(wrapper.find('[data-testid="media-loading-state"]').exists()).toBe(false);
  });
});

describe('VideoPlayer media attempts', () => {
  it('preserves the no-source state separately from media failure', () => {
    const wrapper = mountSubject(null);

    expect(wrapper.find('video').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Video URL is not available.');
  });

  it('renders native controls without autoplay for an available source', () => {
    resolvedUrl.value = 'local-file://local/tmp/video.mp4';
    const wrapper = mountSubject('local-file://local/tmp/video.mp4');
    const video = wrapper.get('video');

    expect(video.attributes('src')).toBe('local-file://local/tmp/video.mp4');
    expect(video.attributes()).toHaveProperty('controls');
    expect(video.attributes()).not.toHaveProperty('autoplay');
    expect(video.attributes('data-media-attempt')).toBe('0');
  });

  it('replaces a native media failure with a generic accessible Retry state', async () => {
    resolvedUrl.value = 'local-file://local/tmp/private-video.mp4';
    const wrapper = mountSubject('local-file://local/tmp/private-video.mp4');

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
    resolvedUrl.value = 'local-file://local/tmp/video.mp4';
    const wrapper = mountSubject('local-file://local/tmp/video.mp4');
    await wrapper.get('video').trigger('error');

    await wrapper.get('button').trigger('click');

    expect(refresh).toHaveBeenCalledOnce();
    expect(wrapper.get('video').attributes('data-media-attempt')).toBe('1');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('clears stale failure and starts a new attempt when the URL changes', async () => {
    resolvedUrl.value = 'local-file://local/tmp/first.mp4';
    const wrapper = mountSubject('local-file://local/tmp/first.mp4');
    await wrapper.get('video').trigger('error');

    resolvedUrl.value = 'local-file://local/tmp/second.mp4';
    await wrapper.setProps({ url: 'local-file://local/tmp/second.mp4' });

    const video = wrapper.get('video');
    expect(video.attributes('src')).toBe('local-file://local/tmp/second.mp4');
    expect(video.attributes('data-media-attempt')).toBe('1');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
