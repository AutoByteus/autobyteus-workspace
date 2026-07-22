export declare class ApplicationWebSocketUrlError extends Error {
    readonly code: "INVALID_BASE" | "INVALID_PATH";
    constructor(code: "INVALID_BASE" | "INVALID_PATH", message: string);
}
export declare const parseApplicationWebSocketPath: (path: string) => string[];
export declare const composeApplicationWebSocketUrl: (input: {
    baseUrl: string;
    pathSegments: string[];
    query?: Record<string, string | string[]>;
}) => string;
//# sourceMappingURL=application-websocket-url.d.ts.map