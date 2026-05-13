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
  publishTurnStarted: vi.fn(),
  publishTurnCompleted: vi.fn(),
  publishTurnInterrupted: vi.fn(),
  publishError: vi.fn(),
  publishToolExecutionSucceeded: vi.fn(),
  publishToolExecutionFailed: vi.fn(),
  publishToolLog: vi.fn()
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

vi.mock('../../../../src/agent/outbox/agent-outbox.js', () => ({
  AgentOutbox: class MockAgentOutbox {
    publishTurnStarted = mocks.publishTurnStarted;
    publishTurnCompleted = mocks.publishTurnCompleted;
    publishTurnInterrupted = mocks.publishTurnInterrupted;
    publishError = mocks.publishError;
    publishToolExecutionSucceeded = mocks.publishToolExecutionSucceeded;
    publishToolExecutionFailed = mocks.publishToolExecutionFailed;
    publishToolLog = mocks.publishToolLog;
  }
}));

import { AgentTurnRunner } from '../../../../src/agent/loop/agent-turn-runner.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

const makeContextAndTurn = () => {
  const state = new AgentRuntimeState('agent-1');
  const restoreWorkingContextTurnCheckpoint = vi.fn();
  state.memoryManager = {
    startTurn: () => 'turn-1',
    createWorkingContextTurnCheckpoint: (turnId: string) => ({ turnId, messages: [], lastCompactionTs: null }),
    restoreWorkingContextTurnCheckpoint
  } as any;
  const turn = state.startActiveTurn('turn-1');
  const context = {
    agentId: 'agent-1',
    state,
    statusManager: null
  } as any;
  return { context, turn, restoreWorkingContextTurnCheckpoint };
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
    const { context, turn, restoreWorkingContextTurnCheckpoint } = makeContextAndTurn();
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
    expect(restoreWorkingContextTurnCheckpoint).toHaveBeenCalledOnce();
    expect(mocks.publishTurnCompleted).not.toHaveBeenCalled();
    expect(mocks.publishTurnInterrupted).toHaveBeenCalledWith('turn-1', 'post_llm_interrupt');
  });

  it('does not process tool results or publish terminal tool success after an interrupt accepted at the post-tool seam', async () => {
    const { context, turn, restoreWorkingContextTurnCheckpoint } = makeContextAndTurn();
    const invocation = new ToolInvocation('tool', {}, 'inv-1', 'turn-1');
    mocks.llmRun.mockResolvedValue({
      kind: 'tool_invocations',
      response: new CompleteResponse({ content: '' }),
      toolInvocations: [invocation]
    });
    mocks.toolRun.mockImplementation(async (_invocations, _context, activeTurn) => {
      activeTurn.interrupt('post_tool_interrupt');
      return [new ToolResultEvent('tool', { ok: true }, 'inv-1', undefined, {}, 'turn-1', false)];
    });

    const outcome = await new AgentTurnRunner(context, turn).run(makeTrigger());

    expect(outcome).toMatchObject({ kind: 'interrupted', turnId: 'turn-1', reason: 'post_tool_interrupt' });
    expect(mocks.toolResultProcess).not.toHaveBeenCalled();
    expect(restoreWorkingContextTurnCheckpoint).toHaveBeenCalledOnce();
    expect(mocks.publishToolExecutionSucceeded).not.toHaveBeenCalled();
    expect(mocks.publishToolExecutionFailed).not.toHaveBeenCalled();
    expect(mocks.publishTurnCompleted).not.toHaveBeenCalled();
    expect(mocks.publishTurnInterrupted).toHaveBeenCalledWith('turn-1', 'post_tool_interrupt');
  });
});
