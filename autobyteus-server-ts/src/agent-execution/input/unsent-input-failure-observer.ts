import { AgentRunEventType, type AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRunInputLifecycleObserver } from "./agent-run-input-contract.js";
import { RUN_EVENT_INPUT_FAILURE_CODES } from "./agent-run-input-lifecycle.js";

/**
 * The lifecycle observer that shows an input which failed **before it was sent** (for example a
 * turn start whose runtime session could not be reopened with new tools). Such a failure is
 * otherwise silent on the run's stream, so it is published there as a run ERROR, without error
 * evidence, through the caller's `publish` (never `AgentRun.publishEvent`, so nothing records it).
 * Nothing else is: a failure after the input was forwarded, and a failure derived from the run's
 * own ERROR event, already reach the stream through the run's events.
 *
 * Used for single runs (`AgentRunCommandCoordinator`) and Team members
 * (`ConfiguredAgentExecutionHandle`).
 */
export const createUnsentInputFailureObserver = (input: Readonly<{
  runId: string;
  publish: (event: AgentRunEvent) => void;
}>): AgentRunInputLifecycleObserver => {
  let forwarded = false;
  return (fact) => {
    if (fact.kind === "forwarded") {
      forwarded = true;
      return;
    }
    if (fact.kind !== "failed" || forwarded || RUN_EVENT_INPUT_FAILURE_CODES.has(fact.code)) return;
    input.publish({
      eventType: AgentRunEventType.ERROR,
      runId: input.runId,
      payload: { code: fact.code, message: fact.message },
      statusHint: null,
    });
  };
};
