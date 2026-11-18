import { describe, expect, it, vi } from 'vitest';
import { ConnectionState } from '../transport';
import {
  admitInterruptCommand,
  InterruptsAwaitingRebind,
  settlePendingInterruptAck,
} from '../interruptCommandAdmission';
import type { InterruptCommandTarget, PendingInterruptCommand } from '../protocol';

const target: InterruptCommandTarget = { target_kind: 'standalone_run', run_id: 'run-1' };
const admit = (pending: Map<string, PendingInterruptCommand>, state: ConnectionState, send: () => void = vi.fn()) =>
  admitInterruptCommand({ pending, commandId: 'client_interrupt_1', target, getConnectionState: () => state, send });

describe('interrupt command admission (autobyteus-533 D-W1, D-W7)', () => {
  it.each([
    ConnectionState.DISCONNECTED,
    ConnectionState.CONNECTING,
  ])('answers not_sent while %s, without sending or waiting', async (connectionState) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pending = new Map<string, PendingInterruptCommand>();
    const send = vi.fn();
    await expect(admit(pending, connectionState, send)).resolves.toEqual({ kind: 'not_sent' });
    expect(send).not.toHaveBeenCalled();
    expect(pending.size).toBe(0);
  });

  it('answers not_sent when the send throws, and keeps nothing waiting', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pending = new Map<string, PendingInterruptCommand>();
    await expect(admit(pending, ConnectionState.CONNECTED, () => { throw new Error('native send failed'); }))
      .resolves.toEqual({ kind: 'not_sent' });
    expect(pending.size).toBe(0);
  });

  it('settles a sent Stop by its own answer only: accepted, or refused with the node detail', async () => {
    const pending = new Map<string, PendingInterruptCommand>();
    const accepted = admit(pending, ConnectionState.CONNECTED);
    expect(settlePendingInterruptAck(pending, { commandId: 'client_interrupt_1', target: { target_kind: 'standalone_run', run_id: 'other' }, accepted: true, detail: '' })).toBe(false);
    expect(settlePendingInterruptAck(pending, { commandId: 'client_interrupt_1', target, accepted: true, detail: '' })).toBe(true);
    await expect(accepted).resolves.toEqual({ kind: 'accepted' });
    expect(settlePendingInterruptAck(pending, { commandId: 'client_interrupt_1', target, accepted: true, detail: '' })).toBe(false);

    const refused = admit(pending, ConnectionState.CONNECTED);
    settlePendingInterruptAck(pending, { commandId: 'client_interrupt_1', target, accepted: false, detail: '[RUNTIME_COMMAND_FAILED] x' });
    await expect(refused).resolves.toEqual({ kind: 'refused', detail: '[RUNTIME_COMMAND_FAILED] x' });
  });

  it('holds lost Stops until settle, then settles each exactly once as connection_lost', async () => {
    const pending = new Map<string, PendingInterruptCommand>();
    const holder = new InterruptsAwaitingRebind();
    const outcomes: string[] = [];
    void admit(pending, ConnectionState.CONNECTED).then((outcome) => outcomes.push(outcome.kind));
    holder.holdPending(pending);
    expect(pending.size).toBe(0);
    await Promise.resolve();
    expect(outcomes).toEqual([]);
    holder.settle();
    holder.settle();
    await Promise.resolve();
    expect(outcomes).toEqual(['connection_lost']);
  });
});
