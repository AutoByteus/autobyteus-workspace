import { describe, it, expect } from 'vitest';
import { InterAgentMessage } from '../../../../src/agent/message/inter-agent-message.js';

describe('InterAgentMessage', () => {
  it('compares messages for equality', () => {
    const msg1 = new InterAgentMessage('role', 'agent-1', 'hello', 'task_assignment', 'sender-1');
    const msg2 = new InterAgentMessage('role', 'agent-1', 'hello', 'task_assignment', 'sender-1');
    const msg3 = new InterAgentMessage('role', 'agent-1', 'hi', 'task_assignment', 'sender-1');

    expect(msg1.equals(msg2)).toBe(true);
    expect(msg1.equals(msg3)).toBe(false);
  });

  it('creates with dynamic message type', () => {
    const msg = InterAgentMessage.createWithDynamicMessageType(
      'role',
      'agent-2',
      'content',
      'custom_type',
      'sender-2'
    );

    expect(msg.messageType).toBe('custom_type');
  });

  it('renders a readable string', () => {
    const msg = new InterAgentMessage('role', 'agent-1', 'hello', 'error', 'sender-1');
    expect(msg.toString()).toContain('InterAgentMessage');
    expect(msg.toString()).toContain('messageType');
  });

  it('rejects empty message type', () => {
    expect(
      () => new InterAgentMessage('role', 'agent-1', 'hello', '   ', 'sender-1')
    ).toThrow('messageType cannot be empty');
  });
});
