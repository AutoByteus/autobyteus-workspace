import type { AgentStatusPayload } from './messageTypes';

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
  /** The node's time of the ack: a refused send's row takes it (autobyteus-628 D-3). */
  occurred_at: string;
  code?:
    | 'RUN_COMMAND_IN_PROGRESS'
    | 'INVALID_COMMAND_ID'
    | 'RUN_NOT_FOUND'
    | 'ACTIVATION_FAILED'
    | 'RUNTIME_REJECTED'
    | 'COLLABORATOR_ADD_FAILED'
    | 'COLLABORATOR_MENTION_INVALID'
    | 'COLLABORATOR_MENTION_UNAVAILABLE'
    /** autobyteus-461 DS-15: the run's Task is closed; only its assigner continues it. */
    | 'TASK_AGENT_RESOURCE_CLOSED'
    /** autobyteus-461 CR-461-051: a delegated run while Task data cannot be read fails closed. */
    | 'TASK_AGENT_RESOURCES_UNAVAILABLE'
    /** autobyteus-461 CR-461-070: a delegated run whose entry agent's saved conversation cannot continue (base's refusal). */
    | 'TASK_EXECUTION_CONTEXT_UNAVAILABLE'
    | 'UNKNOWN_ERROR';
  message?: string;
  /** With `COLLABORATOR_ADD_FAILED`: the collaborator that could not be added (the message is the reason). */
  collaborator_name?: string;
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

/**
 * What became of one Stop (autobyteus-533 D-W1): the node accepted it (it stopped a turn or found nothing to stop);
 * it was not sent (not connected); its answer was lost with the connection (the run's status decides); or the node
 * or runtime refused it. `detail` is the node's text, for the console only.
 */
export type InterruptOutcome =
  | Readonly<{ kind: 'accepted' }>
  | Readonly<{ kind: 'not_sent' }>
  | Readonly<{ kind: 'connection_lost' }>
  | Readonly<{ kind: 'refused'; detail: string }>;

/** A Stop sent and waiting for its answer; `settle` gives the sender its outcome, once. */
export type PendingInterruptCommand = {
  commandId: string;
  target: InterruptCommandTarget;
  settle(outcome: InterruptOutcome): void;
};
