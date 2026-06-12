import type { UserMessageContextFilePathPayload, UserMessageProjectionPayload } from './userMessagePayloadTypes';

export type MemberInputMessageContextFilePathPayload = UserMessageContextFilePathPayload;

export interface MemberInputMessagePayload extends UserMessageProjectionPayload {
  input_origin?: 'user_message' | 'inter_agent_delivery' | string | null;
  sender_agent_id?: string | null;
  sender_agent_name?: string | null;
  sender_member_route_key?: string | null;
  sender_member_path?: string[] | null;
  parent_communication_message_id?: string | null;
}
