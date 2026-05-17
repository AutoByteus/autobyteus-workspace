export type TeamCommunicationReferenceFileType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
export type TeamCommunicationDirection = 'sent' | 'received';
export type TeamCommunicationMemberKind = 'agent' | 'agent_team';

export interface TeamCommunicationParticipantSelector {
  memberRunId?: string | null;
  memberKind?: TeamCommunicationMemberKind | null;
  memberPath?: string[] | null;
  memberRouteKey?: string | null;
}

export interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: TeamCommunicationReferenceFileType;
  createdAt: string;
  updatedAt: string;
}

export interface TeamCommunicationMemberAddress {
  teamRunId: string;
  memberPath: string[];
  memberRouteKey: string;
}

export interface TeamCommunicationRepresentedSubTeam {
  memberKind: 'agent_team';
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
  address: TeamCommunicationMemberAddress;
}

export interface TeamCommunicationMessage {
  messageId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberKind?: TeamCommunicationMemberKind | null;
  senderMemberName?: string | null;
  senderMemberPath?: string[] | null;
  senderMemberRouteKey?: string | null;
  senderRepresentedSubTeam?: TeamCommunicationRepresentedSubTeam | null;
  receiverRunId: string;
  receiverMemberKind?: TeamCommunicationMemberKind | null;
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

export interface TeamCommunicationPerspectiveMessage extends TeamCommunicationMessage {
  direction: TeamCommunicationDirection;
  counterpartRunId: string;
  counterpartMemberKind: TeamCommunicationMemberKind | null;
  counterpartMemberName: string | null;
  counterpartMemberPath: string[] | null;
  counterpartMemberRouteKey: string | null;
  counterpartRepresentedSubTeam: TeamCommunicationRepresentedSubTeam | null;
  message: TeamCommunicationMessage;
}

export interface TeamCommunicationPerspectiveGroup {
  counterpartRunId: string;
  counterpartMemberKind: TeamCommunicationMemberKind | null;
  counterpartMemberName: string | null;
  counterpartMemberPath: string[] | null;
  counterpartMemberRouteKey: string | null;
  counterpartRepresentedSubTeam: TeamCommunicationRepresentedSubTeam | null;
  messages: TeamCommunicationPerspectiveMessage[];
}

export interface TeamCommunicationPerspective {
  sentGroups: TeamCommunicationPerspectiveGroup[];
  receivedGroups: TeamCommunicationPerspectiveGroup[];
  messages: TeamCommunicationPerspectiveMessage[];
}
