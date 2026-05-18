import type { AgentStatusPayload } from './messageTypes';

export interface AgentCommandAckPayload {
  command_type: 'SEND_MESSAGE';
  run_id: string;
  message_id: string;
  dedupe_key: string;
  state:
    | 'accepted'
    | 'duplicate_in_progress'
    | 'duplicate_completed'
    | 'duplicate_failed'
    | 'duplicate_rejected'
    | 'rejected'
    | 'failed';
  accepted: boolean;
  duplicate: boolean;
  code?:
    | 'RUN_COMMAND_IN_PROGRESS'
    | 'INVALID_COMMAND_ID'
    | 'RUN_NOT_FOUND'
    | 'ACTIVATION_FAILED'
    | 'RUNTIME_REJECTED'
    | 'UNKNOWN_ERROR';
  message?: string;
  status?: AgentStatusPayload;
}
