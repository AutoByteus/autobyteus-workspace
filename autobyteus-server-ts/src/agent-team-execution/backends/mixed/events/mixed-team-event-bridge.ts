import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamCommunicationParticipant,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../domain/team-run-event.js";
import {
  buildTeamMemberAddress,
  type TeamRepresentedSubTeam,
} from "../../../domain/inter-agent-message-delivery.js";
import { buildMemberRouteKeyFromPath } from "../../../domain/team-run-member-identity.js";

const pathStartsWith = (path: readonly string[], prefix: readonly string[]): boolean =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

const prefixPath = (path: readonly string[], prefix: readonly string[], isAlreadyParentRooted: boolean): string[] =>
  isAlreadyParentRooted && pathStartsWith(path, prefix) ? [...path] : [...prefix, ...path];

const prefixRepresentedSubTeam = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  representedSubTeam: TeamRepresentedSubTeam;
}): TeamRepresentedSubTeam => {
  const memberPath = prefixPath(
    input.representedSubTeam.memberPath,
    input.sourcePrefix,
    input.representedSubTeam.address.teamRunId === input.parentTeamRunId,
  );
  const memberRouteKey = buildMemberRouteKeyFromPath(memberPath);
  return {
    ...input.representedSubTeam,
    memberPath,
    memberRouteKey,
    address: buildTeamMemberAddress({
      teamRunId: input.parentTeamRunId,
      memberPath,
      memberRouteKey,
    }),
  };
};

const prefixParticipant = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  participant: TeamCommunicationParticipant;
}): TeamCommunicationParticipant => {
  const participantAddress = input.participant.address ?? null;
  const isAlreadyParentRooted = participantAddress?.teamRunId === input.parentTeamRunId;
  const memberPath = prefixPath(
    input.participant.memberPath,
    input.sourcePrefix,
    isAlreadyParentRooted,
  );
  const memberRouteKey = buildMemberRouteKeyFromPath(memberPath);
  return {
    ...input.participant,
    memberPath,
    memberRouteKey,
    address: buildTeamMemberAddress({
      teamRunId: input.parentTeamRunId,
      memberPath,
      memberRouteKey,
    }),
    representedSubTeam: input.participant.representedSubTeam
      ? prefixRepresentedSubTeam({
          parentTeamRunId: input.parentTeamRunId,
          sourcePrefix: input.sourcePrefix,
          representedSubTeam: input.participant.representedSubTeam,
        })
      : null,
  };
};

const prefixCommunicationPayload = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  payload: TeamRunCommunicationEventPayload;
}): TeamRunCommunicationEventPayload => ({
  ...input.payload,
  teamRunId: input.parentTeamRunId,
  sender: prefixParticipant({
    parentTeamRunId: input.parentTeamRunId,
    sourcePrefix: input.sourcePrefix,
    participant: input.payload.sender,
  }),
  receiver: prefixParticipant({
    parentTeamRunId: input.parentTeamRunId,
    sourcePrefix: input.sourcePrefix,
    participant: input.payload.receiver,
  }),
});

const prefixAgentPayload = (input: {
  sourcePrefix: string[];
  payload: TeamRunAgentEventPayload;
  isAlreadyParentRooted: boolean;
}): TeamRunAgentEventPayload => {
  const memberPath = prefixPath(
    input.payload.memberPath,
    input.sourcePrefix,
    input.isAlreadyParentRooted,
  );
  return {
    ...input.payload,
    memberPath,
    memberRouteKey: buildMemberRouteKeyFromPath(memberPath),
  };
};

export const prefixMixedSubTeamEvent = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  event: TeamRunEvent;
}): TeamRunEvent => {
  const isAlreadyParentRooted = input.event.teamRunId === input.parentTeamRunId;
  const sourcePath = prefixPath(
    input.event.sourcePath,
    input.sourcePrefix,
    isAlreadyParentRooted,
  );
  const data =
    input.event.eventSourceType === TeamRunEventSourceType.COMMUNICATION
      ? prefixCommunicationPayload({
          parentTeamRunId: input.parentTeamRunId,
          sourcePrefix: input.sourcePrefix,
          payload: input.event.data as TeamRunCommunicationEventPayload,
        })
      : input.event.eventSourceType === TeamRunEventSourceType.AGENT
        ? prefixAgentPayload({
            sourcePrefix: input.sourcePrefix,
            payload: input.event.data as TeamRunAgentEventPayload,
            isAlreadyParentRooted,
          })
        : input.event.data;

  return {
    ...input.event,
    teamRunId: input.parentTeamRunId,
    sourcePath,
    data,
    subTeamNodeName: input.sourcePrefix[input.sourcePrefix.length - 1] ?? input.event.subTeamNodeName ?? null,
  };
};
