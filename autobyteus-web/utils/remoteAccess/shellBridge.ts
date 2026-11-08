/**
 * The Android app's shell bridge (`window.AutoByteusShell`): an androidx.webkit web-message object the app gives only
 * to the main frame of the open node's origin. The page tells the app it paired, or asks it to show its node list or
 * its scanner; the app's `hello` reply tells the page about this phone and the open node. It carries no credential.
 * In a browser there is no bridge.
 */
export type ShellHello = {
  /** Saved nodes on this phone, for "N nodes on this phone". */
  nodeCount: number;
  /** The phone's model name, used as the paired device's name. */
  deviceName: string;
  /** The app's name for the open node, as its first page shows it; `''` when the app has none (autobyteus-433). */
  nodeName: string;
};

export type ShellBridge = {
  hello(): Promise<ShellHello | null>;
  paired(nodeName: string): void;
  showNodeList(): void;
  startScan(): void;
};

type ShellMessageEvent = { data: unknown };
type ShellWebMessageObject = {
  postMessage(message: string): void;
  addEventListener(type: 'message', listener: (event: ShellMessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: ShellMessageEvent) => void): void;
};

const HELLO_TIMEOUT_MS = 1500;

const readShellObject = (): ShellWebMessageObject | null => {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { AutoByteusShell?: Partial<ShellWebMessageObject> }).AutoByteusShell;
  return candidate && typeof candidate.postMessage === 'function' && typeof candidate.addEventListener === 'function'
    ? candidate as ShellWebMessageObject
    : null;
};

const parseHello = (data: unknown): ShellHello | null => {
  try {
    const message = JSON.parse(String(data)) as { type?: string; nodeCount?: unknown; deviceName?: unknown; nodeName?: unknown };
    if (message.type !== 'shell') return null;
    return {
      nodeCount: typeof message.nodeCount === 'number' ? message.nodeCount : 0,
      deviceName: typeof message.deviceName === 'string' ? message.deviceName : '',
      nodeName: typeof message.nodeName === 'string' ? message.nodeName : '',
    };
  } catch {
    return null;
  }
};

/** The bridge when the page runs in the Android app; `null` in a browser. */
export const getShellBridge = (): ShellBridge | null => {
  const shell = readShellObject();
  if (!shell) return null;
  const post = (message: Record<string, unknown>): void => shell.postMessage(JSON.stringify(message));
  return {
    hello: () => new Promise((resolve) => {
      const onMessage = (event: ShellMessageEvent): void => {
        const hello = parseHello(event.data);
        if (!hello) return;
        clearTimeout(timer);
        shell.removeEventListener('message', onMessage);
        resolve(hello);
      };
      const timer = setTimeout(() => {
        shell.removeEventListener('message', onMessage);
        resolve(null);
      }, HELLO_TIMEOUT_MS);
      shell.addEventListener('message', onMessage);
      post({ type: 'hello' });
    }),
    paired: (nodeName) => post({ type: 'paired', nodeName }),
    showNodeList: () => post({ type: 'showNodeList' }),
    startScan: () => post({ type: 'startScan' }),
  };
};
