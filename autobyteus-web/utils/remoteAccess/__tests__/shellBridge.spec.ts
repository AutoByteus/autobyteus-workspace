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

  // autobyteus-642 D-2: the app's hello names the file types its own player plays, per kind; an app without one says
  // nothing (null), and a malformed answer counts as none.
  const IOS_PLAYER = { video: ['mp4', 'm4v', 'mov'], audio: ['mp3', 'm4a', 'aac', 'wav', 'aif', 'aiff', 'caf'] };
  it.each([
    [{ mediaPlayer: IOS_PLAYER }, IOS_PLAYER],
    [{ mediaPlayer: { video: [], audio: ['mp3'] } }, { video: [], audio: ['mp3'] }],
    [{}, null],
    [{ mediaPlayer: true }, null],
    [{ mediaPlayer: { video: ['mp4'] } }, null],
    [{ mediaPlayer: { video: ['mp4'], audio: [3] } }, null],
    [{ videoPlayer: true }, null],
  ])('reads %j from the app\'s hello as mediaPlayer %j', async (extra, expected) => {
    const listeners: Array<(event: { data: unknown }) => void> = [];
    (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
      postMessage: () => queueMicrotask(() => listeners.forEach((listener) => listener({
        data: JSON.stringify({ type: 'shell', nodeCount: 2, deviceName: 'Pixel 8', nodeName: 'MacBook', ...extra }),
      }))),
      addEventListener: (_type: string, listener: (event: { data: unknown }) => void) => listeners.push(listener),
      removeEventListener: () => undefined,
    };
    expect((await getShellBridge()!.hello())?.mediaPlayer).toEqual(expected);
  });

  it.each(['video', 'audio'] as const)('hands a %s file to the app in one playMedia message: its kind, URL, title and the credential, nothing else', (kind) => {
    const posted: unknown[] = [];
    (window as unknown as { AutoByteusShell: unknown }).AutoByteusShell = {
      postMessage: (message: string) => posted.push(JSON.parse(message)),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    const url = 'http://192.168.1.20:29695/rest/workspaces/w/content?path=notes%2Fmemo.m4a';
    getShellBridge()!.playMedia({ kind, url, title: 'memo.m4a', credential: 'mra_x' });
    expect(posted).toEqual([{ type: 'playMedia', kind, url, title: 'memo.m4a', credential: 'mra_x' }]);
  });
});
