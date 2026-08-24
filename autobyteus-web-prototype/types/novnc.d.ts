declare module '@novnc/novnc' {
  interface RfbCredentials {
    username?: string;
    password?: string;
    target?: string;
  }

  interface RfbOptions {
    credentials?: RfbCredentials;
    shared?: boolean;
    repeaterID?: string;
    wsProtocols?: string[];
  }

  export default class RFB extends EventTarget {
    constructor(target: Element, url: string, options?: RfbOptions);

    viewOnly: boolean;
    clipViewport: boolean;
    scaleViewport: boolean;
    resizeSession: boolean;

    disconnect(): void;
    sendCredentials(credentials: RfbCredentials): void;
  }
}
