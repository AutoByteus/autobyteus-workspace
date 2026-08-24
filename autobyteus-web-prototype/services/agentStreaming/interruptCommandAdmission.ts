import { ConnectionState } from './transport';
import type {
  InterruptCommandTransportFailure,
  PendingInterruptCommand,
} from './protocol/agentCommandTypes';

type FailureCallback = (failure: InterruptCommandTransportFailure) => void;

export function completePendingInterruptTransportFailure(input: {
  pending: Map<string, PendingInterruptCommand>;
  commandId: string;
  reason: InterruptCommandTransportFailure['reason'];
  onTransportFailure: FailureCallback;
}): boolean {
  const entry = input.pending.get(input.commandId);
  if (!entry) return false;
  input.pending.delete(input.commandId);
  input.onTransportFailure({
    commandId: input.commandId,
    target: entry.target,
    reason: input.reason,
  });
  return true;
}

export function drainPendingInterruptTransportFailures(input: {
  pending: Map<string, PendingInterruptCommand>;
  reason: InterruptCommandTransportFailure['reason'];
  onTransportFailure: FailureCallback;
}): number {
  let completed = 0;
  for (const commandId of [...input.pending.keys()]) {
    if (completePendingInterruptTransportFailure({ ...input, commandId })) completed += 1;
  }
  return completed;
}

export function tryAdmitInterruptCommand(input: {
  pending: Map<string, PendingInterruptCommand>;
  entry: PendingInterruptCommand;
  getConnectionState: () => ConnectionState;
  send: () => void;
  onTransportFailure: FailureCallback;
}): boolean {
  input.pending.set(input.entry.commandId, input.entry);
  const connectionState = input.getConnectionState();
  if (connectionState !== ConnectionState.CONNECTED) {
    completePendingInterruptTransportFailure({
      pending: input.pending,
      commandId: input.entry.commandId,
      reason: {
        code: 'INTERRUPT_TRANSPORT_NOT_CONNECTED',
        connectionState,
        message: `Interrupt was not sent because the stream is ${connectionState}.`,
      },
      onTransportFailure: input.onTransportFailure,
    });
    return false;
  }
  try {
    input.send();
    return true;
  } catch (error) {
    completePendingInterruptTransportFailure({
      pending: input.pending,
      commandId: input.entry.commandId,
      reason: {
        code: 'INTERRUPT_TRANSPORT_SEND_FAILED',
        connectionState: input.getConnectionState(),
        message: error instanceof Error ? error.message : String(error),
      },
      onTransportFailure: input.onTransportFailure,
    });
    return false;
  }
}

export const interruptCommandTargetsEqual = (
  left: PendingInterruptCommand['target'],
  right: PendingInterruptCommand['target'],
): boolean => {
  if (left.target_kind !== right.target_kind) return false;
  if (left.target_kind === 'standalone_run' && right.target_kind === 'standalone_run') {
    return left.run_id === right.run_id;
  }
  if (left.target_kind === 'team_member' && right.target_kind === 'team_member') {
    return left.team_run_id === right.team_run_id
      && left.agent_run_id === right.agent_run_id;
  }
  return false;
};
