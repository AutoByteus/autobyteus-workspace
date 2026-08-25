import { createApplicationClient } from "../application-client.js";
import { createApplicationBackendMountTransport } from "../create-application-backend-mount-transport.js";
import type {
  ApplicationBootstrapProvider,
  ApplicationStartupWindow,
} from "./application-bootstrap-provider.js";
import { resolveApplicationStartupWindow } from "./application-bootstrap-provider.js";
import type {
  ApplicationStartupHandle,
  ApplicationStartupState,
  StartApplicationOptions,
} from "./application-startup-types.js";
import { renderDefaultApplicationStartupScreen } from "./default-application-startup-screen.js";
import { resolveApplicationBootstrapProvider } from "./resolve-application-bootstrap-provider.js";

type ApplicationStartupCoordinatorDependencies = {
  startupWindow?: ApplicationStartupWindow;
  provider?: ApplicationBootstrapProvider;
  render?: typeof renderDefaultApplicationStartupScreen;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const startApplicationWithDependencies = (
  options: StartApplicationOptions,
  dependencies: ApplicationStartupCoordinatorDependencies = {},
): ApplicationStartupHandle => {
  if (!options.rootElement) {
    throw new Error("An application root element is required.");
  }

  const rootElement = options.rootElement;
  const abortController = new AbortController();
  const render = dependencies.render ?? renderDefaultApplicationStartupScreen;
  let state: ApplicationStartupState = "resolving_provider";
  let disposed = false;

  const setState = (
    nextState: ApplicationStartupState,
    errorMessage?: string,
  ): void => {
    if (disposed) {
      return;
    }
    state = nextState;
    render({ rootElement, state, errorMessage });
  };

  const run = async (): Promise<void> => {
    try {
      const provider = dependencies.provider
        ?? resolveApplicationBootstrapProvider(
          dependencies.startupWindow ?? resolveApplicationStartupWindow(),
        );
      setState("acquiring_bootstrap");
      const runtimeBootstrap = await provider.acquire(abortController.signal);
      if (disposed) {
        return;
      }
      setState("starting_application");

      const applicationClient = createApplicationClient({
        applicationId: runtimeBootstrap.application.applicationId,
        transport: createApplicationBackendMountTransport({
          backendBaseUrl: runtimeBootstrap.transport.backendBaseUrl,
          backendNotificationsUrl: runtimeBootstrap.transport.backendNotificationsUrl,
          backendWebSocketBaseUrl: runtimeBootstrap.transport.backendWebSocketBaseUrl,
          agentCommunicationWebSocketBaseUrl:
            runtimeBootstrap.transport.agentCommunicationWebSocketBaseUrl,
        }),
      });
      await Promise.resolve(options.onBootstrapped({
        runtimeBootstrap,
        applicationClient,
        rootElement,
      }));
      if (!disposed) {
        state = "handoff_complete";
      }
    } catch (error) {
      if (!disposed) {
        setState("startup_failed", toErrorMessage(error));
      }
    }
  };

  render({ rootElement, state });
  void run();

  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      state = "disposed";
      abortController.abort();
    },
    getState: () => state,
  };
};

export const startApplication = (
  options: StartApplicationOptions,
): ApplicationStartupHandle => startApplicationWithDependencies(options);
