import type { AIResponseSegment } from '~/types/segments';

export type ContextAttachmentType =
  | 'Audio'
  | 'Csv'
  | 'Docx'
  | 'Html'
  | 'Image'
  | 'Javascript'
  | 'Json'
  | 'Markdown'
  | 'Pdf'
  | 'Pptx'
  | 'Python'
  | 'Text'
  | 'Unknown'
  | 'Video'
  | 'Xlsx'
  | 'Xml';

export type WorkspaceContextAttachment = {
  kind: 'workspace_path';
  id: string;
  locator: string;
  displayName: string;
  type: ContextAttachmentType;
};

export type UploadedContextAttachment = {
  kind: 'uploaded';
  id: string;
  locator: string;
  storedFilename: string;
  displayName: string;
  phase: 'draft' | 'final';
  type: ContextAttachmentType;
};

export type ExternalUrlContextAttachment = {
  kind: 'external_url';
  id: string;
  locator: string;
  displayName: string;
  type: ContextAttachmentType;
};

export type ContextAttachment =
  | WorkspaceContextAttachment
  | UploadedContextAttachment
  | ExternalUrlContextAttachment;

export type ContextFilePath = ContextAttachment;

export interface Message {
  type: 'user' | 'ai';
  timestamp: Date;
}

export interface UserMessage extends Message {
  type: 'user';
  text: string;
  contextFilePaths?: ContextAttachment[];
  promptTokens?: number;
  promptCost?: number;
}

export interface AIMessage extends Message {
  type: 'ai';
  text: string;
  segments: AIResponseSegment[];
  isComplete: boolean;
  completionTokens?: number;
  completionCost?: number;
  reasoning?: string | null;
  imageUrls?: string[] | null;
  audioUrls?: string[] | null;
  videoUrls?: string[] | null;
}

export interface Conversation {
  id: string;
  messages: (UserMessage | AIMessage)[];
  createdAt: string;
  updatedAt: string;
  agentDefinitionId?: string;
  agentName?: string;
  llmModelIdentifier?: string;
}
