import { ConnectionState } from './transport';
import type {
  InterruptCommandTarget,
  InterruptOutcome,
  PendingInterruptCommand,
} from './protocol/agentCommandTypes';

export const INTERRUPT_ACCEPTED: InterruptOutcome = Object.freeze({ kind: 'accepted' });
export const INTERRUPT_NOT_SENT: InterruptOutcome = Object.freeze({ kind: 'not_sent' });
export const INTERRUPT_CONNECTION_LOST: InterruptOutcome = Object.freeze({ kind: 'connection_lost' });

/**
 * Sends one Stop and returns its outcome: `not_sent` when the stream is not connected or the send fails; otherwise the
 * Stop waits in `pending` until its answer (`settlePendingInterruptAck`) or a connection loss settles it.
 */
export function admitInterruptCommand(input: {
  pending: Map<string, PendingInterruptCommand>;
  commandId: string;
  target: InterruptCommandTarget;
  getConnectionState: () => ConnectionState;
  send: () => void;
}): Promise<InterruptOutcome> {
  return new Promise<InterruptOutcome>((resolve) => {
    const connectionState = input.getConnectionState();
    if (connectionState !== ConnectionState.CONNECTED) {
      console.warn(`Stop was not sent: the stream is ${connectionState}.`);
      resolve(INTERRUPT_NOT_SENT);
      return;
    }
    input.pending.set(input.commandId, { commandId: input.commandId, target: input.target, settle: resolve });
    try {
      input.send();
    } catch (error) {
      input.pending.delete(input.commandId);
      console.warn('Stop was not sent:', error);
      resolve(INTERRUPT_NOT_SENT);
    }
  });
}

/** Settles the waiting Stop this answer belongs to (`accepted`, or `refused` with the node's text); false if none. */
export function settlePendingInterruptAck(
  pending: Map<string, PendingInterruptCommand>,
  ack: Readonly<{ commandId: string; target: InterruptCommandTarget; accepted: boolean; detail: string }>,
): boolean {
  const entry = pending.get(ack.commandId);
  if (!entry || !interruptCommandTargetsEqual(entry.target, ack.target)) return false;
  pending.delete(ack.commandId);
  entry.settle(ack.accepted ? INTERRUPT_ACCEPTED : Object.freeze({ kind: 'refused', detail: ack.detail }));
  return true;
}

/**
 * Stops whose answer was lost with a connection that recovers (autobyteus-533 D-W7). Their stream holds them at a
 * retryable loss, so the run's composer stays "Stopping…", and settles them `connection_lost` once the rebind's status
 * is applied (then the run's current status decides), or at once when the stream is closed for good. No answer can
 * arrive for a held Stop: its socket is gone.
 */
export class InterruptsAwaitingRebind {
  private held: Array<() => void> = [];

  /** Holds one lost Stop; `settleConnectionLost` gives it its `connection_lost` outcome. */
  hold(settleConnectionLost: () => void): void {
    this.held.push(settleConnectionLost);
  }

  /** Moves every waiting Stop of `pending` here. */
  holdPending(pending: Map<string, PendingInterruptCommand>): void {
    for (const entry of pending.values()) this.hold(() => entry.settle(INTERRUPT_CONNECTION_LOST));
    pending.clear();
  }

  /** Settles every held Stop, once: after the rebind's status is applied, or at a final close. */
  settle(): void {
    const held = this.held;
    this.held = [];
    for (const settleConnectionLost of held) settleConnectionLost();
  }
}

export const interruptCommandTargetsEqual = (
  left: InterruptCommandTarget,
  right: InterruptCommandTarget,
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
