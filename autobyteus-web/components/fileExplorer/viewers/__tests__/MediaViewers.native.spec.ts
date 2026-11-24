// autobyteus-574 D-2 and autobyteus-642 D-2 (UC-002, REQ-002, AC-002; 574 AC-006): in a phone app whose player plays the
// file's type, opening a protected node video or audio file hands it to the app at once and leaves a Play button; the page
// downloads nothing. The chat's media message shows a play tile that does the same. An app without the player, or one
// that does not list the type, keeps the page's player.
// Production: VideoPlayer.vue, AudioPlayer.vue, MediaSegment.vue, useNativeMediaPlayback, getShellBridge (a fake app
// object behind window.AutoByteusShell), the session store, useAuthorizedObjectUrl (its download is spied on, not doubled).
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
      return new Blob(['media']);
    },
  };
});

// The iOS app's list (AVPlayer): no Ogg.
const IOS_PLAYER = { video: ['mp4', 'm4v', 'mov'], audio: ['mp3', 'm4a', 'aac', 'wav', 'aif', 'aiff', 'caf'] };

type Listener = (event: { data: unknown }) => void;
const installApp = (mediaPlayer: boolean) => {
  const posted: Array<Record<string, unknown>> = [];
  const listeners = new Set<Listener>();
  (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
    postMessage: (message: string) => {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      posted.push(parsed);
      if (parsed.type === 'hello') {
        const hello = { type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', ...(mediaPlayer ? { mediaPlayer: IOS_PLAYER } : {}) };
        queueMicrotask(() => listeners.forEach((listener) => listener({ data: JSON.stringify(hello) })));
      }
    },
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  return posted;
};

const VIDEO = '/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4';
const AUDIO = '/rest/workspaces/agent_ws_ab12/content?path=notes%2Fmemo.m4a';
const wrappers: VueWrapper[] = [];

const mountWithSession = async (component: 'VideoPlayer' | 'AudioPlayer' | 'MediaSegment', props: Record<string, unknown>) => {
  vi.resetModules();
  setActivePinia(createPinia());
  const { useMobileNodeSessionStore } = await import('~/stores/mobileNodeSessionStore');
  useMobileNodeSessionStore().session = { entryId: 'e1', serverBaseUrl: window.location.origin, nodeName: 'MacBook', credential: 'mra_phone_credential', pairedAt: '2026-11-24T00:00:00.000Z' } as never;
  const subject = component === 'VideoPlayer' ? (await import('../VideoPlayer.vue')).default
    : component === 'AudioPlayer' ? (await import('../AudioPlayer.vue')).default
      : (await import('~/components/conversation/segments/MediaSegment.vue')).default;
  const wrapper: VueWrapper = mount(subject as Component, { props, global: { mocks: { $t: (key: string) => key.split('.').pop() } } });
  wrappers.push(wrapper);
  for (let tick = 0; tick < 5; tick += 1) { await Promise.resolve(); await nextTick(); }
  return wrapper;
};

const playMessages = (posted: Array<Record<string, unknown>>) => posted.filter((message) => message.type === 'playMedia');

const KINDS = [
  { kind: 'video', viewer: 'VideoPlayer', element: 'video', url: VIDEO, title: 'plan.mp4', other: '/rest/node-files/content?path=%2Ftmp%2Fother.mp4', otherTitle: 'other.mp4' },
  { kind: 'audio', viewer: 'AudioPlayer', element: 'audio', url: AUDIO, title: 'memo.m4a', other: '/rest/node-files/content?path=%2Ftmp%2Fother.mp3', otherTitle: 'other.mp3' },
] as const;

describe.each(KINDS)('a protected node $kind file in the phone apps', ({ kind, viewer, element, url, title, other, otherTitle }) => {
  beforeEach(() => { downloads.length = 0; });
  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
  });

  it('Files: opening it plays it in the app at once and leaves a Play button; the page downloads nothing', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession(viewer, { url });
    expect(playMessages(posted)).toEqual([{ type: 'playMedia', kind, url: `${window.location.origin}${url}`, title, credential: 'mra_phone_credential' }]);
    expect(wrapper.find(`[data-testid="native-${kind}"]`).text()).toContain(title);
    expect(wrapper.find(element).exists()).toBe(false);
    expect(downloads).toEqual([]);

    await wrapper.find('.play-button').trigger('click');
    expect(playMessages(posted)).toHaveLength(2);
  });

  it('Files: opening another file hands that one to the app', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession(viewer, { url });
    await wrapper.setProps({ url: other });
    expect(playMessages(posted).map((message) => message.title)).toEqual([title, otherTitle]);
  });

  // 574 CR-001 (API/E2E F-1): the open file reloading (live refresh after an agent rewrote it, or the file opened again)
  // does not open the player by itself: it may already be open, or the user closed it. Play still opens it.
  it('Files: a reload of the open file (contentRevision) posts no playMedia; Play still does', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession(viewer, { url, contentRevision: 0 });
    expect(playMessages(posted)).toHaveLength(1);
    await wrapper.setProps({ contentRevision: 1 });
    await wrapper.setProps({ contentRevision: 2 });
    expect(playMessages(posted)).toHaveLength(1);
    expect(wrapper.find(`[data-testid="native-${kind}"]`).exists()).toBe(true);
    await wrapper.find('.play-button').trigger('click');
    expect(playMessages(posted)).toHaveLength(2);
    expect(downloads).toEqual([]);
  });

  it('chat: a media message shows a play tile, which plays it in the app; nothing is downloaded', async () => {
    const posted = installApp(true);
    const wrapper = await mountWithSession('MediaSegment', { segment: { type: 'media', mediaType: kind, urls: [url] } });
    expect(playMessages(posted)).toEqual([]);
    const tile = wrapper.find(`[data-testid="native-${kind}-tile"]`);
    expect(tile.text()).toContain(title);
    expect(wrapper.find(element).exists()).toBe(false);
    await tile.trigger('click');
    expect(playMessages(posted)).toEqual([{ type: 'playMedia', kind, url: `${window.location.origin}${url}`, title, credential: 'mra_phone_credential' }]);
    expect(downloads).toEqual([]);
  });

  it('an app without the player: the page downloads it and plays it in its own player, as today (574 AC-006)', async () => {
    const posted = installApp(false);
    const wrapper = await mountWithSession(viewer, { url });
    expect(playMessages(posted)).toEqual([]);
    expect(downloads).toEqual([url]);
    expect(wrapper.find(element).exists()).toBe(true);
  });
});

describe('a type the app does not play (autobyteus-642 REQ-002)', () => {
  beforeEach(() => { downloads.length = 0; });
  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
  });

  it.each([
    ['AudioPlayer', 'audio', '/rest/workspaces/agent_ws_ab12/content?path=notes%2Fvoice.ogg'],
    ['VideoPlayer', 'video', '/rest/workspaces/agent_ws_ab12/content?path=demo%2Fclip.webm'],
  ] as const)('%s: an iOS app without it in its list keeps the page path (%s)', async (viewer, element, url) => {
    const posted = installApp(true);
    const wrapper = await mountWithSession(viewer, { url });
    expect(playMessages(posted)).toEqual([]);
    expect(downloads).toEqual([url]);
    expect(wrapper.find(element).exists()).toBe(true);
  });

  it('chat: an Ogg audio message on iOS plays in the page', async () => {
    const posted = installApp(true);
    const url = '/rest/workspaces/agent_ws_ab12/content?path=notes%2Fvoice.ogg';
    const wrapper = await mountWithSession('MediaSegment', { segment: { type: 'media', mediaType: 'audio', urls: [url] } });
    expect(wrapper.find('[data-testid="native-audio-tile"]').exists()).toBe(false);
    expect(playMessages(posted)).toEqual([]);
    expect(downloads).toEqual([url]);
  });
});
