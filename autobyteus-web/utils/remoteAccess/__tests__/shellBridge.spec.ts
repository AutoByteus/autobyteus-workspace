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
});
