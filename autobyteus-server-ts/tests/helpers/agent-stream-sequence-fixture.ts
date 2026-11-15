import { isAgentRunEvent } from "../../src/agent-execution/domain/agent-run-event.js";
import { AgentStreamSequence } from "../../src/services/agent-streaming/agent-stream-sequence.js";
import { getAgentRunEventMessageMapper } from "../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { buildRunProjectionBundle } from "../../src/run-history/projection/run-projection-utils.js";
import type { RunProjection } from "../../src/run-history/projection/run-projection-types.js";

type StreamedRun = { runId: string; subscribeToEvents(listener: (event: unknown) => void): () => void };

/**
 * Agent stream sequences for a stream handler under test (autobyteus-461 SR-087): each run the lookup returns gets its
 * own sequence, attached to its events the first time it is asked for (in the app, its resources attach it when it
 * activates), and a stored read for the snapshot (empty unless given).
 */
export const lazyAgentStreamSequences = (
  runOf: (runId: string) => StreamedRun | null | undefined,
  stored: (runId: string) => RunProjection = (runId) => buildRunProjectionBundle(runId, [], []),
) => {
  const attached = new WeakMap<object, AgentStreamSequence>();
  const mapper = getAgentRunEventMessageMapper();
  return {
    sequences: {
      of: (runId: string): AgentStreamSequence | null => {
        const run = runOf(runId);
        if (!run) return null;
        let sequence = attached.get(run);
        if (!sequence) {
          sequence = new AgentStreamSequence(run.runId, {
            storedTurnIds: () => new Set(), whenPersisted: async () => undefined, map: (event) => mapper.map(event),
          });
          sequence.recordPredating();
          const current = sequence;
          run.subscribeToEvents((event) => { if (isAgentRunEvent(event)) current.accept(event); });
          attached.set(run, sequence);
        }
        return sequence;
      },
    },
    readStored: async (runId: string) => stored(runId),
  };
};
