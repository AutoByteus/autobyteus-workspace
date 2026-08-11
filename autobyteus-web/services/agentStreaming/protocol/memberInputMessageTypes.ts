import type { UserMessageContextFilePathPayload, UserMessageProjectionPayload } from './userMessagePayloadTypes';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export type MemberInputMessageContextFilePathPayload = UserMessageContextFilePathPayload;

export interface MemberInputMessagePayload extends UserMessageProjectionPayload {
  execution_address: TeamExecutionAddress;
  input_origin?: 'user_message' | 'inter_agent_delivery' | string | null;
  recipient_address: TeamExecutionAddress;
  sender_address?: TeamExecutionAddress | null;
  parent_communication_message_id?: string | null;
}
