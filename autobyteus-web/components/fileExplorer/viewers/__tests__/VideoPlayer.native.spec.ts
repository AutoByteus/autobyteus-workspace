// autobyteus-574 D-2 (UC-001, REQ-001, AC-006): in a phone app with its own player, opening a protected node video hands
// it to the app at once and leaves a Play button; the page downloads nothing. The chat's media message shows a play tile
// that does the same. An app without the player keeps the page's player.
// Production: VideoPlayer.vue, MediaSegment.vue, useNativeVideoPlayback, getShellBridge (a fake app object behind
// window.AutoByteusShell), the session store, useAuthorizedObjectUrl (its download is spied on, not doubled).
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, type Component } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const downloads = vi.hoisted(() => [] as string[]);
vi.mock('~/utils/remoteAccess/authorizedResourceUrl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/remoteAccess/authorizedResourceUrl')>();
  return {
    ...actual,
    fetchAuthorizedResourceBlob: async (url: string) => {
      downloads.push(url);
      return new Blob(['video']);
    },
  };
});

type Listener = (event: { data: unknown }) => void;
const installApp = (videoPlayer: boolean) => {
  const posted: Array<Record<string, unknown>> = [];
  const listeners = new Set<Listener>();
  (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
    postMessage: (message: string) => {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      posted.push(parsed);
      if (parsed.type === 'hello') {
        const hello = { type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', ...(videoPlayer ? { videoPlayer: true } : {}) };
        queueMicrotask(() => listeners.forEach((listener) => listener({ data: JSON.stringify(hello) })));
      }
    },
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  return posted;
};

const VIDEO = '/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4';
const wrappers: VueWrapper[] = [];

const mountWithSession = async (component: 'VideoPlayer' | 'MediaSegment', props: Record<string, unknown>) => {
  vi.resetModules();
  setActivePinia(createPinia());
  const { useMobileNodeSessionStore } = await import('~/stores/mobileNodeSessionStore');
  useMobileNodeSessionStore().session = { entryId: 'e1', serverBaseUrl: window.location.origin, nodeName: 'MacBook', credential: 'mra_phone_credential', pairedAt: '2026-11-24T00:00:00.000Z' } as never;
  const subject = component === 'VideoPlayer'
    ? (await import('../VideoPlayer.vue')).default
    : (await import('~/components/conversation/segments/MediaSegment.vue')).default;
  const wrapper: VueWrapper = mount(subject as Component, { props, global: { mocks: { $t: (key: string) => key.split('.').pop() } } });
  wrappers.push(wrapper);
  for (let tick = 0; tick < 5; tick += 1) { await Promise.resolve(); await nextTick(); }
  return wrapper;
};

const playMessages = (posted: Array<Record<string, unknown>>) => posted.filter((message) => message.type === 'playVideo');

describe('a protected node video in the phone apps (autobyteus-574 D-2)', () => {
  beforeEach(() => { downloads.length = 0; });
  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
  });

  it('Files: opening it plays it in the app at once and leaves a Play button; the page downloads nothing', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession('VideoPlayer', { url: VIDEO });
    expect(playMessages(posted)).toEqual([{ type: 'playVideo', url: `${window.location.origin}${VIDEO}`, title: 'plan.mp4', credential: 'mra_phone_credential' }]);
    expect(wrapper.find('[data-testid="native-video"]').text()).toContain('plan.mp4');
    expect(wrapper.find('video').exists()).toBe(false);
    expect(downloads).toEqual([]);

    await wrapper.find('.play-button').trigger('click');
    expect(playMessages(posted)).toHaveLength(2);
  });

  it('Files: opening another video hands that one to the app', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession('VideoPlayer', { url: VIDEO });
    await wrapper.setProps({ url: '/rest/node-files/content?path=%2Ftmp%2Fother.mp4' });
    expect(playMessages(posted).map((message) => message.title)).toEqual(['plan.mp4', 'other.mp4']);
  });

  // CR-001 (API/E2E F-1): the open file reloading (live refresh after an agent rewrote it, or the file opened again) does
  // not open the player by itself: it may already be open, or the user closed it. Play still opens it.
  it('Files: a reload of the open video (contentRevision) posts no playVideo; Play still does', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession('VideoPlayer', { url: VIDEO, contentRevision: 0 });
    expect(playMessages(posted)).toHaveLength(1);
    await wrapper.setProps({ contentRevision: 1 });
    await wrapper.setProps({ contentRevision: 2 });
    expect(playMessages(posted)).toHaveLength(1);
    expect(wrapper.find('[data-testid="native-video"]').exists()).toBe(true);
    await wrapper.find('.play-button').trigger('click');
    expect(playMessages(posted)).toHaveLength(2);
    expect(downloads).toEqual([]);
  });

  it('chat: a media message shows a play tile, which plays it in the app; nothing is downloaded', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession('MediaSegment', { segment: { type: 'media', mediaType: 'video', urls: [VIDEO] } });
    expect(playMessages(posted)).toEqual([]);
    const tile = wrapper.find('[data-testid="native-video-tile"]');
    expect(tile.text()).toContain('plan.mp4');
    expect(wrapper.find('video').exists()).toBe(false);
    await tile.trigger('click');
    expect(playMessages(posted)).toHaveLength(1);
    expect(downloads).toEqual([]);
  });

  it('an app without the player: the page downloads it and plays it in its own player, as today (AC-006)', async () => {
    const posted = installApp(false);
    const wrapper = await mountWithSession('VideoPlayer', { url: VIDEO });
    expect(playMessages(posted)).toEqual([]);
    expect(downloads).toEqual([VIDEO]);
    expect(wrapper.find('video').exists()).toBe(true);
  });
});
