import {
  APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  APPLICATION_IFRAME_CONTRACT_VERSION_V3,
  createApplicationUiReadyEnvelopeV3,
  doesApplicationHostOriginMatch,
  isApplicationHostBootstrapEnvelopeV3,
  isApplicationIframeEnvelopeV3,
  readApplicationIframeLaunchHints,
  type ApplicationBootstrapPayloadV3,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationClient } from "./application-client.js";
import { createApplicationClient } from "./application-client.js";
import { createApplicationBackendMountTransport } from "./create-application-backend-mount-transport.js";
import {
  renderDefaultStartupScreen,
  type HostedApplicationStartupState,
} from "./default-startup-screen.js";

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
  addEventListener: (
    type: "message",
    listener: (event: HostedApplicationMessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    listener: (event: HostedApplicationMessageEvent) => void,
  ) => void;
};

export type HostedApplicationBootstrappedContext = {
  bootstrap: ApplicationBootstrapPayloadV3;
  applicationClient: ApplicationClient;
  rootElement: HostedApplicationRootElement;
};

export type StartHostedApplicationOptions = {
  onBootstrapped: (
    context: HostedApplicationBootstrappedContext,
  ) => void | Promise<void>;
  rootElement: HostedApplicationRootElement | null | undefined;
  window?: HostedApplicationWindowLike | null;
};

export type HostedApplicationStartupHandle = {
  dispose: () => void;
  getState: () => HostedApplicationStartupState;
};

const resolveStartupWindow = (
  override?: HostedApplicationWindowLike | null,
): HostedApplicationWindowLike => {
  if (override) {
    return override;
  }

  const globalWindow = (globalThis as { window?: HostedApplicationWindowLike }).window;
  if (!globalWindow) {
    throw new Error("A browser window is required to start a hosted application.");
  }
  return globalWindow;
};

const resolveRootElement = (
  value: HostedApplicationRootElement | null | undefined,
): HostedApplicationRootElement => {
  if (!value) {
    throw new Error("A hosted application root element is required.");
  }
  return value;
};

const toErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

export const startHostedApplication = (
  options: StartHostedApplicationOptions,
): HostedApplicationStartupHandle => {
  const startupWindow = resolveStartupWindow(options.window);
  const rootElement = resolveRootElement(options.rootElement);
  const launchHints = readApplicationIframeLaunchHints(startupWindow.location.search);

  let state: HostedApplicationStartupState = launchHints
    ? "waiting_for_bootstrap"
    : "unsupported_entry";
  let disposed = false;
  let bootstrapHandled = false;

  const renderState = (errorMessage?: string | null): void => {
    if (disposed || state === "handoff_complete") {
      return;
    }
    renderDefaultStartupScreen({
      rootElement,
      state,
      errorMessage,
    });
  };

  const setState = (
    nextState: HostedApplicationStartupState,
    errorMessage?: string | null,
  ): void => {
    state = nextState;
    renderState(errorMessage);
  };

  const cleanup = (): void => {
    startupWindow.removeEventListener("message", handleMessage);
  };

  const failStartup = (message: string): void => {
    cleanup();
    setState("startup_failed", message);
  };

  const beginStartup = async (bootstrap: ApplicationBootstrapPayloadV3): Promise<void> => {
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
    } catch (error) {
      if (disposed) {
        return;
      }
      setState("startup_failed", toErrorMessage(error));
    }
  };

  const handleMessage = (event: HostedApplicationMessageEvent): void => {
    if (
      disposed
      || bootstrapHandled
      || !launchHints
      || event.source !== startupWindow.parent
      || !doesApplicationHostOriginMatch(launchHints.hostOrigin, event.origin)
    ) {
      return;
    }

    const message = event.data;
    if (!isApplicationIframeEnvelopeV3(message)) {
      return;
    }
    if (message.eventName !== APPLICATION_IFRAME_BOOTSTRAP_EVENT) {
      return;
    }
    if (message.contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V3) {
      bootstrapHandled = true;
      failStartup(
        `Unsupported hosted application bootstrap contract version \"${message.contractVersion}\". Expected \"${APPLICATION_IFRAME_CONTRACT_VERSION_V3}\".`,
      );
      return;
    }
    if (!isApplicationHostBootstrapEnvelopeV3(message)) {
      bootstrapHandled = true;
      failStartup("The hosted application received an invalid bootstrap payload.");
      return;
    }

    const bootstrap = message.payload;
    if (
      bootstrap.application.applicationId !== launchHints.applicationId
      || bootstrap.iframeLaunchId !== launchHints.iframeLaunchId
      || bootstrap.requestContext.applicationId !== launchHints.applicationId
      || bootstrap.host.origin !== launchHints.hostOrigin
    ) {
      bootstrapHandled = true;
      failStartup("The hosted application received bootstrap data for a different iframe launch.");
      return;
    }

    bootstrapHandled = true;
    void beginStartup(bootstrap);
  };

  renderState();

  if (launchHints) {
    startupWindow.addEventListener("message", handleMessage);
    try {
      startupWindow.parent.postMessage(
        createApplicationUiReadyEnvelopeV3({
          applicationId: launchHints.applicationId,
          iframeLaunchId: launchHints.iframeLaunchId,
        }),
        "*",
      );
    } catch (error) {
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
