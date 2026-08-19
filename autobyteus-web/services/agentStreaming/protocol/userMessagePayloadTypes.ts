
export type UserMessageContextFilePathPayloadType =
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
  | 'Xml'
  | string;

export interface UserMessageContextFilePathPayload {
  path: string;
  type?: UserMessageContextFilePathPayloadType | null;
}

export interface UserMessageProjectionPayload {
  content?: string | null;
  received_at?: string | null;
  message_id?: string | null;
  dedupe_key?: string | null;
  context_file_paths?: UserMessageContextFilePathPayload[];
}
