import type { UserMessageContextFilePathPayload, UserMessageProjectionPayload } from './userMessagePayloadTypes';

export type ExternalUserMessageContextFilePathPayload = UserMessageContextFilePathPayload;

export interface ExternalUserMessagePayload extends UserMessageProjectionPayload {
  input_origin?: 'user_message' | 'inter_agent_delivery' | string | null;
  provider?: string | null;
  transport?: string | null;
  account_id?: string | null;
  peer_id?: string | null;
  thread_id?: string | null;
  external_message_id?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
}
