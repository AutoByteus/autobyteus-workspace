import { describe, it, expect } from 'vitest';
import { AgentInputBox } from '../../../../src/agent/input-box/agent-input-box.js';
import {
  AgentReadyEvent,
  InterAgentMessageReceivedEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { SenderType } from '../../../../src/agent/sender-type.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('AgentInputBox', () => {
  it('exposes external user and inter-agent messages as explicit turn triggers', async () => {
    const box = new AgentInputBox();
    const userEvent = new UserMessageReceivedEvent(new AgentInputUserMessage('hello'));
    const interAgentEvent = new InterAgentMessageReceivedEvent({} as any);

    await box.enqueueUserMessage(userEvent);
    await box.enqueueInterAgentMessage(interAgentEvent);

    expect(await timeout(box.nextTurnTriggerWhenIdle())).toEqual({
      kind: 'turn_trigger',
      source: 'user_message',
      event: userEvent
    });
    expect(await timeout(box.nextTurnTriggerWhenIdle())).toEqual({
      kind: 'turn_trigger',
      source: 'inter_agent_message',
      event: interAgentEvent
    });
  });

  it('keeps lifecycle messages explicitly discriminated so they are not turn triggers', async () => {
    const box = new AgentInputBox();
    const lifecycleEvent = new AgentReadyEvent();

    await box.enqueueLifecycleMessage(lifecycleEvent);

    expect(await timeout(box.nextTurnTriggerWhenIdle())).toEqual({
      kind: 'runtime_lifecycle',
      event: lifecycleEvent
    });
  });

  it('rejects turn-local approvals, results, and TOOL continuations', async () => {
    const box = new AgentInputBox();

    await expect(
      box.enqueueLifecycleMessage(new ToolExecutionApprovalEvent('invocation-1', true))
    ).rejects.toThrow(/turn-local tool approvals\/results/);

    await expect(
      box.enqueueLifecycleMessage(new ToolResultEvent('tool', { ok: true }, 'invocation-1'))
    ).rejects.toThrow(/turn-local tool approvals\/results/);

    await expect(
      box.enqueueUserMessage(
        new UserMessageReceivedEvent(new AgentInputUserMessage('tool result', SenderType.TOOL))
      )
    ).rejects.toThrow(/TOOL continuations/);
  });
});
