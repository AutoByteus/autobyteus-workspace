// autobyteus-574 D-2, D-5 and autobyteus-642 D-2 (REQ-002; AC-002): the page hands a protected video or audio file of this
// node to the phone app's own player only when the app says its player plays that file's type; the credential goes to the
// bridge here, in a playMedia message, and nowhere else. A browser, an older app, a type the app does not list, another
// site's file and an unpaired page keep today's path.
// Production: useNativeMediaPlayback, getShellBridge (a fake app object behind window.AutoByteusShell), the session store.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

type Listener = (event: { data: unknown }) => void;

/** The app behind the bridge: answers `hello` with its `mediaPlayer` (or, as an older app, without it). */
const installApp = (hello: Record<string, unknown> | null) => {
  const posted: Array<Record<string, unknown>> = [];
  const listeners = new Set<Listener>();
  (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
    postMessage: (message: string) => {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      posted.push(parsed);
      if (parsed.type === 'hello' && hello) queueMicrotask(() => listeners.forEach((listener) => listener({ data: JSON.stringify(hello) })));
    },
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  return posted;
};

// The lists each app writes (autobyteus-642 D-2): Media3 on Android, AVPlayer on iOS.
const ANDROID = { video: ['mp4', 'm4v', 'mov', 'webm', 'mkv', '3gp'], audio: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac'] };
const IOS = { video: ['mp4', 'm4v', 'mov'], audio: ['mp3', 'm4a', 'aac', 'wav', 'aif', 'aiff', 'caf'] };
const shell = (mediaPlayer?: unknown) => ({ type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', ...(mediaPlayer ? { mediaPlayer } : {}) });

const NODE_VIDEO = '/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4';
const NODE_AUDIO = '/rest/workspaces/agent_ws_ab12/content?path=notes%2Fmemo.m4a';
const content = (file: string) => `/rest/workspaces/agent_ws_ab12/content?path=${encodeURIComponent(file)}`;

const load = async (credential: string | null = 'mra_phone_credential') => {
  vi.resetModules();
  setActivePinia(createPinia());
  const { useMobileNodeSessionStore } = await import('~/stores/mobileNodeSessionStore');
  if (credential) {
    useMobileNodeSessionStore().session = { entryId: 'e1', serverBaseUrl: window.location.origin, nodeName: 'MacBook', credential, pairedAt: '2026-11-24T00:00:00.000Z' } as never;
  }
  const module = await import('../useNativeMediaPlayback');
  return { video: module.useNativeMediaPlayback('video'), audio: module.useNativeMediaPlayback('audio'), mediaTitleOf: module.mediaTitleOf };
};

const settle = async () => { await Promise.resolve(); await nextTick(); };

describe('useNativeMediaPlayback', () => {
  beforeEach(() => { delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell; });
  afterEach(() => { delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell; });

  it('in a browser (no bridge) every video and audio file plays in the page, as today', async () => {
    const { video, audio } = await load();
    expect([video.modeFor(NODE_VIDEO), audio.modeFor(NODE_AUDIO)]).toEqual(['page', 'page']);
    expect(video.play(NODE_VIDEO) || audio.play(NODE_AUDIO)).toBe(false);
  });

  it('in an app with the player: pending until it answers, then native for a protected file of this node of a listed type', async () => {
    installApp(shell(IOS));
    const { video, audio } = await load();
    expect([video.modeFor(NODE_VIDEO), audio.modeFor(NODE_AUDIO)]).toEqual(['pending', 'pending']);
    await settle();
    expect([video.modeFor(NODE_VIDEO), audio.modeFor(NODE_AUDIO)]).toEqual(['native', 'native']);
    expect(video.modeFor(`${window.location.origin}/rest/node-files/content?path=%2Ftmp%2Fclip.mp4`)).toBe('native');
    expect(audio.modeFor('/rest/workspaces/w/static/site/media/theme.mp3')).toBe('native');
  });

  it.each([
    ['Android', ANDROID, 'audio', 'voice.ogg', 'native'],
    ['Android', ANDROID, 'audio', 'voice.opus', 'native'],
    ['Android', ANDROID, 'video', 'clip.webm', 'native'],
    ['iOS', IOS, 'audio', 'voice.ogg', 'page'],
    ['iOS', IOS, 'audio', 'voice.opus', 'page'],
    // autobyteus-642 N-5: AVPlayer cannot play WebM, which 574 sent it; it now plays in the page.
    ['iOS', IOS, 'video', 'clip.webm', 'page'],
    ['iOS', IOS, 'audio', 'song.mp3', 'native'],
    ['Android', ANDROID, 'audio', 'song.mp3', 'native'],
    ['iOS', IOS, 'audio', 'LOUD.MP3', 'native'],
    ['iOS', IOS, 'audio', 'recording', 'page'],
    // The kind decides the list: a video file the audio player is asked for is not native, and the other way round.
    ['iOS', IOS, 'audio', 'clip.mov', 'page'],
    ['iOS', IOS, 'video', 'song.mp3', 'page'],
  ] as const)('%s: an %s file %s plays %s', async (_app, player, kind, file, expected) => {
    installApp(shell(player));
    const playback = (await load())[kind];
    await settle();
    expect(playback.modeFor(content(file))).toBe(expected);
  });

  it('reads the type from the file the URL names, not the URL path (autobyteus-642 N-4)', async () => {
    installApp(shell(IOS));
    const { audio } = await load();
    await settle();
    expect(audio.modeFor('/rest/workspaces/w/content.mp3?path=notes%2Fmemo.ogg')).toBe('page');
    expect(audio.modeFor('/rest/workspaces/w/content?path=notes.mp3%2Fmemo')).toBe('page');
  });

  it.each([
    ['video', NODE_VIDEO, 'plan.mp4'],
    ['audio', NODE_AUDIO, 'memo.m4a'],
  ] as const)('play hands the app the %s file: its kind, absolute URL, file name and the credential, in one playMedia message', async (kind, url, title) => {
    const posted = installApp(shell(IOS));
    const playback = (await load())[kind];
    await settle();
    expect(playback.play(url)).toBe(true);
    expect(posted.filter((message) => message.type === 'playMedia')).toEqual([{
      type: 'playMedia', kind, url: `${window.location.origin}${url}`, title, credential: 'mra_phone_credential',
    }]);
  });

  it.each([
    ['another site', 'https://videos.example.com/rest/workspaces/w/content?path=a.mp4'],
    ['a route that is not a protected file route', '/videos/plan.mp4'],
    ['an object URL', 'blob:http://localhost/123'],
  ])('%s: plays in the page, and play sends nothing', async (_case, url) => {
    const posted = installApp(shell(IOS));
    const { video } = await load();
    await settle();
    expect(video.modeFor(url)).toBe('page');
    expect(video.play(url)).toBe(false);
    expect(posted.some((message) => message.type === 'playMedia')).toBe(false);
  });

  it('a type the app does not list: play sends nothing', async () => {
    const posted = installApp(shell(IOS));
    const { audio } = await load();
    await settle();
    expect(audio.play(content('voice.ogg'))).toBe(false);
    expect(posted.some((message) => message.type === 'playMedia')).toBe(false);
  });

  it('an older app (its hello has no mediaPlayer) keeps today\'s path', async () => {
    installApp(shell());
    const { video, audio } = await load();
    await settle();
    expect([video.modeFor(NODE_VIDEO), audio.modeFor(NODE_AUDIO)]).toEqual(['page', 'page']);
  });

  it('an unpaired page (no credential) keeps today\'s path and never posts a credential', async () => {
    const posted = installApp(shell(IOS));
    const { video, audio } = await load(null);
    await settle();
    expect([video.modeFor(NODE_VIDEO), audio.modeFor(NODE_AUDIO)]).toEqual(['page', 'page']);
    expect(video.play(NODE_VIDEO) || audio.play(NODE_AUDIO)).toBe(false);
    expect(posted.some((message) => message.type === 'playMedia')).toBe(false);
  });

  it('names the file by its file name for the player\'s title', async () => {
    const { mediaTitleOf } = await load();
    expect(mediaTitleOf(NODE_VIDEO)).toBe('plan.mp4');
    expect(mediaTitleOf(NODE_AUDIO)).toBe('memo.m4a');
    expect(mediaTitleOf('/rest/workspaces/w/static/site/media/intro%20clip.mp4')).toBe('intro clip.mp4');
    expect(mediaTitleOf('/rest/node-files/content?path=%2FUsers%2Fme%2Fdemo.mov')).toBe('demo.mov');
  });
});
