import type { ApplicationBackendWebSocketTransport } from "./application-backend-websocket-connection.js";
type BrowserWebSocketEventMap = {
    open: unknown;
    message: {
        data?: unknown;
    };
    error: unknown;
    close: {
        code?: number;
        reason?: string;
        wasClean?: boolean;
    };
};
export type ApplicationBackendBrowserWebSocket = {
    binaryType: string;
    send: (data: string | ArrayBuffer | Uint8Array) => void;
    close: (code?: number, reason?: string) => void;
    addEventListener: <T extends keyof BrowserWebSocketEventMap>(type: T, listener: (event: BrowserWebSocketEventMap[T]) => void) => void;
    removeEventListener: <T extends keyof BrowserWebSocketEventMap>(type: T, listener: (event: BrowserWebSocketEventMap[T]) => void) => void;
};
export type ApplicationBackendBrowserWebSocketFactory = (url: string) => ApplicationBackendBrowserWebSocket;
export declare const createApplicationBackendWebSocketTransport: (input: {
    url: string;
    webSocketFactory?: ApplicationBackendBrowserWebSocketFactory;
}) => ApplicationBackendWebSocketTransport;
export {};
//# sourceMappingURL=application-backend-websocket-transport.d.ts.map