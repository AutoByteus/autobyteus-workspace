/**
 * The Android app's shell bridge (`window.AutoByteusShell`): an androidx.webkit web-message object the app gives only
 * to the main frame of the open node's origin. The page tells the app it is ready or paired, asks it to show its node
 * list or its scanner, turns the VNC Viewer's desktop full screen (landscape, hidden system bars) on or off, or hands it
 * a PDF or image to save to the phone's Downloads (autobyteus-472); the app's `hello` reply tells the page about this
 * phone and the open node. It carries no credential. In a browser there is no bridge.
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
  /**
   * The node's page is mounted: the app shows the page (or closes its error overlay) only on this message, which
   * WebView's own error page cannot send (autobyteus-433 DS-006).
   */
  pageReady(): void;
  paired(nodeName: string): void;
  showNodeList(): void;
  startScan(): void;
  desktopFullScreen(on: boolean): void;
  /**
   * Saves a file's bytes to the phone's Downloads under `fileName` (autobyteus-472 DS-003): a PDF or an image only,
   * a plain name whose extension matches `mimeType`. The app shows the result ("Saved to Downloads: <name>" or
   * "Couldn't save the file."); there is no reply. An app older than this ignores the message.
   */
  saveFile(file: ShellSaveFile): void;
};

/** A file the page hands the app to save: its bytes as base64, never a URL or a credential. */
export type ShellSaveFile = { fileName: string; mimeType: string; base64: string };

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
    pageReady: () => post({ type: 'pageReady' }),
    paired: (nodeName) => post({ type: 'paired', nodeName }),
    showNodeList: () => post({ type: 'showNodeList' }),
    startScan: () => post({ type: 'startScan' }),
    desktopFullScreen: (on) => post({ type: 'desktopFullScreen', on }),
    saveFile: ({ fileName, mimeType, base64 }) => post({ type: 'saveFile', fileName, mimeType, base64 }),
  };
};
