import {
  isApplicationRuntimeBootstrap,
  validateStandaloneApplicationBootstrapPayload,
  type ApplicationRuntimeBootstrap,
  type StandaloneApplicationBootstrapPayload,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationBootstrapProvider,
  ApplicationStartupWindow,
} from "./application-bootstrap-provider.js";

const BOOTSTRAP_PATH = "/_autobyteus/bootstrap";

const resolveHttpUrl = (origin: string, path: string): string =>
  new URL(path, origin).toString().replace(/\/$/, "");

const resolveWebSocketUrl = (origin: string, path: string | null): string | null => {
  if (path === null) {
    return null;
  }
  const url = new URL(path, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
};

export const normalizeStandaloneBootstrap = (input: {
  payload: StandaloneApplicationBootstrapPayload;
  browserOrigin: string;
}): ApplicationRuntimeBootstrap => {
  const origin = new URL(input.browserOrigin).origin;
  if (origin === "null") {
    throw new Error("Standalone application startup requires an HTTP(S) browser origin.");
  }
  const runtimeBootstrap: ApplicationRuntimeBootstrap = {
    contractVersion: "1",
    application: structuredClone(input.payload.application),
    transport: {
      backendBaseUrl: resolveHttpUrl(origin, input.payload.transportPaths.backendBasePath),
      backendNotificationsUrl: resolveWebSocketUrl(
        origin,
        input.payload.transportPaths.backendNotificationsPath,
      ),
      backendWebSocketBaseUrl: resolveWebSocketUrl(
        origin,
        input.payload.transportPaths.backendWebSocketBasePath,
      ),
      agentCommunicationWebSocketBaseUrl: resolveWebSocketUrl(
        origin,
        input.payload.transportPaths.agentCommunicationWebSocketBasePath,
      ),
    },
  };
  if (!isApplicationRuntimeBootstrap(runtimeBootstrap)) {
    throw new Error("The standalone application bootstrap could not be normalized.");
  }
  return runtimeBootstrap;
};

export class StandaloneSameOriginBootstrapProvider implements ApplicationBootstrapProvider {
  constructor(private readonly startupWindow: ApplicationStartupWindow) {}

  async acquire(signal: AbortSignal): Promise<ApplicationRuntimeBootstrap> {
    const response = await this.startupWindow.fetch(BOOTSTRAP_PATH, {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal,
    });
    if (!response.ok) {
      throw new Error(
        `Standalone application bootstrap failed with HTTP ${response.status}.`,
      );
    }
    const payload = validateStandaloneApplicationBootstrapPayload(await response.json());
    return normalizeStandaloneBootstrap({
      payload,
      browserOrigin: this.startupWindow.location.origin,
    });
  }
}
