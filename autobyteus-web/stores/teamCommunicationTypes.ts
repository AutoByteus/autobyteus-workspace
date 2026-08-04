import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export type TeamCommunicationReferenceFileType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
export type TeamCommunicationDirection = 'sent' | 'received';

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

export interface TeamCommunicationPerspectiveMessage extends TeamCommunicationMessage {
  direction: TeamCommunicationDirection;
  counterpartAddress: TeamExecutionAddress;
  counterpartKey: string;
  counterpartLabel: string;
  message: TeamCommunicationMessage;
}

export interface TeamCommunicationPerspectiveGroup {
  counterpartAddress: TeamExecutionAddress;
  counterpartKey: string;
  counterpartLabel: string;
  messages: TeamCommunicationPerspectiveMessage[];
}

export interface TeamCommunicationPerspective {
  sentGroups: TeamCommunicationPerspectiveGroup[];
  receivedGroups: TeamCommunicationPerspectiveGroup[];
  messages: TeamCommunicationPerspectiveMessage[];
}
