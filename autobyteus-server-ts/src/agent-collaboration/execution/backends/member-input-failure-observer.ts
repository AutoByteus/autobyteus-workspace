import { AgentRunEventType, type AgentRunEvent } from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentRunInputLifecycleObserver } from "../../../agent-execution/input/agent-run-input-contract.js";
import { RUN_EVENT_INPUT_FAILURE_CODES } from "../../../agent-execution/input/agent-run-input-lifecycle.js";

/**
 * The lifecycle observer of a Team member's direct input. An input that failed **before it was
 * sent** (for example a turn start whose runtime session could not be reopened with new tools) is
 * otherwise silent on the Team stream, so it is published there as a run ERROR, without error
 * evidence. Nothing else is: a failure after the input was forwarded, and a failure derived from
 * the run's own ERROR event, are already on the Team stream through the run's events.
 */
export const createMemberInputFailureObserver = (input: Readonly<{
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
