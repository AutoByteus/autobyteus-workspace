import { type ApplicationIframeLaunchHints } from "@autobyteus/application-sdk-contracts";
import type { ApplicationBootstrapProvider, ApplicationStartupWindow } from "./application-bootstrap-provider.js";
export declare class StudioIframeBootstrapProvider implements ApplicationBootstrapProvider {
    private readonly startupWindow;
    private readonly launchHints;
    constructor(startupWindow: ApplicationStartupWindow, launchHints: ApplicationIframeLaunchHints);
    acquire(signal: AbortSignal): Promise<import("@autobyteus/application-sdk-contracts").ApplicationRuntimeBootstrap>;
}
export declare const createStudioIframeBootstrapProvider: (startupWindow: ApplicationStartupWindow) => StudioIframeBootstrapProvider;
//# sourceMappingURL=studio-iframe-bootstrap-provider.d.ts.map