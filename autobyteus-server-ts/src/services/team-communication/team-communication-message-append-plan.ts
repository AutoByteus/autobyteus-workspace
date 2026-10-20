import type { AgentRunInputReservation } from "../../agent-execution/input/agent-run-input-contract.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { PreparedTeamMessageAppend } from "../../agent-team-execution/services/team-run-persistence-contract.js";
import { buildTeamMemberInputEventPayload } from "../../agent-team-execution/services/team-member-input-event-builder.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";
import type { StoredMessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";

type AppendPlanState = "sealed" | "prepared" | "cancelled" | "committed" | "fail_stop_disposed";

/**
 * Builds the one-shot logical append capability consumed under the root file lock.
 * The service retains message policy; this owner alone derives the next immutable
 * message snapshot from the latest authoritative state. `receiver` is the local receiver's reserved input;
 * it is `null` for a message sent to a remote run (the peer admitted it; nothing is reserved here).
 * `publishToRootView` is false for a message with a remote endpoint: the team view shows messages between
 * its own members, so no `COMMUNICATION` event (and no change sequence) is published for it.
 */
export const createTeamCommunicationMessageAppendPlan = (input: {
  rootTeamRunId: string;
  message: CollaborationCommunicationMessage;
  receiver: Readonly<{
    inputMessage: Parameters<typeof buildTeamMemberInputEventPayload>[0]["message"];
    reservation: AgentRunInputReservation;
  }> | null;
  publishToRootView: boolean;
  isAccepting(): boolean;
  getCurrent(): TeamCommunicationMessagesSnapshot;
  /** The logs the message belongs to, resolved against the current tree. */
  resolveLogOwners(): readonly StoredMessageLogOwner[];
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
      input.receiver?.reservation.cancel();
    },
    disposeAfterRootFailStop: () => {
      if (state !== "sealed" && state !== "prepared") return;
      state = "fail_stop_disposed";
      input.receiver?.reservation.cancel();
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
        input.receiver?.reservation.cancel();
        return {
          prepared: false as const,
          code: "TEAM_MESSAGE_COMMIT_CONFLICT" as const,
          message: "Message append conflicts with current root state.",
        };
      }
      const nextMessages: TeamCommunicationMessagesSnapshot = Object.freeze({
        ...current,
        messages: Object.freeze([...current.messages, input.message]),
      });
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
            input.receiver?.reservation.cancel();
          },
          commitAfterDurability: () => {
            if (state !== "prepared") return;
            state = "committed";
            input.replaceCurrent(nextMessages);
            const committed = input.receiver?.reservation.commit() ?? null;
            if (input.publishToRootView) {
              input.publish({
                eventSourceType: TeamRunEventSourceType.COMMUNICATION,
                payload: input.message,
              });
            }
            if (input.receiver) {
              input.publish({
                eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
                agentRunId: input.message.receiverAgentRunId,
                payload: buildTeamMemberInputEventPayload({
                  rootTeamRunId: input.rootTeamRunId,
                  recipientAgentRunId: input.message.receiverAgentRunId,
                  message: input.receiver.inputMessage,
                  receivedAt: input.message.createdAt,
                }),
              });
            }
            committed?.release();
          },
        }),
      };
    },
  });
};
