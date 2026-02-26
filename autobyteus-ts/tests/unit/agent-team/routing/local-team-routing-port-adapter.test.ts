import { describe, expect, it, vi } from 'vitest';

import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from '../../../../src/agent-team/events/agent-team-events.js';
import { TeamNodeNotLocalException } from '../../../../src/agent-team/exceptions.js';
import { createLocalTeamRoutingPortAdapter } from '../../../../src/agent-team/routing/local-team-routing-port-adapter.js';

describe('createLocalTeamRoutingPortAdapter', () => {
  it('dispatches inter-agent message to agent targets', async () => {
    const targetNode = {
      agentId: 'recipient-id',
      context: { config: { role: 'Recipient' } },
      postInterAgentMessage: vi.fn(async () => undefined),
    };
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => targetNode),
    });
    const event = new InterAgentMessageRequestEvent('sender-id', 'recipient', 'hello', 'TASK_ASSIGNMENT');

    const result = await port.dispatchInterAgentMessageRequest(event);

    expect(result).toEqual({ accepted: true });
    expect(targetNode.postInterAgentMessage).toHaveBeenCalledTimes(1);
    const sentMessage = targetNode.postInterAgentMessage.mock.calls[0][0];
    expect(sentMessage.content).toBe('hello');
    expect(sentMessage.senderAgentId).toBe('sender-id');
  });

  it('dispatches inter-agent message to sub-team targets', async () => {
    const targetNode = {
      postMessage: vi.fn(async () => undefined),
    };
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => targetNode),
    });
    const event = new InterAgentMessageRequestEvent('sender-id', 'recipient', 'hello-team', 'TASK_ASSIGNMENT');

    const result = await port.dispatchInterAgentMessageRequest(event);

    expect(result).toEqual({ accepted: true });
    expect(targetNode.postMessage).toHaveBeenCalledTimes(1);
    expect(targetNode.postMessage.mock.calls[0][0]).toBeInstanceOf(AgentInputUserMessage);
    expect(targetNode.postMessage.mock.calls[0][0].content).toBe('hello-team');
  });

  it('dispatches user message to target node', async () => {
    const userMessage = new AgentInputUserMessage('hello');
    const targetNode = {
      postUserMessage: vi.fn(async () => undefined),
    };
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => targetNode),
    });
    const event = new ProcessUserMessageEvent(userMessage, 'recipient');

    const result = await port.dispatchUserMessage(event);

    expect(result).toEqual({ accepted: true });
    expect(targetNode.postUserMessage).toHaveBeenCalledWith(userMessage);
  });

  it('dispatches tool approval to target node', async () => {
    const targetNode = {
      agentId: 'recipient-id',
      postToolExecutionApproval: vi.fn(async () => undefined),
    };
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => targetNode),
    });
    const event = new ToolApprovalTeamEvent('recipient', 'tool-1', true, 'approved');

    const result = await port.dispatchToolApproval(event);

    expect(result).toEqual({ accepted: true });
    expect(targetNode.postToolExecutionApproval).toHaveBeenCalledWith('tool-1', true, 'approved');
  });

  it('preserves target method binding when dispatching tool approval to agents', async () => {
    class BoundAgentTarget {
      agentId = 'recipient-id';
      approvals: Array<{ toolInvocationId: string; isApproved: boolean; reason?: string }> = [];

      async postToolExecutionApproval(
        toolInvocationId: string,
        isApproved: boolean,
        reason?: string,
      ): Promise<void> {
        // This assertion fails if dispatch calls an unbound function.
        this.approvals.push({ toolInvocationId, isApproved, reason });
      }
    }

    const targetNode = new BoundAgentTarget();
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => targetNode),
    });
    const event = new ToolApprovalTeamEvent('recipient', 'tool-2', true, 'approved');

    const result = await port.dispatchToolApproval(event);

    expect(result).toEqual({ accepted: true });
    expect(targetNode.approvals).toEqual([
      { toolInvocationId: 'tool-2', isApproved: true, reason: 'approved' },
    ]);
  });

  it('dispatches tool approval to sub-team proxy targets', async () => {
    const targetNode = {
      postToolExecutionApproval: vi.fn(async () => undefined),
    };
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => targetNode),
    });
    const event = new ToolApprovalTeamEvent('recipient', 'tool-1', true, 'approved');

    const result = await port.dispatchToolApproval(event);

    expect(result).toEqual({ accepted: true });
    expect(targetNode.postToolExecutionApproval).toHaveBeenCalledWith('recipient', 'tool-1', true, 'approved');
  });

  it('returns rejected result when node resolution fails', async () => {
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => {
        throw new Error('missing node');
      }),
    });
    const event = new InterAgentMessageRequestEvent('sender-id', 'recipient', 'hello', 'TASK_ASSIGNMENT');

    const result = await port.dispatchInterAgentMessageRequest(event);

    expect(result.accepted).toBe(false);
    expect(result.errorCode).toBe('LOCAL_INTER_AGENT_DISPATCH_FAILED');
    expect(result.errorMessage).toContain('missing node');
  });

  it('returns TARGET_NODE_NOT_LOCAL when target member is non-local', async () => {
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(async () => {
        throw new TeamNodeNotLocalException('professor', 'team_1');
      }),
    });
    const event = new InterAgentMessageRequestEvent('sender-id', 'professor', 'hello', 'TASK_ASSIGNMENT');

    const result = await port.dispatchInterAgentMessageRequest(event);

    expect(result.accepted).toBe(false);
    expect(result.errorCode).toBe('TARGET_NODE_NOT_LOCAL');
    expect(result.errorMessage).toContain("Node 'professor' is not local");
  });

  it('rejects unsupported control stop dispatch', async () => {
    const port = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: vi.fn(),
    });

    const result = await port.dispatchControlStop();

    expect(result.accepted).toBe(false);
    expect(result.errorCode).toBe('UNSUPPORTED_LOCAL_ROUTE');
  });
});
