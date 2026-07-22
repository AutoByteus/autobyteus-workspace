import type { ApplicationWebSocketFrame } from "./application-sdk-contracts/index.js";
export declare const APPLICATION_BACKEND_WEBSOCKET_FRAME_BYTES_LIMIT: number;
export type ApplicationBackendWebSocketConnectionState = "connecting" | "open" | "closing" | "closed";
export type ApplicationBackendWebSocketCloseEvent = {
    code: number;
    reason: string;
    wasClean: boolean;
};
export type ApplicationBackendWebSocketConnectionErrorCode = "CONNECTION_NOT_READY" | "CONNECTION_CLOSED" | "CONNECTION_ABORTED" | "CONNECTION_REJECTED" | "PROTOCOL_ERROR" | "FRAME_TOO_LARGE" | "BACKPRESSURE_LIMIT" | "BACKEND_UNAVAILABLE" | "TRANSPORT_FAILED" | "SEND_FAILED";
export declare class ApplicationBackendWebSocketConnectionError extends Error {
    readonly code: ApplicationBackendWebSocketConnectionErrorCode;
    readonly recoverable: boolean;
    constructor(code: ApplicationBackendWebSocketConnectionErrorCode);
}
export type ApplicationBackendWebSocketConnectOptions = {
    signal?: AbortSignal;
    query?: Record<string, string | string[]>;
};
export type ApplicationBackendWebSocketConnection = {
    readonly state: ApplicationBackendWebSocketConnectionState;
    readonly ready: Promise<void>;
    send: (frame: ApplicationWebSocketFrame | string | Uint8Array) => Promise<void>;
    onMessage: (listener: (frame: ApplicationWebSocketFrame) => void) => () => void;
    onError: (listener: (error: ApplicationBackendWebSocketConnectionError) => void) => () => void;
    onClose: (listener: (event: ApplicationBackendWebSocketCloseEvent) => void) => () => void;
    close: (code?: number, reason?: string) => void;
};
export type ApplicationBackendWebSocketTransport = {
    send: (frame: ApplicationWebSocketFrame) => void;
    close: (code?: number, reason?: string) => void;
    onMessage: (listener: (frame: ApplicationWebSocketFrame) => void) => () => void;
    onError: (listener: () => void) => () => void;
    onClose: (listener: (event: ApplicationBackendWebSocketCloseEvent) => void) => () => void;
};
export declare const createApplicationBackendWebSocketConnection: (input: {
    transport: ApplicationBackendWebSocketTransport;
    signal?: AbortSignal;
}) => ApplicationBackendWebSocketConnection;
//# sourceMappingURL=application-backend-websocket-connection.d.ts.map