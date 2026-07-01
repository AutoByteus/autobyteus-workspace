import type { TeamRunCommunicationEventPayload } from "../../agent-team-execution/domain/team-run-event.js";
import { serializePayload } from "./payload-serialization.js";

export const buildTeamCommunicationMessagePayload = (
  eventPayload: TeamRunCommunicationEventPayload,
): Record<string, unknown> => serializePayload({
  messageId: eventPayload.messageId,
  teamRunId: eventPayload.teamRunId,
  senderAddress: eventPayload.senderAddress,
  receiverAddress: eventPayload.receiverAddress,
  content: eventPayload.content,
  messageType: eventPayload.messageType,
  referenceFiles: eventPayload.referenceFiles,
  createdAt: eventPayload.createdAt,
});
