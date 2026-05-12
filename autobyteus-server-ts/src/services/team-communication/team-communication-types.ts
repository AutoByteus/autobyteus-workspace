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

export interface TeamCommunicationMessage {
  messageId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberKind?: "agent" | "agent_team" | null;
  senderMemberName?: string | null;
  senderMemberPath?: string[] | null;
  senderMemberRouteKey?: string | null;
  receiverRunId: string;
  receiverMemberKind?: "agent" | "agent_team" | null;
  receiverMemberName?: string | null;
  receiverMemberPath?: string[] | null;
  receiverMemberRouteKey?: string | null;
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
