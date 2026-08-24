import type { UserMessageContextFilePathPayload, UserMessageProjectionPayload } from './userMessagePayloadTypes';

export type MemberInputMessageContextFilePathPayload = UserMessageContextFilePathPayload;

export interface MemberInputMessagePayload extends UserMessageProjectionPayload {
  recipient_agent_run_id: string;
  input_origin?: 'user_message' | 'inter_agent_delivery' | string | null;
  sender_agent_run_id?: string | null;
  parent_communication_message_id?: string | null;
}
