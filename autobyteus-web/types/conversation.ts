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

export type UnsupportedLocalFileContextAttachment = {
  kind: 'unsupported_local_file';
  id: string;
  locator: string;
  displayName: string;
  type: ContextAttachmentType;
};

export type ContextAttachment =
  | WorkspaceContextAttachment
  | UploadedContextAttachment
  | ExternalUrlContextAttachment
  | UnsupportedLocalFileContextAttachment;

export type ContextFilePath = ContextAttachment;

export interface Message {
  type: 'user' | 'ai';
  /**
   * The row's time as the node recorded it (autobyteus-628 D-3): the echo's `received_at`, an input's `accepted_at`, an
   * event's `occurred_at`, or the stored `ts`. Null for a row the node has no time for yet (an own send it has not
   * confirmed) or never will (a send that failed before reaching it). The app never stamps one from its own clock.
   */
  timestamp: Date | null;
}

export interface UserMessage extends Message {
  /** Transient live-run projection, not durable delivery state. */
  pendingInput?: { runInstanceId: string; state: "queued" | "held" | "forwarded" };
  type: 'user';
  text: string;
  contextFilePaths?: ContextAttachment[];
  /** Names of the collaborators mentioned with `@` in this local send; shown as inline chips. */
  mentionNames?: string[];
  messageId?: string;
  dedupeKey?: string;
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
