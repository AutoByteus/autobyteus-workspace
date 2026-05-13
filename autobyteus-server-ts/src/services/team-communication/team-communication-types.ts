import type { TeamMemberAddress } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";

export type TeamCommunicationReferenceFileType =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: TeamCommunicationReferenceFileType;
  createdAt: string;
  updatedAt: string;
}

export interface TeamCommunicationRepresentedSubTeam {
  memberKind: "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
  address: TeamMemberAddress;
}

export interface TeamCommunicationMessage {
  messageId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberKind?: "agent" | "agent_team" | null;
  senderMemberName?: string | null;
  senderMemberPath?: string[] | null;
  senderMemberRouteKey?: string | null;
  senderRepresentedSubTeam?: TeamCommunicationRepresentedSubTeam | null;
  receiverRunId: string;
  receiverMemberKind?: "agent" | "agent_team" | null;
  receiverMemberName?: string | null;
  receiverMemberPath?: string[] | null;
  receiverMemberRouteKey?: string | null;
  receiverRepresentedSubTeam?: TeamCommunicationRepresentedSubTeam | null;
  content: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
}

export interface TeamCommunicationProjection {
  version: 1;
  messages: TeamCommunicationMessage[];
}

export const EMPTY_TEAM_COMMUNICATION_PROJECTION: TeamCommunicationProjection = {
  version: 1,
  messages: [],
};
