import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";

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
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
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
