import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import {
  buildMemberRouteKeyFromPath,
  selectorFromMemberPath,
  type TeamMemberSelector,
} from "./team-run-member-identity.js";

export type TeamMemberAddress = {
  teamRunId: string;
  memberPath: string[];
  memberRouteKey: string;
};

export type TeamRepresentedSubTeam = {
  memberKind: "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
  address: TeamMemberAddress;
};

export type InterAgentMessageParticipant = {
  memberKind: "agent" | "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  address: TeamMemberAddress;
  platformRunId?: string | null;
  teamDefinitionId?: string | null;
  representedSubTeam?: TeamRepresentedSubTeam | null;
};

export type InterAgentMessageDeliveryEndpoint = {
  participant: InterAgentMessageParticipant;
  selector: TeamMemberSelector;
};

export interface InterAgentMessageDeliveryRequest {
  teamRunId: string;
  sender: InterAgentMessageDeliveryEndpoint;
  recipient: InterAgentMessageDeliveryEndpoint;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
  parentCommunicationMessageId?: string | null;
  recipientInputMessageId?: string | null;
  recipientInputDedupeKey?: string | null;
}

export type InterAgentMessageDeliveryHandler = (
  request: InterAgentMessageDeliveryRequest,
) => Promise<AgentOperationResult>;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return normalized;
};

const normalizePath = (value: readonly string[], fieldName: string): string[] => {
  const path = value.map((segment, index) => normalizeRequiredString(segment, `${fieldName}[${index}]`));
  if (path.length === 0) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return path;
};

const pathsEqual = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((segment, index) => segment === right[index]);

const pathStartsWith = (path: readonly string[], prefix: readonly string[]): boolean =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

export const buildTeamMemberAddress = (input: {
  teamRunId: string;
  memberPath: readonly string[];
  memberRouteKey?: string | null;
}): TeamMemberAddress => {
  const memberPath = normalizePath(input.memberPath, "memberPath");
  const derivedRouteKey = buildMemberRouteKeyFromPath(memberPath);
  const memberRouteKey = input.memberRouteKey?.trim() || derivedRouteKey;
  if (memberRouteKey !== derivedRouteKey) {
    throw new Error(`memberRouteKey '${memberRouteKey}' does not match memberPath '${derivedRouteKey}'.`);
  }
  return {
    teamRunId: normalizeRequiredString(input.teamRunId, "teamRunId"),
    memberPath,
    memberRouteKey,
  };
};

export const assertParticipantAddressInvariant = (
  participant: InterAgentMessageParticipant,
): void => {
  const address = buildTeamMemberAddress({
    teamRunId: participant.address.teamRunId,
    memberPath: participant.address.memberPath,
    memberRouteKey: participant.address.memberRouteKey,
  });
  const participantRouteKey = buildMemberRouteKeyFromPath(participant.memberPath);
  if (participantRouteKey !== participant.memberRouteKey) {
    throw new Error(`participant.memberRouteKey '${participant.memberRouteKey}' does not match participant.memberPath '${participantRouteKey}'.`);
  }
  const participantPath = normalizePath(participant.memberPath, "participant.memberPath");
  if (!pathsEqual(address.memberPath, participantPath)) {
    throw new Error(`participant.address.memberPath '${address.memberPath.join("/")}' does not match participant.memberPath '${participantPath.join("/")}'.`);
  }
  if (address.memberRouteKey !== participant.memberRouteKey) {
    throw new Error(`participant.address.memberRouteKey '${address.memberRouteKey}' does not match participant.memberRouteKey '${participant.memberRouteKey}'.`);
  }
  if (participant.representedSubTeam) {
    assertRepresentedSubTeamAddressInvariant(participant.representedSubTeam);
    if (participant.representedSubTeam.address.teamRunId !== address.teamRunId) {
      throw new Error(`participant.representedSubTeam.address.teamRunId '${participant.representedSubTeam.address.teamRunId}' does not match participant.address.teamRunId '${address.teamRunId}'.`);
    }
    if (!pathStartsWith(participantPath, participant.representedSubTeam.memberPath)) {
      throw new Error(`participant.representedSubTeam.memberPath '${participant.representedSubTeam.memberPath.join("/")}' is not a prefix of participant.memberPath '${participantPath.join("/")}'.`);
    }
  }
};

export const assertRepresentedSubTeamAddressInvariant = (
  representedSubTeam: TeamRepresentedSubTeam,
): void => {
  const subTeamRouteKey = buildMemberRouteKeyFromPath(representedSubTeam.memberPath);
  if (subTeamRouteKey !== representedSubTeam.memberRouteKey) {
    throw new Error(`representedSubTeam.memberRouteKey '${representedSubTeam.memberRouteKey}' does not match representedSubTeam.memberPath '${subTeamRouteKey}'.`);
  }
  const address = buildTeamMemberAddress({
    teamRunId: representedSubTeam.address.teamRunId,
    memberPath: representedSubTeam.address.memberPath,
    memberRouteKey: representedSubTeam.address.memberRouteKey,
  });
  const subTeamPath = normalizePath(representedSubTeam.memberPath, "representedSubTeam.memberPath");
  if (!pathsEqual(address.memberPath, subTeamPath)) {
    throw new Error(`representedSubTeam.address.memberPath '${address.memberPath.join("/")}' does not match representedSubTeam.memberPath '${subTeamPath.join("/")}'.`);
  }
  if (address.memberRouteKey !== representedSubTeam.memberRouteKey) {
    throw new Error(`representedSubTeam.address.memberRouteKey '${address.memberRouteKey}' does not match representedSubTeam.memberRouteKey '${representedSubTeam.memberRouteKey}'.`);
  }
};

export const buildDeliveryEndpointForParticipant = (
  participant: InterAgentMessageParticipant,
  selector: TeamMemberSelector = selectorFromMemberPath(participant.address.memberPath),
): InterAgentMessageDeliveryEndpoint => {
  assertParticipantAddressInvariant(participant);
  return { participant, selector };
};
