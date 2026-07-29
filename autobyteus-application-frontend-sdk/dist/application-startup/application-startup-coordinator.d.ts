import type { ApplicationBootstrapProvider, ApplicationStartupWindow } from "./application-bootstrap-provider.js";
import type { ApplicationStartupHandle, StartApplicationOptions } from "./application-startup-types.js";
import { renderDefaultApplicationStartupScreen } from "./default-application-startup-screen.js";
type ApplicationStartupCoordinatorDependencies = {
    startupWindow?: ApplicationStartupWindow;
    provider?: ApplicationBootstrapProvider;
    render?: typeof renderDefaultApplicationStartupScreen;
};
export declare const startApplicationWithDependencies: (options: StartApplicationOptions, dependencies?: ApplicationStartupCoordinatorDependencies) => ApplicationStartupHandle;
export declare const startApplication: (options: StartApplicationOptions) => ApplicationStartupHandle;
export {};
//# sourceMappingURL=application-startup-coordinator.d.ts.map