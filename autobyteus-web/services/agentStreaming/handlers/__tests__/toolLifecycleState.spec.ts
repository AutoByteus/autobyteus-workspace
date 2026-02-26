import { describe, expect, it } from 'vitest';
import {
  appendLog,
  applyApprovedState,
  applyApprovalRequestedState,
  applyDeniedState,
  applyExecutionFailedState,
  applyExecutionStartedState,
  applyExecutionSucceededState,
  isTerminalStatus,
} from '../toolLifecycleState';
import type { ToolCallSegment } from '~/types/segments';

const buildSegment = (): ToolCallSegment => ({
  type: 'tool_call',
  invocationId: 'inv-1',
  toolName: 'read_file',
  arguments: {},
  status: 'parsed',
  logs: [],
  result: null,
  error: null,
  rawContent: '',
});

describe('toolLifecycleState', () => {
  it('supports monotonic non-terminal progression', () => {
    const segment = buildSegment();
    expect(applyApprovalRequestedState(segment)).toBe(true);
    expect(segment.status).toBe('awaiting-approval');

    expect(applyApprovedState(segment)).toBe(true);
    expect(segment.status).toBe('approved');

    expect(applyExecutionStartedState(segment)).toBe(true);
    expect(segment.status).toBe('executing');
  });

  it('does not regress from started back to approved', () => {
    const segment = buildSegment();
    applyExecutionStartedState(segment);
    expect(applyApprovedState(segment)).toBe(false);
    expect(segment.status).toBe('executing');
  });

  it('does not allow non-terminal transitions from terminal states', () => {
    const segment = buildSegment();
    applyExecutionSucceededState(segment, { ok: true });

    expect(applyExecutionStartedState(segment)).toBe(false);
    expect(applyApprovalRequestedState(segment)).toBe(false);
    expect(segment.status).toBe('success');
  });

  it('applies denied as terminal and blocks success/failed overrides', () => {
    const segment = buildSegment();
    expect(applyDeniedState(segment, 'Denied', null)).toBe(true);
    expect(segment.status).toBe('denied');

    expect(applyExecutionSucceededState(segment, { ok: true })).toBe(false);
    expect(applyExecutionFailedState(segment, 'oops')).toBe(false);
    expect(segment.status).toBe('denied');
  });

  it('appends logs without status mutation', () => {
    const segment = buildSegment();
    appendLog(segment, 'line-1');
    appendLog(segment, 'line-2');
    expect(segment.logs).toEqual(['line-1', 'line-2']);
    expect(segment.status).toBe('parsed');
  });

  it('exposes terminal status predicate', () => {
    expect(isTerminalStatus('success')).toBe(true);
    expect(isTerminalStatus('error')).toBe(true);
    expect(isTerminalStatus('denied')).toBe(true);
    expect(isTerminalStatus('executing')).toBe(false);
  });
});
