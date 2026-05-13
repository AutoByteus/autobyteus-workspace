import { describe, it, expect } from 'vitest';
import { AgentMessageInbox } from '../../../../src/agent/message-inbox/agent-message-inbox.js';
import {
  AgentReadyEvent,
  InterAgentMessageReceivedEvent,
  LLMCompleteResponseReceivedEvent,
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('AgentMessageInbox', () => {
  it('stores user, inter-agent, and lifecycle messages in discriminated lanes', async () => {
    const inbox = new AgentMessageInbox();
    const userEvent = new UserMessageReceivedEvent(new AgentInputUserMessage('hello'));
    const interAgentEvent = new InterAgentMessageReceivedEvent({} as any);
    const lifecycleEvent = new AgentReadyEvent();

    await inbox.postUserMessage(userEvent);
    await inbox.postInterAgentMessage(interAgentEvent);
    await inbox.postLifecycleMessage(lifecycleEvent);

    const snapshot = inbox.peekCandidates();
    expect(snapshot.turn_start.map((message) => message.kind)).toEqual(['user_message', 'inter_agent_message']);
    expect(snapshot.runtime_lifecycle.map((message) => message.kind)).toEqual(['runtime_lifecycle']);
    expect(snapshot.active_turn).toEqual([]);
  });

  it('keeps lifecycle messages explicitly discriminated so they are not turn triggers', async () => {
    const inbox = new AgentMessageInbox();
    const lifecycleEvent = new AgentReadyEvent();

    await inbox.postLifecycleMessage(lifecycleEvent);
    const claimed = inbox.claimFirst('runtime_lifecycle');

    expect(claimed).toMatchObject({
      kind: 'runtime_lifecycle',
      lane: 'runtime_lifecycle',
      event: lifecycleEvent
    });
  });

  it('rejects TOOL continuations and operational events on the lifecycle lane', async () => {
    const inbox = new AgentMessageInbox();

    await expect(
      inbox.postLifecycleMessage(new ToolExecutionApprovalEvent('invocation-1', true) as any)
    ).rejects.toThrow(/operational tool events/);

    await expect(
      inbox.postLifecycleMessage(new ToolResultEvent('tool', { ok: true }, 'invocation-1') as any)
    ).rejects.toThrow(/operational tool events/);

    await expect(
      inbox.postUserMessage(
        new UserMessageReceivedEvent(new AgentInputUserMessage('tool result', SenderType.TOOL))
      )
    ).rejects.toThrow(/TOOL continuations/);

    await expect(
      inbox.postLifecycleMessage(
        new PendingToolInvocationEvent(new ToolInvocation('tool', {}, 'invocation-1')) as any
      )
    ).rejects.toThrow(/LifecycleEvent/);

    await expect(
      inbox.postLifecycleMessage(new LLMUserMessageReadyEvent({} as any, 'turn-1') as any)
    ).rejects.toThrow(/LifecycleEvent/);

    await expect(
      inbox.postLifecycleMessage(
        new LLMCompleteResponseReceivedEvent(new CompleteResponse({ content: 'done' }), false, 'turn-1') as any
      )
    ).rejects.toThrow(/LifecycleEvent/);
  });

  it('resolves awaitable active-turn messages only through handler completion', async () => {
    const inbox = new AgentMessageInbox();
    const resultPromise = inbox.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      approved: true
    });
    const message = inbox.claimFirst('active_turn');

    expect(message?.kind).toBe('tool_approval');
    inbox.resolveAwaitable(message!, {
      accepted: false,
      code: 'no_active_turn',
      invocationId: 'inv-1',
      message: 'no active turn'
    });

    await expect(timeout(resultPromise)).resolves.toMatchObject({
      accepted: false,
      code: 'no_active_turn'
    });
  });
});
