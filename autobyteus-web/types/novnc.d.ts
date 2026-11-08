declare module '@novnc/novnc' {
  interface RfbOptions {
    shared?: boolean;
    repeaterID?: string;
    wsProtocols?: string[];
  }

  export default class RFB extends EventTarget {
    /** A WebSocket URL, or an already created WebSocket that noVNC uses as its channel. */
    constructor(target: Element, urlOrChannel: string | WebSocket, options?: RfbOptions);

    viewOnly: boolean;
    clipViewport: boolean;
    scaleViewport: boolean;
    resizeSession: boolean;

    disconnect(): void;
    /** Sends one key event; `down` omitted sends a press and a release. A no-op while `viewOnly`. */
    sendKey(keysym: number, code: string | null, down?: boolean): void;
    /** Puts text on the remote clipboard (no-op unless connected and not view-only). */
    clipboardPasteFrom(text: string): void;
  }
}
