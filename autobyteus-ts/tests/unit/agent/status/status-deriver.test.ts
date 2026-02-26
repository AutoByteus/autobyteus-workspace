import { describe, it, expect } from 'vitest';
import { AgentStatusDeriver } from '../../../../src/agent/status/status-deriver.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import {
  BootstrapStartedEvent,
  BootstrapCompletedEvent,
  AgentReadyEvent,
  AgentIdleEvent,
  ShutdownRequestedEvent,
  AgentStoppedEvent,
  AgentErrorEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  LLMUserMessageReadyEvent,
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ApprovedToolInvocationEvent,
  ToolResultEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';

const makeContext = (autoExecute: boolean) => ({ autoExecuteTools: autoExecute });

describe('AgentStatusDeriver', () => {
  it('handles bootstrap and ready transitions', () => {
    const deriver = new AgentStatusDeriver(AgentStatus.UNINITIALIZED);

    let [oldStatus, newStatus] = deriver.apply(new BootstrapStartedEvent());
    expect(oldStatus).toBe(AgentStatus.UNINITIALIZED);
    expect(newStatus).toBe(AgentStatus.BOOTSTRAPPING);
    expect(deriver.currentStatus).toBe(AgentStatus.BOOTSTRAPPING);

    [oldStatus, newStatus] = deriver.apply(new BootstrapCompletedEvent(true));
    expect(oldStatus).toBe(AgentStatus.BOOTSTRAPPING);
    expect(newStatus).toBe(AgentStatus.BOOTSTRAPPING);

    [oldStatus, newStatus] = deriver.apply(new AgentReadyEvent());
    expect(oldStatus).toBe(AgentStatus.BOOTSTRAPPING);
    expect(newStatus).toBe(AgentStatus.IDLE);

    [oldStatus, newStatus] = deriver.apply(new AgentIdleEvent());
    expect(oldStatus).toBe(AgentStatus.IDLE);
    expect(newStatus).toBe(AgentStatus.IDLE);
  });

  it('handles shutdown and error transitions', () => {
    let deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    let [, newStatus] = deriver.apply(new ShutdownRequestedEvent());
    expect(newStatus).toBe(AgentStatus.SHUTTING_DOWN);

    deriver = new AgentStatusDeriver(AgentStatus.ERROR);
    [, newStatus] = deriver.apply(new ShutdownRequestedEvent());
    expect(newStatus).toBe(AgentStatus.ERROR);

    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(new AgentStoppedEvent());
    expect(newStatus).toBe(AgentStatus.SHUTDOWN_COMPLETE);

    deriver = new AgentStatusDeriver(AgentStatus.ERROR);
    [, newStatus] = deriver.apply(new AgentStoppedEvent());
    expect(newStatus).toBe(AgentStatus.ERROR);

    [, newStatus] = deriver.apply(new AgentErrorEvent('boom', 'trace'));
    expect(newStatus).toBe(AgentStatus.ERROR);
  });

  it('handles user message and llm transitions', () => {
    let deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    let [, newStatus] = deriver.apply(new UserMessageReceivedEvent({} as any));
    expect(newStatus).toBe(AgentStatus.PROCESSING_USER_INPUT);

    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(new InterAgentMessageReceivedEvent({} as any));
    expect(newStatus).toBe(AgentStatus.PROCESSING_USER_INPUT);

    deriver = new AgentStatusDeriver(AgentStatus.PROCESSING_USER_INPUT);
    [, newStatus] = deriver.apply(new LLMUserMessageReadyEvent({} as any));
    expect(newStatus).toBe(AgentStatus.AWAITING_LLM_RESPONSE);

    deriver = new AgentStatusDeriver(AgentStatus.AWAITING_LLM_RESPONSE);
    [, newStatus] = deriver.apply(new LLMUserMessageReadyEvent({} as any));
    expect(newStatus).toBe(AgentStatus.AWAITING_LLM_RESPONSE);

    deriver = new AgentStatusDeriver(AgentStatus.ERROR);
    [, newStatus] = deriver.apply(new LLMUserMessageReadyEvent({} as any));
    expect(newStatus).toBe(AgentStatus.ERROR);

    deriver = new AgentStatusDeriver(AgentStatus.AWAITING_LLM_RESPONSE);
    [, newStatus] = deriver.apply(new LLMCompleteResponseReceivedEvent({} as any));
    expect(newStatus).toBe(AgentStatus.ANALYZING_LLM_RESPONSE);

    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(new LLMCompleteResponseReceivedEvent({} as any));
    expect(newStatus).toBe(AgentStatus.IDLE);
  });

  it('handles tool related transitions', () => {
    const invocation = new ToolInvocation('tool', {}, 'tid1');
    const pendingEvent = new PendingToolInvocationEvent(invocation);
    const context = makeContext(false);

    let deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    let [, newStatus] = deriver.apply(pendingEvent, context as any);
    expect(newStatus).toBe(AgentStatus.AWAITING_TOOL_APPROVAL);

    context.autoExecuteTools = true;
    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(pendingEvent, context as any);
    expect(newStatus).toBe(AgentStatus.EXECUTING_TOOL);

    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(new ApprovedToolInvocationEvent(invocation), context as any);
    expect(newStatus).toBe(AgentStatus.EXECUTING_TOOL);

    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(new ToolExecutionApprovalEvent('tid1', true), context as any);
    expect(newStatus).toBe(AgentStatus.EXECUTING_TOOL);

    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(new ToolExecutionApprovalEvent('tid1', false), context as any);
    expect(newStatus).toBe(AgentStatus.TOOL_DENIED);

    const resultEvent = new ToolResultEvent('tool', 'ok');
    deriver = new AgentStatusDeriver(AgentStatus.IDLE);
    [, newStatus] = deriver.apply(resultEvent, context as any);
    expect(newStatus).toBe(AgentStatus.IDLE);

    deriver = new AgentStatusDeriver(AgentStatus.EXECUTING_TOOL);
    [, newStatus] = deriver.apply(resultEvent, context as any);
    expect(newStatus).toBe(AgentStatus.PROCESSING_TOOL_RESULT);
  });
});
