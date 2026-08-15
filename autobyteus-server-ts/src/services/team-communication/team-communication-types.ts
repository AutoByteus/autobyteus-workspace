export type TeamCommunicationReferenceFileType =
  | "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";

export interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: TeamCommunicationReferenceFileType;
  createdAt: string;
  updatedAt: string;
}

export interface TeamCommunicationMessage {
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
}

export interface TeamCommunicationProjection { teamRunId: string; messages: TeamCommunicationMessage[] }
