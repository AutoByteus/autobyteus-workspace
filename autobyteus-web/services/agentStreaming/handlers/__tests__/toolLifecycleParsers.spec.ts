import { describe, expect, it } from 'vitest';
import {
  parseToolApprovalRequestedPayload,
  parseToolApprovedPayload,
  parseToolDeniedPayload,
  parseToolExecutionFailedPayload,
  parseToolExecutionStartedPayload,
  parseToolExecutionSucceededPayload,
  parseToolLogPayload,
} from '../toolLifecycleParsers';

describe('toolLifecycleParsers', () => {
  it('parses valid lifecycle payloads', () => {
    expect(
      parseToolApprovalRequestedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        arguments: { path: '/tmp/a.txt' },
      } as any),
    ).toEqual({
      invocationId: 'inv-1',
      toolName: 'read_file',
      turnId: null,
      arguments: { path: '/tmp/a.txt' },
    });

    expect(
      parseToolApprovedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        reason: 'ok',
      } as any),
    )?.toMatchObject({ invocationId: 'inv-1', reason: 'ok' });

    expect(
      parseToolExecutionStartedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        arguments: { path: '/tmp/a.txt' },
      } as any),
    )?.toMatchObject({ invocationId: 'inv-1', arguments: { path: '/tmp/a.txt' } });

    expect(
      parseToolExecutionSucceededPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        result: { content: 'hello' },
      } as any),
    )?.toMatchObject({ invocationId: 'inv-1', result: { content: 'hello' } });

    expect(
      parseToolExecutionFailedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        error: 'failure',
      } as any),
    )?.toMatchObject({ invocationId: 'inv-1', error: 'failure' });

    expect(
      parseToolLogPayload({
        tool_invocation_id: 'inv-1',
        tool_name: 'read_file',
        log_entry: 'log line',
      } as any),
    ).toEqual({
      invocationId: 'inv-1',
      toolName: 'read_file',
      logEntry: 'log line',
    });
  });

  it('rejects malformed payloads', () => {
    expect(parseToolApprovalRequestedPayload({ invocation_id: '', tool_name: 'x', arguments: {} } as any)).toBeNull();
    expect(parseToolApprovedPayload({ invocation_id: 'inv', tool_name: '' } as any)).toBeNull();
    expect(
      parseToolDeniedPayload({
        invocation_id: 'inv',
        tool_name: 'x',
        reason: null,
        error: null,
      } as any),
    ).toBeNull();
    expect(parseToolExecutionFailedPayload({ invocation_id: 'inv', tool_name: 'x', error: '' } as any)).toBeNull();
    expect(parseToolLogPayload({ tool_invocation_id: 'inv', tool_name: 'x', log_entry: '' } as any)).toBeNull();
  });
});
