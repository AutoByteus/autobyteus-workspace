import type { AgentRunInputReservation } from "../../agent-execution/input/agent-run-input-contract.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { PreparedTeamMessageAppend } from "../../agent-team-execution/services/team-run-persistence-contract.js";
import { buildTeamMemberInputEventPayload } from "../../agent-team-execution/services/team-member-input-event-builder.js";
import { validateTeamCommunicationMessagesPayload } from "./team-communication-messages-schema.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";
import type { MessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";

type AppendPlanState = "sealed" | "prepared" | "cancelled" | "committed" | "fail_stop_disposed";

/**
 * Builds the one-shot logical append capability consumed under the root file lock.
 * The service retains message policy; this owner alone derives the next immutable
 * message snapshot from the latest authoritative state.
 */
export const createTeamCommunicationMessageAppendPlan = (input: {
  rootTeamRunId: string;
  message: CollaborationCommunicationMessage;
  inputMessage: Parameters<typeof buildTeamMemberInputEventPayload>[0]["message"];
  reservation: AgentRunInputReservation;
  isAccepting(): boolean;
  getCurrent(): TeamCommunicationMessagesSnapshot;
  /** The logs the message belongs to, resolved against the current tree. */
  resolveLogOwners(): readonly MessageLogOwner[];
  replaceCurrent(messages: TeamCommunicationMessagesSnapshot): void;
  publish(event: TeamRunEvent): void;
}): PreparedTeamMessageAppend => {
  let state: AppendPlanState = "sealed";

  return Object.freeze({
    rootTeamRunId: input.rootTeamRunId,
    messageId: input.message.messageId,
    cancelBeforePreparation: () => {
      if (state !== "sealed") return;
      state = "cancelled";
      input.reservation.cancel();
    },
    disposeAfterRootFailStop: () => {
      if (state !== "sealed" && state !== "prepared") return;
      state = "fail_stop_disposed";
      input.reservation.cancel();
    },
    prepareAgainstCurrent: () => {
      if (state !== "sealed") {
        return {
          prepared: false as const,
          code: "TEAM_MESSAGE_COMMIT_CONFLICT" as const,
          message: "Message append plan is no longer current.",
        };
      }
      const current = input.getCurrent();
      if (!input.isAccepting() || current.messages.some((row) => row.messageId === input.message.messageId)) {
        state = "cancelled";
        input.reservation.cancel();
        return {
          prepared: false as const,
          code: "TEAM_MESSAGE_COMMIT_CONFLICT" as const,
          message: "Message append conflicts with current root state.",
        };
      }
      const nextMessages = validateTeamCommunicationMessagesPayload({
        ...current,
        messages: [...current.messages, input.message],
      }, input.rootTeamRunId);
      state = "prepared";
      return {
        prepared: true as const,
        commit: Object.freeze({
          nextMessages,
          message: input.message,
          logOwners: input.resolveLogOwners(),
          cancelBeforeDurability: () => {
            if (state !== "prepared") return;
            state = "cancelled";
            input.reservation.cancel();
          },
          commitAfterDurability: () => {
            if (state !== "prepared") return;
            state = "committed";
            input.replaceCurrent(nextMessages);
            const committed = input.reservation.commit();
            input.publish({
              eventSourceType: TeamRunEventSourceType.COMMUNICATION,
              payload: input.message,
            });
            input.publish({
              eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
              agentRunId: input.message.receiverAgentRunId,
              payload: buildTeamMemberInputEventPayload({
                rootTeamRunId: input.rootTeamRunId,
                recipientAgentRunId: input.message.receiverAgentRunId,
                message: input.inputMessage,
                receivedAt: input.message.createdAt,
              }),
            });
            committed.release();
          },
        }),
      };
    },
  });
};
