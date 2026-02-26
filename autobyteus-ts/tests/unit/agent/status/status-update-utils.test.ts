import { describe, it, expect, beforeEach } from 'vitest';
import { buildStatusUpdateData, applyEventAndDeriveStatus } from '../../../../src/agent/status/status-update-utils.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentStatusDeriver } from '../../../../src/agent/status/status-deriver.js';
import {
  UserMessageReceivedEvent,
  PendingToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ApprovedToolInvocationEvent,
  ToolResultEvent,
  AgentErrorEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { AgentEventStore } from '../../../../src/agent/events/event-store.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeContext = (): AgentContext => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const config = new AgentConfig('name', 'role', 'desc', llm);
  const state = new AgentRuntimeState('agent-1');
  return new AgentContext('agent-1', config, state);
};

describe('status_update_utils', () => {
  let agentContext: AgentContext;

  beforeEach(() => {
    agentContext = makeContext();
  });

  it('builds status update data for processing user input', () => {
    const event = new UserMessageReceivedEvent({} as any);
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.PROCESSING_USER_INPUT);
    expect(data).toEqual({ trigger: 'UserMessageReceivedEvent' });
  });

  it('builds status update data for executing tool (pending invocation)', () => {
    const invocation = new ToolInvocation('test_tool', {}, 'tid1');
    const event = new PendingToolInvocationEvent(invocation);
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.EXECUTING_TOOL);
    expect(data).toEqual({ tool_name: 'test_tool' });
  });

  it('builds status update data for executing tool (approved invocation)', () => {
    const invocation = new ToolInvocation('approved_tool', {}, 'tid2');
    const event = new ApprovedToolInvocationEvent(invocation);
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.EXECUTING_TOOL);
    expect(data).toEqual({ tool_name: 'approved_tool' });
  });

  it('builds status update data for execution approval unknown tool', () => {
    const event = new ToolExecutionApprovalEvent('missing', true);
    agentContext.state.pendingToolApprovals = {};
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.EXECUTING_TOOL);
    expect(data).toEqual({ tool_name: 'unknown_tool' });
  });

  it('builds status update data for tool denied', () => {
    const invocation = new ToolInvocation('deny_tool', {}, 'tid3');
    agentContext.state.pendingToolApprovals = { tid3: invocation };
    const event = new ToolExecutionApprovalEvent('tid3', false);
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.TOOL_DENIED);
    expect(data).toEqual({ tool_name: 'deny_tool', denial_for_tool: 'deny_tool' });
  });

  it('builds status update data for processing tool result', () => {
    const event = new ToolResultEvent('tool_result', 'ok');
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.PROCESSING_TOOL_RESULT);
    expect(data).toEqual({ tool_name: 'tool_result' });
  });

  it('builds status update data for error', () => {
    const event = new AgentErrorEvent('boom', 'trace');
    const data = buildStatusUpdateData(event, agentContext, AgentStatus.ERROR);
    expect(data).toEqual({ error_message: 'boom', error_details: 'trace' });
  });

  it('apply_event_and_derive_status updates status and emits', async () => {
    agentContext.state.statusDeriver = new AgentStatusDeriver(AgentStatus.IDLE);
    agentContext.currentStatus = AgentStatus.IDLE;
    agentContext.state.eventStore = new AgentEventStore(agentContext.agentId);

    const emitCalls: any[] = [];
    agentContext.state.statusManagerRef = {
      emit_status_update: async (...args: any[]) => {
        emitCalls.push(args);
      }
    } as any;

    const event = new UserMessageReceivedEvent({} as any);
    const [oldStatus, newStatus] = await applyEventAndDeriveStatus(event, agentContext);

    expect(oldStatus).toBe(AgentStatus.IDLE);
    expect(newStatus).toBe(AgentStatus.PROCESSING_USER_INPUT);
    expect(agentContext.currentStatus).toBe(AgentStatus.PROCESSING_USER_INPUT);
    expect(emitCalls).toHaveLength(1);
    expect(emitCalls[0][0]).toBe(AgentStatus.IDLE);
    expect(emitCalls[0][1]).toBe(AgentStatus.PROCESSING_USER_INPUT);
    expect(emitCalls[0][2]).toEqual({ trigger: 'UserMessageReceivedEvent' });
    expect(agentContext.state.eventStore?.allEvents().length).toBe(1);
  });

  it('apply_event_and_derive_status does nothing without deriver', async () => {
    agentContext.state.statusDeriver = null;
    agentContext.currentStatus = AgentStatus.IDLE;

    const emitSpy = { emit_status_update: async () => undefined };
    agentContext.state.statusManagerRef = emitSpy as any;

    const event = new UserMessageReceivedEvent({} as any);
    const [oldStatus, newStatus] = await applyEventAndDeriveStatus(event, agentContext);

    expect(oldStatus).toBe(AgentStatus.IDLE);
    expect(newStatus).toBe(AgentStatus.IDLE);
  });
});
