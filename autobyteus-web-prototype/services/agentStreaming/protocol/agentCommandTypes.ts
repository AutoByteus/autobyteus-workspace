import type { AgentStatusPayload } from './messageTypes';
import type { ConnectionState } from '../transport';

export interface SendMessageCommandAckPayload {
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

export type InterruptCommandTarget =
  | { target_kind: 'standalone_run'; run_id: string }
  | {
      target_kind: 'team_member';
      team_run_id: string;
      agent_run_id: string;
    };

export type InterruptGenerationCommandAckPayload =
  | {
      command_type: 'INTERRUPT_GENERATION';
      command_id: string;
      state: 'accepted';
      target: InterruptCommandTarget;
    }
  | {
      command_type: 'INTERRUPT_GENERATION';
      command_id: string;
      state: 'rejected' | 'failed';
      code: string;
      message: string;
      target: InterruptCommandTarget;
    };

export type AgentCommandAckPayload =
  | SendMessageCommandAckPayload
  | InterruptGenerationCommandAckPayload;

export type PendingInterruptCommand = {
  commandId: string;
  target: InterruptCommandTarget;
};

export type InterruptCommandTransportFailure = {
  commandId: string;
  target: InterruptCommandTarget;
  reason: {
    code:
      | 'INTERRUPT_TRANSPORT_NOT_CONNECTED'
      | 'INTERRUPT_TRANSPORT_SEND_FAILED'
      | 'INTERRUPT_TRANSPORT_DISCONNECTED';
    connectionState: ConnectionState;
    message: string;
  };
};
