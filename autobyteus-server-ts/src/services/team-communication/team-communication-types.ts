import type { ConversationTargetAddress } from "../../agent-team-execution/domain/conversation-target-address.js";

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
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
}

export interface TeamCommunicationProjection {
  teamRunId: string;
  messages: TeamCommunicationMessage[];
}

export const EMPTY_TEAM_COMMUNICATION_PROJECTION: TeamCommunicationProjection = {
  teamRunId: "",
  messages: [],
};
