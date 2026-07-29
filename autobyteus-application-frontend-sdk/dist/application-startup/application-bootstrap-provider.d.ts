import type { ApplicationRuntimeBootstrap } from "@autobyteus/application-sdk-contracts";
export type ApplicationBootstrapProvider = {
    acquire: (signal: AbortSignal) => Promise<ApplicationRuntimeBootstrap>;
};
export type ApplicationMessageEvent = {
    data: unknown;
    origin: string;
    source: unknown;
};
export type ApplicationStartupWindow = {
    location: {
        origin: string;
        protocol: string;
        search: string;
    };
    parent: unknown;
    fetch: typeof fetch;
    postMessage?: (message: unknown, targetOrigin: string) => void;
    addEventListener: (type: "message", listener: (event: ApplicationMessageEvent) => void) => void;
    removeEventListener: (type: "message", listener: (event: ApplicationMessageEvent) => void) => void;
};
export declare const resolveApplicationStartupWindow: () => ApplicationStartupWindow;
//# sourceMappingURL=application-bootstrap-provider.d.ts.map