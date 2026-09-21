import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { CollaborationAgentActivationError } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import type { FlatTeamExecutionCallbacks } from "../local/flat-team-execution-callbacks.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";
import { TeamAgentPlatformBindingError } from "../domain/team-agent-platform-binding.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import { toTeamAgentEvent } from "./team-agent-event-adapter.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { MemberExecutionContextBuilder } from "./member-team-context-builder.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";

/** Standalone-Team subject adapter for root-neutral local Agent callbacks. */
export const createTeamFlatExecutionCallbacks = (input: {
  teamContext: TeamRunContext<unknown>;
  memberExecutionContextBuilder: MemberExecutionContextBuilder;
  taskCommands: MemberTaskCommandCapability;
  publish(event: TeamRunEvent): void;
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
  commitPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void>;
}): FlatTeamExecutionCallbacks => Object.freeze({
  buildMemberExecutionContext: ({ identity, sourceNode }) => input.memberExecutionContextBuilder.build({
    teamContext: input.teamContext,
    agentNode: sourceNode,
    deliverInterAgentMessage: input.deliverInterAgentMessage,
    taskCommands: input.taskCommands,
  }).then((context) => {
    if (context.identity.agentRunId !== identity.agentRunId || context.identity.memberAddress !== identity.memberAddress) {
      throw new Error("Team member context identity does not match the local execution.");
    }
    return context;
  }),
  publishAgentEvent: (identity, event) => {
    const adapted = new CollaborationAgentPresentationEventAdapter(
      (agentRunId) => agentRunId === identity.agentRunId ? identity : null,
    ).adapt(identity, event);
    if (adapted.kind === "filtered_collaboration_duplicate") return;
    if (adapted.kind === "publish" && adapted.event.eventType === "MEMBER_INPUT_MESSAGE") {
      input.publish({
        eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
        agentRunId: identity.agentRunId,
        payload: Object.freeze({
          recipientAgentRunId: identity.agentRunId,
          ...adapted.event.details,
        }),
      });
      return;
    }
    const eventPayload = adapted.kind === "publish"
      ? toTeamAgentEvent(adapted.event, identity)
      : {
          eventType: "ERROR" as const,
          details: Object.freeze({
            code: adapted.code,
            message: adapted.message,
            errorScope: "runtime" as const,
            errorEffect: "terminal" as const,
            turnId: null,
          }),
          statusHint: "ERROR" as const,
        };
    input.publish({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: identity,
      payload: eventPayload,
    });
  },
  commitPlatformBindingChange: async (change) => {
    try { await input.commitPlatformBindingChange(change); }
    catch (error) {
      if (error instanceof TeamAgentPlatformBindingError && error.indeterminate) {
        throw new CollaborationAgentActivationError(error.code, error.message, { cause: error, indeterminate: true });
      }
      throw error;
    }
  },
  applicationExecutionContext: (identity) => input.teamContext.applicationBinding
    ? Object.freeze({
        applicationId: input.teamContext.applicationBinding.applicationId,
        bindingId: input.teamContext.applicationBinding.bindingId,
        producer: Object.freeze({
          agentRunId: identity.agentRunId,
          displayName: identity.memberAddress.split("/").at(-1) ?? identity.agentRunId,
        }),
      })
    : null,
});
