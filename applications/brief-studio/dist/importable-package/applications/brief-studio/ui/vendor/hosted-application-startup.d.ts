import { type ApplicationBootstrapPayloadV3 } from "./application-sdk-contracts/index.js";
import type { ApplicationClient } from "./application-client.js";
import { type HostedApplicationStartupState } from "./default-startup-screen.js";
export type HostedApplicationRootElement = HTMLElement;
type HostedApplicationMessageEvent = {
    data: unknown;
    origin: string;
    source: unknown;
};
type HostedApplicationWindowLike = {
    location: {
        search: string;
    };
    parent: {
        postMessage: (message: unknown, targetOrigin: string) => void;
    };
    addEventListener: (type: "message", listener: (event: HostedApplicationMessageEvent) => void) => void;
    removeEventListener: (type: "message", listener: (event: HostedApplicationMessageEvent) => void) => void;
};
export type HostedApplicationBootstrappedContext = {
    bootstrap: ApplicationBootstrapPayloadV3;
    applicationClient: ApplicationClient;
    rootElement: HostedApplicationRootElement;
};
export type StartHostedApplicationOptions = {
    onBootstrapped: (context: HostedApplicationBootstrappedContext) => void | Promise<void>;
    rootElement: HostedApplicationRootElement | null | undefined;
    window?: HostedApplicationWindowLike | null;
};
export type HostedApplicationStartupHandle = {
    dispose: () => void;
    getState: () => HostedApplicationStartupState;
};
export declare const startHostedApplication: (options: StartHostedApplicationOptions) => HostedApplicationStartupHandle;
export {};
//# sourceMappingURL=hosted-application-startup.d.ts.map