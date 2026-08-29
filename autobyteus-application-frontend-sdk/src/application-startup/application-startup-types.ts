import type { ApplicationRuntimeBootstrap } from "@autobyteus/application-sdk-contracts";
import type { ApplicationClient } from "../application-client.js";

export type ApplicationRootElement = HTMLElement;

export type ApplicationBootstrappedContext = {
  runtimeBootstrap: ApplicationRuntimeBootstrap;
  applicationClient: ApplicationClient;
  rootElement: ApplicationRootElement;
};

export type StartApplicationOptions = {
  rootElement: ApplicationRootElement | null | undefined;
  onBootstrapped: (context: ApplicationBootstrappedContext) => void | Promise<void>;
};

export type ApplicationStartupState =
  | "resolving_provider"
  | "acquiring_bootstrap"
  | "starting_application"
  | "handoff_complete"
  | "startup_failed"
  | "disposed";

export type ApplicationStartupHandle = {
  dispose: () => void;
  getState: () => ApplicationStartupState;
};
