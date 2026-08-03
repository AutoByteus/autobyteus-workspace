import { describe, expect, it, vi } from 'vitest';
import { ConnectionState } from '../transport';
import {
  completePendingInterruptTransportFailure,
  drainPendingInterruptTransportFailures,
  tryAdmitInterruptCommand,
} from '../interruptCommandAdmission';
import type { PendingInterruptCommand } from '../protocol';

const entry: PendingInterruptCommand = {
  commandId: 'client_interrupt_1',
  target: { target_kind: 'standalone_run', run_id: 'run-1' },
};

describe('interrupt command admission', () => {
  it.each([
    ConnectionState.DISCONNECTED,
    ConnectionState.CONNECTING,
    ConnectionState.RECONNECTING,
  ])('registers then rejects %s without sending', (connectionState) => {
    const pending = new Map<string, PendingInterruptCommand>();
    const send = vi.fn();
    const onTransportFailure = vi.fn();

    expect(tryAdmitInterruptCommand({
      pending, entry, getConnectionState: () => connectionState, send, onTransportFailure,
    })).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(pending.size).toBe(0);
    expect(onTransportFailure).toHaveBeenCalledWith(expect.objectContaining({
      commandId: entry.commandId,
      target: entry.target,
      reason: expect.objectContaining({ code: 'INTERRUPT_TRANSPORT_NOT_CONNECTED', connectionState }),
    }));
  });

  it('deletes before reporting a synchronous send failure', () => {
    const pending = new Map<string, PendingInterruptCommand>();
    const onTransportFailure = vi.fn(() => {
      expect(pending.has(entry.commandId)).toBe(false);
    });

    expect(tryAdmitInterruptCommand({
      pending,
      entry,
      getConnectionState: () => ConnectionState.CONNECTED,
      send: () => { throw new Error('native send failed'); },
      onTransportFailure,
    })).toBe(false);
    expect(onTransportFailure).toHaveBeenCalledWith(expect.objectContaining({
      reason: expect.objectContaining({
        code: 'INTERRUPT_TRANSPORT_SEND_FAILED',
        message: 'native send failed',
      }),
    }));
  });

  it('keeps admitted commands pending and completes each ID at most once', () => {
    const pending = new Map<string, PendingInterruptCommand>();
    const onTransportFailure = vi.fn();
    expect(tryAdmitInterruptCommand({
      pending,
      entry,
      getConnectionState: () => ConnectionState.CONNECTED,
      send: vi.fn(),
      onTransportFailure,
    })).toBe(true);
    expect(pending.get(entry.commandId)).toEqual(entry);

    const reason = {
      code: 'INTERRUPT_TRANSPORT_DISCONNECTED' as const,
      connectionState: ConnectionState.DISCONNECTED,
      message: 'socket closed',
    };
    expect(drainPendingInterruptTransportFailures({ pending, reason, onTransportFailure })).toBe(1);
    expect(completePendingInterruptTransportFailure({
      pending, commandId: entry.commandId, reason, onTransportFailure,
    })).toBe(false);
    expect(onTransportFailure).toHaveBeenCalledTimes(1);
  });
});
