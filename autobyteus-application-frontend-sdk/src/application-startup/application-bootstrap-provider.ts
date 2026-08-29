import type { ApplicationRuntimeBootstrap } from "@autobyteus/application-sdk-contracts";

export type ApplicationBootstrapProvider = {
  acquire: (signal: AbortSignal) => Promise<ApplicationRuntimeBootstrap>;
};

export type ApplicationMessageEvent = {
  data: unknown;
  origin: string;
  source: unknown;
};

export type ApplicationStartupWindow = {
  location: {
    origin: string;
    protocol: string;
    search: string;
  };
  parent: unknown;
  fetch: typeof fetch;
  postMessage?: (message: unknown, targetOrigin: string) => void;
  addEventListener: (
    type: "message",
    listener: (event: ApplicationMessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    listener: (event: ApplicationMessageEvent) => void,
  ) => void;
};

export const resolveApplicationStartupWindow = (): ApplicationStartupWindow => {
  const startupWindow = (globalThis as { window?: Window }).window;
  if (!startupWindow) {
    throw new Error("A browser window is required to start an application.");
  }
  return startupWindow as unknown as ApplicationStartupWindow;
};
