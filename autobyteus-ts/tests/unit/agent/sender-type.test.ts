import { describe, it, expect } from 'vitest';
import { SenderType, TASK_NOTIFIER_SENDER_ID } from '../../../src/agent/sender-type.js';

describe('SenderType', () => {
  it('defines expected sender types', () => {
    expect(SenderType.USER).toBe('user');
    expect(SenderType.AGENT).toBe('agent');
    expect(SenderType.SYSTEM).toBe('system');
    expect(SenderType.TOOL).toBe('tool');
  });

  it('exposes the task notifier sender id', () => {
    expect(TASK_NOTIFIER_SENDER_ID).toBe('system.task_notifier');
  });
});
