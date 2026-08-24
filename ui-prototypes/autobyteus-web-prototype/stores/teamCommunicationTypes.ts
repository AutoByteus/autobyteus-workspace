import type { TeamCommunicationMessageDto, TeamReferenceFileDto } from '@autobyteus/team-stream-contracts';

export type TeamCommunicationReferenceFileType = TeamReferenceFileDto['type'];
export interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: TeamCommunicationReferenceFileType;
  createdAt: string;
  updatedAt: string;
}

export type TeamCommunicationDirection = 'sent' | 'received';
export interface TeamCommunicationPerspectiveMessage {
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
  direction: TeamCommunicationDirection;
  counterpartAgentRunId: string;
  counterpartLabel: string;
  message: TeamCommunicationMessageDto;
}

export interface TeamCommunicationPerspective {
  messages: TeamCommunicationPerspectiveMessage[];
}
