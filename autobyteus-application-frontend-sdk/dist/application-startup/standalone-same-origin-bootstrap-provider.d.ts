import { type ApplicationRuntimeBootstrap, type StandaloneApplicationBootstrapPayload } from "@autobyteus/application-sdk-contracts";
import type { ApplicationBootstrapProvider, ApplicationStartupWindow } from "./application-bootstrap-provider.js";
export declare const normalizeStandaloneBootstrap: (input: {
    payload: StandaloneApplicationBootstrapPayload;
    browserOrigin: string;
}) => ApplicationRuntimeBootstrap;
export declare class StandaloneSameOriginBootstrapProvider implements ApplicationBootstrapProvider {
    private readonly startupWindow;
    constructor(startupWindow: ApplicationStartupWindow);
    acquire(signal: AbortSignal): Promise<ApplicationRuntimeBootstrap>;
}
//# sourceMappingURL=standalone-same-origin-bootstrap-provider.d.ts.map