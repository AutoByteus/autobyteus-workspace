import { resolveStreamingContentFlushIntervalMs } from "../../../config/streaming-content-flush-interval-setting.js";
import type {
  AgentStreamEgressControlComposition,
  AgentStreamEgressControlExtensions,
} from "./agent-stream-egress-control.js";
import { AgentStatusTransitionFilter } from "./agent-status-transition-filter.js";
import { AgentStreamContentCadenceScheduler } from "./agent-stream-content-cadence-scheduler.js";

export type AgentStreamEgressCompositionOptions = {
  readIntervalMs?: () => number;
  onScheduledError?: (error: unknown) => void;
  extensions?: AgentStreamEgressControlExtensions;
};

export const createDefaultAgentStreamEgressControlComposition = (
  options: AgentStreamEgressCompositionOptions = {},
): AgentStreamEgressControlComposition => ({
  filters: [
    new AgentStatusTransitionFilter(),
    ...(options.extensions?.filterFactories ?? []).map((factory) => factory()),
  ],
  scheduler: new AgentStreamContentCadenceScheduler({
    readIntervalMs: options.readIntervalMs ?? resolveStreamingContentFlushIntervalMs,
    onScheduledError: options.onScheduledError ?? (() => undefined),
  }),
  observers: (options.extensions?.observerFactories ?? []).map((factory) => factory()),
});
