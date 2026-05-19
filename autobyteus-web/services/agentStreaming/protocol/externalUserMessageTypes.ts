export interface ExternalUserMessageContextFilePathPayload {
  path: string;
  type?: 'Audio' | 'Csv' | 'Docx' | 'Html' | 'Image' | 'Javascript' | 'Json' | 'Markdown' | 'Pdf' | 'Pptx' | 'Python' | 'Text' | 'Unknown' | 'Video' | 'Xlsx' | 'Xml';
}

export interface ExternalUserMessagePayload {
  content: string;
  received_at?: string | null;
  message_id?: string | null;
  dedupe_key?: string | null;
  input_origin?: 'user_message' | 'inter_agent_delivery' | string | null;
  provider?: string | null;
  transport?: string | null;
  account_id?: string | null;
  peer_id?: string | null;
  thread_id?: string | null;
  external_message_id?: string | null;
  context_file_paths?: ExternalUserMessageContextFilePathPayload[];
  agent_name?: string;
  agent_id?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
  sender_agent_id?: string | null;
  sender_agent_name?: string | null;
  sender_member_route_key?: string | null;
  sender_member_path?: string[] | null;
  parent_communication_message_id?: string | null;
}
