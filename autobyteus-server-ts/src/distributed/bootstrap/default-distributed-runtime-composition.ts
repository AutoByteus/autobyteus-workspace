import { TeamEventAggregator } from "../event-aggregation/team-event-aggregator.js";
import { projectRemoteExecutionEventsFromTeamEvent } from "../event-aggregation/remote-event-projection.js";
import { TeamCommandIngressService } from "../ingress/team-command-ingress-service.js";
import {
  dispatchInterAgentMessageViaTeamManager,
  dispatchWithWorkerLocalRoutingPort,
} from "../routing/worker-local-dispatch.js";
import {
  createDistributedRuntimeComposition,
  ensureNodeDirectoryEntryForHostUplink,
  normalizeDistributedBaseUrl,
  type DefaultDistributedRuntimeComposition,
} from "./distributed-runtime-composition-factory.js";
import { resolveBoundRuntimeTeamFromRegistries } from "./runtime-team-resolution.js";

export {
  normalizeDistributedBaseUrl,
  ensureNodeDirectoryEntryForHostUplink,
  dispatchWithWorkerLocalRoutingPort,
  dispatchInterAgentMessageViaTeamManager,
  resolveBoundRuntimeTeamFromRegistries,
  projectRemoteExecutionEventsFromTeamEvent,
};

let cachedDefaultDistributedRuntimeComposition: DefaultDistributedRuntimeComposition | null = null;

export const createDefaultDistributedRuntimeComposition = (): DefaultDistributedRuntimeComposition =>
  createDistributedRuntimeComposition();

export const getDefaultDistributedRuntimeComposition = (): DefaultDistributedRuntimeComposition => {
  if (!cachedDefaultDistributedRuntimeComposition) {
    cachedDefaultDistributedRuntimeComposition = createDefaultDistributedRuntimeComposition();
  }
  return cachedDefaultDistributedRuntimeComposition;
};

export const getDefaultTeamCommandIngressService = (): TeamCommandIngressService =>
  getDefaultDistributedRuntimeComposition().teamCommandIngressService;

export const getDefaultTeamEventAggregator = (): TeamEventAggregator =>
  getDefaultDistributedRuntimeComposition().teamEventAggregator;

export const resetDefaultDistributedRuntimeCompositionForTests = (): void => {
  cachedDefaultDistributedRuntimeComposition = null;
};
