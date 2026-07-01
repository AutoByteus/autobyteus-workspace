import type { ConversationTargetAddress } from '~/types/agent/ConversationTargetAddress';

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
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
}

export interface TeamCommunicationPerspectiveMessage extends TeamCommunicationMessage {
  direction: TeamCommunicationDirection;
  counterpartAddress: ConversationTargetAddress;
  counterpartKey: string;
  counterpartLabel: string;
  message: TeamCommunicationMessage;
}

export interface TeamCommunicationPerspectiveGroup {
  counterpartAddress: ConversationTargetAddress;
  counterpartKey: string;
  counterpartLabel: string;
  messages: TeamCommunicationPerspectiveMessage[];
}

export interface TeamCommunicationPerspective {
  sentGroups: TeamCommunicationPerspectiveGroup[];
  receivedGroups: TeamCommunicationPerspectiveGroup[];
  messages: TeamCommunicationPerspectiveMessage[];
}
