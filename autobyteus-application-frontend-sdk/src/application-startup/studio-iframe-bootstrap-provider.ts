import {
  APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  APPLICATION_IFRAME_CONTRACT_VERSION,
  createApplicationUiReadyEnvelope,
  doesApplicationHostOriginMatch,
  isApplicationHostBootstrapEnvelope,
  isApplicationIframeEnvelope,
  normalizeStudioIframeBootstrap,
  readApplicationIframeLaunchHints,
  type ApplicationIframeLaunchHints,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationBootstrapProvider,
  ApplicationMessageEvent,
  ApplicationStartupWindow,
} from "./application-bootstrap-provider.js";

export class StudioIframeBootstrapProvider implements ApplicationBootstrapProvider {
  constructor(
    private readonly startupWindow: ApplicationStartupWindow,
    private readonly launchHints: ApplicationIframeLaunchHints,
  ) {}

  acquire(signal: AbortSignal) {
    return new Promise<ReturnType<typeof normalizeStudioIframeBootstrap>>((resolve, reject) => {
      let settled = false;

      const cleanup = (): void => {
        this.startupWindow.removeEventListener("message", handleMessage);
        signal.removeEventListener("abort", handleAbort);
      };
      const fail = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };
      const succeed = (
        runtimeBootstrap: ReturnType<typeof normalizeStudioIframeBootstrap>,
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(runtimeBootstrap);
      };
      const handleAbort = (): void => {
        fail(new DOMException("Application startup was disposed.", "AbortError"));
      };
      const handleMessage = (event: ApplicationMessageEvent): void => {
        if (
          event.source !== this.startupWindow.parent
          || !doesApplicationHostOriginMatch(this.launchHints.hostOrigin, event.origin)
        ) {
          return;
        }
        if (!isApplicationIframeEnvelope(event.data)) {
          return;
        }
        if (event.data.eventName !== APPLICATION_IFRAME_BOOTSTRAP_EVENT) {
          return;
        }
        if (event.data.contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION) {
          fail(new Error(
            `Unsupported Studio application bootstrap contract version "${event.data.contractVersion}". `
            + `Expected "${APPLICATION_IFRAME_CONTRACT_VERSION}".`,
          ));
          return;
        }
        if (!isApplicationHostBootstrapEnvelope(event.data)) {
          fail(new Error("The Studio application received an invalid bootstrap payload."));
          return;
        }

        const payload = event.data.payload;
        if (
          payload.application.applicationId !== this.launchHints.applicationId
          || payload.iframeLaunchId !== this.launchHints.iframeLaunchId
          || payload.requestContext.applicationId !== this.launchHints.applicationId
          || payload.host.origin !== this.launchHints.hostOrigin
        ) {
          fail(new Error("The Studio application received bootstrap data for a different iframe launch."));
          return;
        }

        try {
          succeed(normalizeStudioIframeBootstrap(payload));
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      };

      if (signal.aborted) {
        handleAbort();
        return;
      }
      this.startupWindow.addEventListener("message", handleMessage);
      signal.addEventListener("abort", handleAbort, { once: true });
      try {
        const parentWindow = this.startupWindow.parent as {
          postMessage?: (message: unknown, targetOrigin: string) => void;
        };
        if (typeof parentWindow.postMessage !== "function") {
          throw new Error("The Studio application parent window cannot receive readiness messages.");
        }
        parentWindow.postMessage(
          createApplicationUiReadyEnvelope({
            applicationId: this.launchHints.applicationId,
            iframeLaunchId: this.launchHints.iframeLaunchId,
          }),
          "*",
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}

export const createStudioIframeBootstrapProvider = (
  startupWindow: ApplicationStartupWindow,
): StudioIframeBootstrapProvider => {
  const launchHints = readApplicationIframeLaunchHints(startupWindow.location.search);
  if (!launchHints) {
    throw new Error("The embedded Studio application launch context is invalid or incomplete.");
  }
  return new StudioIframeBootstrapProvider(startupWindow, launchHints);
};
