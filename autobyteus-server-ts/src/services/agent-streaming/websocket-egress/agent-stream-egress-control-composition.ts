import { resolveStreamingContentFlushIntervalMs } from "../../../config/streaming-content-flush-interval-setting.js";
import type {
  AgentStreamEgressControlComposition,
  AgentStreamEgressControlExtensions,
  StreamEgressMessage,
} from "./agent-stream-egress-control.js";
import { AgentStatusTransitionFilter } from "./agent-status-transition-filter.js";
import { AgentStreamContentCadenceScheduler } from "./agent-stream-content-cadence-scheduler.js";

export type AgentStreamEgressCompositionOptions = {
  readIntervalMs?: () => number;
  onScheduledError?: (error: unknown) => void;
  extensions?: AgentStreamEgressControlExtensions;
};

export const createDefaultAgentStreamEgressControlComposition = <
  M extends StreamEgressMessage = StreamEgressMessage,
>(
  options: AgentStreamEgressCompositionOptions = {},
): AgentStreamEgressControlComposition<M> => ({
  filters: [
    new AgentStatusTransitionFilter(),
    ...(options.extensions?.filterFactories ?? []).map((factory) => factory()),
  ],
  scheduler: new AgentStreamContentCadenceScheduler<M>({
    readIntervalMs: options.readIntervalMs ?? resolveStreamingContentFlushIntervalMs,
    onScheduledError: options.onScheduledError ?? (() => undefined),
  }),
  observers: (options.extensions?.observerFactories ?? []).map((factory) => factory()),
});
