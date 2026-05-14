import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyEventAndDeriveStatus: vi.fn(async () => undefined),
  inputProcessExternal: vi.fn(),
  inputProcessToolContinuation: vi.fn(),
  llmRun: vi.fn(),
  toolRun: vi.fn(),
  toolResultProcess: vi.fn(),
  llmResponseProcess: vi.fn(async () => undefined),
  continuationBuild: vi.fn(),
  notifyTurnStarted: vi.fn(),
  notifyTurnCompleted: vi.fn(),
  notifyTurnInterrupted: vi.fn(),
  notifyError: vi.fn(),
  notifyToolExecutionSucceeded: vi.fn(),
  notifyToolExecutionFailed: vi.fn(),
  notifyToolLog: vi.fn()
}));

vi.mock('../../../../src/agent/status/status-update-utils.js', () => ({
  applyEventAndDeriveStatus: mocks.applyEventAndDeriveStatus
}));

vi.mock('../../../../src/agent/pipelines/agent-input-pipeline.js', () => ({
  AgentInputPipeline: class MockAgentInputPipeline {
    processExternalTrigger = mocks.inputProcessExternal;
    processToolContinuation = mocks.inputProcessToolContinuation;
  }
}));

vi.mock('../../../../src/agent/loop/llm-phase.js', () => ({
  LlmPhase: class MockLlmPhase {
    run = mocks.llmRun;
  }
}));

vi.mock('../../../../src/agent/loop/tool-phase.js', () => ({
  ToolPhase: class MockToolPhase {
    run = mocks.toolRun;
  }
}));

vi.mock('../../../../src/agent/pipelines/tool-result-pipeline.js', () => ({
  ToolResultPipeline: class MockToolResultPipeline {
    process = mocks.toolResultProcess;
  }
}));

vi.mock('../../../../src/agent/pipelines/llm-response-pipeline.js', () => ({
  LLMResponsePipeline: class MockLLMResponsePipeline {
    processFinalResponse = mocks.llmResponseProcess;
  }
}));

vi.mock('../../../../src/agent/loop/tool-result-continuation-builder.js', () => ({
  ToolResultContinuationBuilder: class MockToolResultContinuationBuilder {
    build = mocks.continuationBuild;
  }
}));

import { AgentTurnRunner } from '../../../../src/agent/loop/agent-turn-runner.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import {
  LLMUserMessageReadyEvent,
  ToolContinuationReadyEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

const makeContextAndTurn = () => {
  const state = new AgentRuntimeState('agent-1');
  const finalizeInterruptedTurn = vi.fn(async () => undefined);
  state.memoryManager = {
    startTurn: () => 'turn-1',
    finalizeInterruptedTurn
  } as any;
  const turn = state.startActiveTurn('turn-1');
  const context = {
    agentId: 'agent-1',
    state,
    statusManager: {
      notifier: {
        notifyAgentTurnStarted: mocks.notifyTurnStarted,
        notifyAgentTurnCompleted: mocks.notifyTurnCompleted,
        notifyAgentTurnInterrupted: mocks.notifyTurnInterrupted,
        notifyAgentErrorOutputGeneration: mocks.notifyError,
        notifyAgentToolExecutionSucceeded: mocks.notifyToolExecutionSucceeded,
        notifyAgentToolExecutionFailed: mocks.notifyToolExecutionFailed,
        notifyAgentDataToolLog: mocks.notifyToolLog
      }
    }
  } as any;
  return { context, turn, finalizeInterruptedTurn };
};

const makeTrigger = () => new UserMessageReceivedEvent(new AgentInputUserMessage('hello'));

describe('AgentTurnRunner interruption fences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inputProcessExternal.mockResolvedValue({ llmUserMessage: { role: 'user', content: 'hello' } });
    mocks.inputProcessToolContinuation.mockResolvedValue({
      llmUserMessage: { role: 'tool', content: 'tool result' },
      sourceEvent: {} as any
    });
    mocks.toolResultProcess.mockImplementation(async (event) => event);
    mocks.continuationBuild.mockReturnValue({ content: 'tool result continuation' });
  });

  it('does not publish final LLM completion after an interrupt accepted at the post-LLM seam', async () => {
    const { context, turn, finalizeInterruptedTurn } = makeContextAndTurn();
    mocks.llmRun.mockImplementation(async (_nextInput, _context, activeTurn) => {
      activeTurn.interrupt('post_llm_interrupt');
      return {
        kind: 'final',
        response: new CompleteResponse({ content: 'normal completion that must be fenced' })
      };
    });

    const outcome = await new AgentTurnRunner(context, turn).run(makeTrigger());

    expect(outcome).toMatchObject({ kind: 'interrupted', turnId: 'turn-1', reason: 'post_llm_interrupt' });
    expect(mocks.llmResponseProcess).not.toHaveBeenCalled();
    expect(finalizeInterruptedTurn).toHaveBeenCalledWith({
      turnId: 'turn-1',
      reason: 'post_llm_interrupt',
      outcome: { kind: 'interrupted', turnId: 'turn-1', reason: 'post_llm_interrupt' },
      completedToolResults: []
    });
    expect(mocks.notifyTurnCompleted).not.toHaveBeenCalled();
    expect(mocks.notifyTurnInterrupted).toHaveBeenCalledWith('turn-1', 'post_llm_interrupt');
  });

  it('uses ToolContinuationReadyEvent instead of synthetic LLMUserMessageReadyEvent for native tool-history continuations', async () => {
    const { context, turn } = makeContextAndTurn();
    const invocation = new ToolInvocation('tool', {}, 'inv-1', 'turn-1');
    mocks.llmRun
      .mockResolvedValueOnce({
        kind: 'tool_invocations',
        response: new CompleteResponse({ content: '' }),
        toolInvocations: [invocation]
      })
      .mockResolvedValueOnce({
        kind: 'final',
        response: new CompleteResponse({ content: 'done' })
      });
    mocks.toolRun.mockResolvedValue([
      new ToolResultEvent('tool', { ok: true }, 'inv-1', undefined, {}, 'turn-1', false)
    ]);
    mocks.inputProcessToolContinuation.mockResolvedValue({
      llmUserMessage: { role: 'tool', content: 'Native API tool continuation' },
      sourceEvent: {} as any,
      llmRequestMode: 'tool_history_only'
    });

    const outcome = await new AgentTurnRunner(context, turn).run(makeTrigger());

    expect(outcome).toMatchObject({ kind: 'completed', turnId: 'turn-1' });
    const appliedEvents = mocks.applyEventAndDeriveStatus.mock.calls.map(([event]) => event);
    expect(
      appliedEvents.some(
        (event) => event instanceof ToolContinuationReadyEvent && event.turnId === 'turn-1'
      )
    ).toBe(true);
    expect(
      appliedEvents.filter(
        (event) =>
          event instanceof LLMUserMessageReadyEvent &&
          String((event as LLMUserMessageReadyEvent).llmUserMessage?.content ?? '').includes(
            'Native API tool continuation'
          )
      )
    ).toHaveLength(0);
    expect(mocks.llmRun.mock.calls[1][0]).toEqual(expect.objectContaining({
      llmRequestMode: 'tool_history_only'
    }));
  });

  it('does not process tool results or publish terminal tool success after an interrupt accepted at the post-tool seam', async () => {
    const { context, turn, finalizeInterruptedTurn } = makeContextAndTurn();
    const invocation = new ToolInvocation('tool', {}, 'inv-1', 'turn-1');
    mocks.llmRun.mockResolvedValue({
      kind: 'tool_invocations',
      response: new CompleteResponse({ content: '' }),
      toolInvocations: [invocation]
    });
    const completedResult = new ToolResultEvent('tool', { ok: true }, 'inv-1', undefined, {}, 'turn-1', false);
    mocks.toolRun.mockImplementation(async (_invocations, _context, activeTurn, _notifier, options) => {
      await options.onToolResult(completedResult);
      activeTurn.interrupt('post_tool_interrupt');
      return [completedResult];
    });

    const outcome = await new AgentTurnRunner(context, turn).run(makeTrigger());

    expect(outcome).toMatchObject({ kind: 'interrupted', turnId: 'turn-1', reason: 'post_tool_interrupt' });
    expect(mocks.toolResultProcess).not.toHaveBeenCalled();
    expect(finalizeInterruptedTurn).toHaveBeenCalledWith({
      turnId: 'turn-1',
      reason: 'post_tool_interrupt',
      outcome: { kind: 'interrupted', turnId: 'turn-1', reason: 'post_tool_interrupt' },
      completedToolResults: [completedResult]
    });
    expect(mocks.notifyToolExecutionSucceeded).not.toHaveBeenCalled();
    expect(mocks.notifyToolExecutionFailed).not.toHaveBeenCalled();
    expect(mocks.notifyTurnCompleted).not.toHaveBeenCalled();
    expect(mocks.notifyTurnInterrupted).toHaveBeenCalledWith('turn-1', 'post_tool_interrupt');
  });
});
