import { isTaskDelegationSystemTaskNotificationMessage, getTaskDelegationSystemTaskNotificationDisplayContent } from "./task-system-input-presentation.js";
import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationAgentExecutionEvent } from "../domain/collaboration-agent-execution-event.js";
import {
  sameCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type { AgentPresentationEvent } from "./agent-presentation-event.js";
import { projectAgentPresentationMessage } from "./agent-presentation-message-projector.js";
import {
  AgentRunPresentationAdapter,
  type ResolvePresentationIdentityByAgentRunId,
} from "./collaboration-agent-presentation-adapter.js";
import { buildMemberInputPresentationEvent } from "./member-input-presentation-event-builder.js";

export type CollaborationAgentPresentationAdaptationResult =
  | Readonly<{ kind: "publish"; event: AgentPresentationEvent; message: AgentPresentationMessage }>
  | Readonly<{ kind: "filtered_collaboration_duplicate" }>
  | Readonly<{ kind: "rejected"; code: "AGENT_PRESENTATION_ADMISSION_FAILED"; message: string }>;

const publish = (event: AgentPresentationEvent): CollaborationAgentPresentationAdaptationResult => Object.freeze({
  kind: "publish",
  event,
  message: projectAgentPresentationMessage(event),
});

/** The only admission boundary from raw collaboration-Agent events to presentation. */
export class CollaborationAgentPresentationEventAdapter {
  private readonly agentRuns: AgentRunPresentationAdapter;

  constructor(private readonly resolveIdentity: ResolvePresentationIdentityByAgentRunId) {
    this.agentRuns = new AgentRunPresentationAdapter(resolveIdentity);
  }

  adapt(
    execution: CollaborationMemberExecutionIdentity,
    rawEvent: CollaborationAgentExecutionEvent,
  ): CollaborationAgentPresentationAdaptationResult {
    const current = this.resolveIdentity(execution.agentRunId);
    if (!current || !sameCollaborationMemberExecutionIdentity(current, execution)) {
      return Object.freeze({
        kind: "rejected",
        code: "AGENT_PRESENTATION_ADMISSION_FAILED",
        message: `AgentRun '${execution.agentRunId}' does not resolve to the supplied member identity.`,
      });
    }
    if (rawEvent.kind === "agent_run") {
      if (rawEvent.event.runId !== execution.agentRunId) return Object.freeze({
        kind: "rejected",
        code: "AGENT_PRESENTATION_ADMISSION_FAILED",
        message: "AgentRun event identity does not match the supplied member execution.",
      });
      const result = this.agentRuns.adapt(rawEvent.event);
      return result.kind === "publish" ? publish(result.event) : result;
    }
    if (rawEvent.kind === "member_input") {
      if (isTaskDelegationSystemTaskNotificationMessage(rawEvent.message)) return publish(Object.freeze({
        eventType: "SYSTEM_TASK_NOTIFICATION",
        details: Object.freeze({
          sender: Object.freeze({ kind: "system" }),
          content: getTaskDelegationSystemTaskNotificationDisplayContent(rawEvent.message) ?? rawEvent.message.content,
        }),
        statusHint: null,
      }));
      return publish(buildMemberInputPresentationEvent({
        execution, message: rawEvent.message, receivedAt: rawEvent.receivedAt,
      }));
    }
    if (rawEvent.kind === "status_overlay") {
      if (!sameCollaborationMemberExecutionIdentity(rawEvent.snapshot.execution, execution)) return Object.freeze({
        kind: "rejected",
        code: "AGENT_PRESENTATION_ADMISSION_FAILED",
        message: "Status overlay identity does not match the supplied member execution.",
      });
      return publish(Object.freeze({
        eventType: "AGENT_STATUS",
        details: Object.freeze({
          status: rawEvent.snapshot.details.status,
          trigger: rawEvent.snapshot.details.trigger,
          toolName: null,
          errorMessage: rawEvent.snapshot.details.errorMessage,
          errorDetails: null,
        }),
        statusHint: rawEvent.snapshot.statusHint,
      }));
    }
    return publish(Object.freeze({
      eventType: "ERROR",
      details: Object.freeze({
        code: rawEvent.code,
        message: rawEvent.message,
        errorScope: "runtime",
        errorEffect: "terminal",
        turnId: null,
      }),
      statusHint: "ERROR",
    }));
  }
}
