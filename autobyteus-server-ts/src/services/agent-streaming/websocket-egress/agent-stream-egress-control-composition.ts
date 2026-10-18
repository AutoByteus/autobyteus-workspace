import { resolveStreamingContentFlushIntervalMs } from "../../../config/streaming-content-flush-interval-setting.js";
import type {
  AgentStreamEgressControlComposition,
  AgentStreamEgressControlExtensions,
  StreamEgressMessage,
} from "./agent-stream-egress-control.js";
import { AgentStatusTransitionFilter } from "./agent-status-transition-filter.js";
import { AgentStreamContentCadenceScheduler } from "./agent-stream-content-cadence-scheduler.js";
import { SequencedContentCadenceScheduler } from "./sequenced-content-cadence-scheduler.js";
import type { SequencedStreamShape } from "./sequenced-stream-shape.js";

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

/**
 * Composition for a sequenced stream (Team, Org, delegated agents). It has no filters: suppressing a
 * sequenced message would leave its sequence uncovered, so repeats are absorbed into a batch range
 * by the scheduler instead.
 */
export const createSequencedStreamEgressControlComposition = <M extends StreamEgressMessage, I>(
  shape: SequencedStreamShape<M, I>,
  options: AgentStreamEgressCompositionOptions = {},
): AgentStreamEgressControlComposition<M> => {
  if (options.extensions?.filterFactories?.length) {
    throw new Error("A sequenced stream egress cannot take filters: a suppressed message would leave a sequence gap.");
  }
  return {
    filters: [],
    scheduler: new SequencedContentCadenceScheduler(shape, {
      readIntervalMs: options.readIntervalMs ?? resolveStreamingContentFlushIntervalMs,
      onScheduledError: options.onScheduledError ?? (() => undefined),
    }),
    observers: (options.extensions?.observerFactories ?? []).map((factory) => factory()),
  };
};
