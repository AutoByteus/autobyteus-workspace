import { describe, it, expect, vi } from 'vitest';
import { InterAgentMessageRequestEvent, ProcessUserMessageEvent, ToolApprovalTeamEvent } from '../../../../src/agent-team/events/agent-team-events.js';
import type { TeamRoutingPort } from '../../../../src/agent-team/ports/team-routing-port.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';

describe('TeamRoutingPort contract', () => {
  it('supports all dispatch entry points with deterministic dispatch result shape', async () => {
    const port: TeamRoutingPort = {
      dispatchUserMessage: vi.fn(async () => ({ accepted: true })),
      dispatchInterAgentMessageRequest: vi.fn(async () => ({ accepted: true })),
      dispatchToolApproval: vi.fn(async () => ({ accepted: true })),
      dispatchControlStop: vi.fn(async () => ({ accepted: true }))
    };

    const userEvent = new ProcessUserMessageEvent(new AgentInputUserMessage('hello'), 'Recipient');
    const interAgentEvent = new InterAgentMessageRequestEvent('sender-1', 'Recipient', 'task body', 'TASK_ASSIGNMENT');
    const toolApprovalEvent = new ToolApprovalTeamEvent('Recipient', 'inv-1', true, 'approved');

    await expect(port.dispatchUserMessage(userEvent)).resolves.toEqual({ accepted: true });
    await expect(port.dispatchInterAgentMessageRequest(interAgentEvent)).resolves.toEqual({ accepted: true });
    await expect(port.dispatchToolApproval(toolApprovalEvent)).resolves.toEqual({ accepted: true });
    await expect(port.dispatchControlStop()).resolves.toEqual({ accepted: true });
  });
});
