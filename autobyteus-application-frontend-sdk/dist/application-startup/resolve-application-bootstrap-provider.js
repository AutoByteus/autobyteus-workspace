import { readApplicationIframeLaunchHints } from "@autobyteus/application-sdk-contracts";
import { StandaloneSameOriginBootstrapProvider } from "./standalone-same-origin-bootstrap-provider.js";
import { StudioIframeBootstrapProvider, createStudioIframeBootstrapProvider, } from "./studio-iframe-bootstrap-provider.js";
export const resolveApplicationBootstrapProvider = (startupWindow) => {
    const embedded = startupWindow.parent !== startupWindow;
    const launchHints = readApplicationIframeLaunchHints(startupWindow.location.search);
    if (embedded) {
        return launchHints
            ? new StudioIframeBootstrapProvider(startupWindow, launchHints)
            : createStudioIframeBootstrapProvider(startupWindow);
    }
    if (launchHints) {
        throw new Error("Studio iframe launch hints are not valid in a top-level application document.");
    }
    if (startupWindow.location.protocol !== "http:" && startupWindow.location.protocol !== "https:") {
        throw new Error("Standalone applications require a top-level HTTP(S) document.");
    }
    return new StandaloneSameOriginBootstrapProvider(startupWindow);
};
//# sourceMappingURL=resolve-application-bootstrap-provider.js.map