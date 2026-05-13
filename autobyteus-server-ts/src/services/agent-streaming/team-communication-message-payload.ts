import type { TeamRunCommunicationEventPayload } from "../../agent-team-execution/domain/team-run-event.js";
import { serializePayload } from "./payload-serialization.js";

type TeamCommunicationParticipantPayload = {
  runIdKey: "senderRunId" | "receiverRunId";
  kindKey: "senderMemberKind" | "receiverMemberKind";
  nameKey: "senderMemberName" | "receiverMemberName";
  pathKey: "senderMemberPath" | "receiverMemberPath";
  routeKey: "senderMemberRouteKey" | "receiverMemberRouteKey";
  participant: TeamRunCommunicationEventPayload["sender"];
};

const flattenParticipant = ({
  runIdKey,
  kindKey,
  nameKey,
  pathKey,
  routeKey,
  participant,
}: TeamCommunicationParticipantPayload): Record<string, unknown> => ({
  [runIdKey]: participant.memberRunId,
  [kindKey]: participant.memberKind,
  [nameKey]: participant.memberName,
  [pathKey]: participant.memberPath,
  [routeKey]: participant.memberRouteKey,
});

export const buildTeamCommunicationMessagePayload = (
  eventPayload: TeamRunCommunicationEventPayload,
): Record<string, unknown> => serializePayload({
  messageId: eventPayload.messageId,
  teamRunId: eventPayload.teamRunId,
  ...flattenParticipant({
    runIdKey: "senderRunId",
    kindKey: "senderMemberKind",
    nameKey: "senderMemberName",
    pathKey: "senderMemberPath",
    routeKey: "senderMemberRouteKey",
    participant: eventPayload.sender,
  }),
  ...flattenParticipant({
    runIdKey: "receiverRunId",
    kindKey: "receiverMemberKind",
    nameKey: "receiverMemberName",
    pathKey: "receiverMemberPath",
    routeKey: "receiverMemberRouteKey",
    participant: eventPayload.receiver,
  }),
  content: eventPayload.content,
  messageType: eventPayload.messageType,
  referenceFiles: eventPayload.referenceFiles,
  createdAt: eventPayload.createdAt,
  updatedAt: eventPayload.createdAt,
});
