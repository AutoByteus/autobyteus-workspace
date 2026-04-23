import { APPLICATION_IFRAME_BOOTSTRAP_EVENT, APPLICATION_IFRAME_CONTRACT_VERSION_V2, createApplicationUiReadyEnvelopeV2, doesApplicationHostOriginMatch, isApplicationHostBootstrapEnvelopeV2, isApplicationIframeEnvelopeV2, readApplicationIframeLaunchHints, } from "./application-sdk-contracts/index.js";
import { createApplicationClient } from "./application-client.js";
import { createApplicationBackendMountTransport } from "./create-application-backend-mount-transport.js";
import { renderDefaultStartupScreen, } from "./default-startup-screen.js";
const resolveStartupWindow = (override) => {
    if (override) {
        return override;
    }
    const globalWindow = globalThis.window;
    if (!globalWindow) {
        throw new Error("A browser window is required to start a hosted application.");
    }
    return globalWindow;
};
const resolveRootElement = (value) => {
    if (!value) {
        throw new Error("A hosted application root element is required.");
    }
    return value;
};
const toErrorMessage = (error) => (error instanceof Error ? error.message : String(error));
export const startHostedApplication = (options) => {
    const startupWindow = resolveStartupWindow(options.window);
    const rootElement = resolveRootElement(options.rootElement);
    const launchHints = readApplicationIframeLaunchHints(startupWindow.location.search);
    let state = launchHints
        ? "waiting_for_bootstrap"
        : "unsupported_entry";
    let disposed = false;
    let bootstrapHandled = false;
    const renderState = (errorMessage) => {
        if (disposed || state === "handoff_complete") {
            return;
        }
        renderDefaultStartupScreen({
            rootElement,
            state,
            errorMessage,
        });
    };
    const setState = (nextState, errorMessage) => {
        state = nextState;
        renderState(errorMessage);
    };
    const cleanup = () => {
        startupWindow.removeEventListener("message", handleMessage);
    };
    const failStartup = (message) => {
        cleanup();
        setState("startup_failed", message);
    };
    const beginStartup = async (bootstrap) => {
        cleanup();
        setState("starting_app");
        try {
            const backendBaseUrl = bootstrap.transport.backendBaseUrl?.trim();
            if (!backendBaseUrl) {
                throw new Error("The hosted application bootstrap payload is missing transport.backendBaseUrl.");
            }
            const applicationClient = createApplicationClient({
                applicationId: bootstrap.application.applicationId,
                requestContext: bootstrap.requestContext,
                transport: createApplicationBackendMountTransport({
                    backendBaseUrl,
                    backendNotificationsUrl: bootstrap.transport.backendNotificationsUrl,
                }),
            });
            await Promise.resolve(options.onBootstrapped({
                bootstrap,
                applicationClient,
                rootElement,
            }));
            if (disposed) {
                return;
            }
            state = "handoff_complete";
        }
        catch (error) {
            if (disposed) {
                return;
            }
            setState("startup_failed", toErrorMessage(error));
        }
    };
    const handleMessage = (event) => {
        if (disposed
            || bootstrapHandled
            || !launchHints
            || event.source !== startupWindow.parent
            || !doesApplicationHostOriginMatch(launchHints.hostOrigin, event.origin)) {
            return;
        }
        const message = event.data;
        if (!isApplicationIframeEnvelopeV2(message)) {
            return;
        }
        if (message.eventName !== APPLICATION_IFRAME_BOOTSTRAP_EVENT) {
            return;
        }
        if (message.contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V2) {
            bootstrapHandled = true;
            failStartup(`Unsupported hosted application bootstrap contract version \"${message.contractVersion}\". Expected \"${APPLICATION_IFRAME_CONTRACT_VERSION_V2}\".`);
            return;
        }
        if (!isApplicationHostBootstrapEnvelopeV2(message)) {
            bootstrapHandled = true;
            failStartup("The hosted application received an invalid bootstrap payload.");
            return;
        }
        const bootstrap = message.payload;
        if (bootstrap.application.applicationId !== launchHints.applicationId
            || bootstrap.launch.launchInstanceId !== launchHints.launchInstanceId
            || bootstrap.requestContext.applicationId !== launchHints.applicationId
            || bootstrap.requestContext.launchInstanceId !== launchHints.launchInstanceId
            || bootstrap.host.origin !== launchHints.hostOrigin) {
            bootstrapHandled = true;
            failStartup("The hosted application received bootstrap data for a different launch instance.");
            return;
        }
        bootstrapHandled = true;
        void beginStartup(bootstrap);
    };
    renderState();
    if (launchHints) {
        startupWindow.addEventListener("message", handleMessage);
        try {
            startupWindow.parent.postMessage(createApplicationUiReadyEnvelopeV2({
                applicationId: launchHints.applicationId,
                launchInstanceId: launchHints.launchInstanceId,
            }), "*");
        }
        catch (error) {
            bootstrapHandled = true;
            failStartup(toErrorMessage(error));
        }
    }
    return {
        dispose: () => {
            if (disposed) {
                return;
            }
            disposed = true;
            cleanup();
        },
        getState: () => state,
    };
};
//# sourceMappingURL=hosted-application-startup.js.map