// The phone app's shell bridge (autobyteus-279): Leave demo is one message to the app; a browser has no bridge.
import { afterEach, describe, expect, it } from 'vitest';
import { getShellBridge } from '../shellBridge';

afterEach(() => { delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell; });

describe('the shell bridge', () => {
  it('is absent in a browser', () => {
    expect(getShellBridge()).toBeNull();
  });

  it('asks the app to leave the demo with one leaveDemo message, carrying nothing else', () => {
    const posted: unknown[] = [];
    (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
      postMessage: (message: string) => posted.push(JSON.parse(message)),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    getShellBridge()!.leaveDemo();
    expect(posted).toEqual([{ type: 'leaveDemo' }]);
  });

  // autobyteus-574 D-2: the app's hello says whether it has its own video player; an older app says nothing (false).
  it.each([
    [{ videoPlayer: true }, true],
    [{}, false],
    [{ videoPlayer: 'yes' }, false],
  ])('reads videoPlayer %j from the app\'s hello as %s', async (extra, expected) => {
    const listeners: Array<(event: { data: unknown }) => void> = [];
    (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
      postMessage: () => queueMicrotask(() => listeners.forEach((listener) => listener({
        data: JSON.stringify({ type: 'shell', nodeCount: 2, deviceName: 'Pixel 8', nodeName: 'MacBook', ...extra }),
      }))),
      addEventListener: (_type: string, listener: (event: { data: unknown }) => void) => listeners.push(listener),
      removeEventListener: () => undefined,
    };
    expect((await getShellBridge()!.hello())?.videoPlayer).toBe(expected);
  });

  it('hands a video to the app in one playVideo message: its URL, title and the credential, nothing else', () => {
    const posted: unknown[] = [];
    (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
      postMessage: (message: string) => posted.push(JSON.parse(message)),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    getShellBridge()!.playVideo({ url: 'http://192.168.1.20:29695/rest/workspaces/w/content?path=a.mp4', title: 'a.mp4', credential: 'mra_x' });
    expect(posted).toEqual([{ type: 'playVideo', url: 'http://192.168.1.20:29695/rest/workspaces/w/content?path=a.mp4', title: 'a.mp4', credential: 'mra_x' }]);
  });
});
