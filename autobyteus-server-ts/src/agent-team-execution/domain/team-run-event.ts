import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import type { TeamAgentEvent } from "./team-agent-event.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
}

export type TeamRunMemberInputOrigin = "user_message" | "inter_agent_delivery";
export type TeamRunMemberInputContextFile = Readonly<{ path: string; type: string | null }>;
export type TeamRunMemberInputEventPayload = Readonly<{
  recipientAgentRunId: string;
  messageId: string;
  dedupeKey: string;
  content: string;
  inputOrigin: TeamRunMemberInputOrigin;
  receivedAt: string;
  contextFilePaths: readonly TeamRunMemberInputContextFile[];
  senderAgentRunId: string | null;
  parentCommunicationMessageId: string | null;
}>;

export type TeamRunEvent =
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.AGENT;
      execution: TeamAgentExecutionBinding;
      payload: TeamAgentEvent;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.COMMUNICATION;
      payload: CollaborationCommunicationMessage;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT;
      agentRunId: string;
      payload: TeamRunMemberInputEventPayload;
    }>;

/** The Team's message events: the ones the client adds to the Team tab's lists (autobyteus-358, SR-008). */
export const isTeamRunMessageEvent = (event: TeamRunEvent): boolean =>
  event.eventSourceType === TeamRunEventSourceType.COMMUNICATION;
/** A committed message as the Team's message event (SR-072: the node's message feed numbers it in each view). */
export const teamRunMessageEvent = (message: CollaborationCommunicationMessage): TeamRunEvent => ({ eventSourceType: TeamRunEventSourceType.COMMUNICATION, payload: message });

