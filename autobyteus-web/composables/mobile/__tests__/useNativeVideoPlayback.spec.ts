// autobyteus-574 D-2, D-5 (REQ-001, REQ-003; AC-003, AC-006): the page hands a protected video of this node to the phone
// app's own player only when the app says it has one; the credential goes to the bridge here, in a playVideo message, and
// nowhere else. A browser, an older app, another site's video and an unpaired page keep today's path.
// Production: useNativeVideoPlayback, getShellBridge (a fake app object behind window.AutoByteusShell), the session store.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

type Listener = (event: { data: unknown }) => void;

/** The app behind the bridge: answers `hello` with `videoPlayer` (or, as an older app, without it). */
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

const NODE_VIDEO = '/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4';

const load = async (credential: string | null = 'mra_phone_credential') => {
  vi.resetModules();
  setActivePinia(createPinia());
  const { useMobileNodeSessionStore } = await import('~/stores/mobileNodeSessionStore');
  if (credential) {
    useMobileNodeSessionStore().session = { entryId: 'e1', serverBaseUrl: window.location.origin, nodeName: 'MacBook', credential, pairedAt: '2026-11-24T00:00:00.000Z' } as never;
  }
  const module = await import('../useNativeVideoPlayback');
  return { playback: module.useNativeVideoPlayback(), videoTitleOf: module.videoTitleOf };
};

const settle = async () => { await Promise.resolve(); await nextTick(); };

describe('useNativeVideoPlayback', () => {
  beforeEach(() => { delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell; });
  afterEach(() => { delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell; });

  it('in a browser (no bridge) every video plays in the page, as today', async () => {
    const { playback } = await load();
    expect(playback.modeFor(NODE_VIDEO)).toBe('page');
    expect(playback.play(NODE_VIDEO)).toBe(false);
  });

  it('in an app with the player: pending until it answers, then native for a protected video of this node', async () => {
    installApp({ type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', videoPlayer: true });
    const { playback } = await load();
    expect(playback.modeFor(NODE_VIDEO)).toBe('pending');
    await settle();
    expect(playback.modeFor(NODE_VIDEO)).toBe('native');
    expect(playback.modeFor(`${window.location.origin}/rest/node-files/content?path=%2Ftmp%2Fclip.mp4`)).toBe('native');
  });

  it('play hands the app the absolute URL, the file name and the credential, in one playVideo message', async () => {
    const posted = installApp({ type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', videoPlayer: true });
    const { playback } = await load();
    await settle();
    expect(playback.play(NODE_VIDEO)).toBe(true);
    expect(posted.filter((message) => message.type === 'playVideo')).toEqual([{
      type: 'playVideo',
      url: `${window.location.origin}${NODE_VIDEO}`,
      title: 'plan.mp4',
      credential: 'mra_phone_credential',
    }]);
  });

  it.each([
    ['another site', 'https://videos.example.com/rest/workspaces/w/content?path=a.mp4'],
    ['a route that is not a protected file route', '/videos/plan.mp4'],
    ['an object URL', 'blob:http://localhost/123'],
  ])('%s: plays in the page, and play sends nothing', async (_case, url) => {
    const posted = installApp({ type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', videoPlayer: true });
    const { playback } = await load();
    await settle();
    expect(playback.modeFor(url)).toBe('page');
    expect(playback.play(url)).toBe(false);
    expect(posted.some((message) => message.type === 'playVideo')).toBe(false);
  });

  it('an older app (its hello has no videoPlayer) keeps today\'s path', async () => {
    installApp({ type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook' });
    const { playback } = await load();
    await settle();
    expect(playback.modeFor(NODE_VIDEO)).toBe('page');
  });

  it('an unpaired page (no credential) keeps today\'s path and never posts a credential', async () => {
    const posted = installApp({ type: 'shell', nodeCount: 1, deviceName: 'Pixel 8', nodeName: 'MacBook', videoPlayer: true });
    const { playback } = await load(null);
    await settle();
    expect(playback.modeFor(NODE_VIDEO)).toBe('page');
    expect(playback.play(NODE_VIDEO)).toBe(false);
    expect(posted.some((message) => message.type === 'playVideo')).toBe(false);
  });

  it('names the video by its file name for the player\'s title', async () => {
    const { videoTitleOf } = await load();
    expect(videoTitleOf(NODE_VIDEO)).toBe('plan.mp4');
    expect(videoTitleOf('/rest/workspaces/w/static/site/media/intro%20clip.mp4')).toBe('intro clip.mp4');
    expect(videoTitleOf('/rest/node-files/content?path=%2FUsers%2Fme%2Fdemo.mov')).toBe('demo.mov');
  });
});
