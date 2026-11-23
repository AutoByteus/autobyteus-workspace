import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
export type RunModelSelection = Readonly<{
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;
/**
 * How a stopped record's save continues the run (autobyteus-53): `same_session` keeps the session the run last ran on
 * (an undo, a re-edit, or a plain model-only edit); `hand_over` makes (or keeps) a pending switch that the next input
 * turns into a fresh session with the hand-over notice. One decision owner: `RunModelSelectionService`.
 */
export type RunContinuation = "same_session" | "hand_over";
/**
 * Whether a stopped record can make a pending switch at all (autobyteus-53): `available` (it can, so a capacity
 * mismatch hands over instead of being refused), `unavailable` (it can't switch its agent runtime at all, so a native
 * capacity mismatch is still refused), or `no_session` (nothing is running to continue — a launch default or a never-
 * started run — so any offered model is accepted directly).
 */
export type RunHandOver = "available" | "unavailable" | "no_session";
export type RunModelSelectionContext = Readonly<{
  runtimeKind: RuntimeKind;
  currentModelIdentifier: string;
  workspaceRootPath: string;
  handOver: RunHandOver;
}>;
/** Where a selection is validated; `currentModelIdentifier` is `null` for a fresh selection of an agent runtime the run did not last run on. */
export type RunModelValidationContext = Readonly<Omit<RunModelSelectionContext, "currentModelIdentifier"> & {
  currentModelIdentifier: string | null;
}>;
export type RunModelChoice = Readonly<{
  llmModelIdentifier: string;
  providerName: string;
  displayName: string;
  canonicalName: string;
  description: string | null;
  configSchema: Record<string, unknown> | null;
  recommended: boolean;
}>;
/**
 * One scope's options answer. `modelListReadable` is false only when the runtime's model list could not be read: the options
 * are then empty and not authoritative, and `unavailableReason` holds the owner's text. `unavailableReason` is also set for a
 * readable answer whose context capacity is unverified, so callers decide read-vs-unread from `modelListReadable` alone.
 */
export type RunModelOptions = Readonly<{
  currentModelIdentifier: string;
  modelListReadable: boolean;
  currentModel: RunModelChoice | null;
  replacements: readonly RunModelChoice[];
  unavailableReason: string | null;
}>;
