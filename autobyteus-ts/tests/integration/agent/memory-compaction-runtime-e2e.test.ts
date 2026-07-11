import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { CompactionRuntimeReporter, type CompactionStatusPayload } from '../../../src/agent/compaction/compaction-runtime-reporter.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { ToolResultEvent, UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { LlmPhase } from '../../../src/agent/loop/llm-phase.js';
import { ToolResultContinuationBuilder } from '../../../src/agent/loop/tool-result-continuation-builder.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { SenderType } from '../../../src/agent/sender-type.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LMStudioTextToolHistoryRenderer } from '../../../src/llm/prompt-renderers/lmstudio-text-tool-history-renderer.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { buildLlmTokenUsageObservation } from '../../../src/llm/utils/llm-token-usage-observation.js';
import { Message, ToolCallPayload, ToolResultPayload, type ToolCallSpec } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { PendingCompactionExecutor } from '../../../src/memory/compaction/pending-compaction-executor.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const originalParser = process.env.AUTOBYTEUS_STREAM_PARSER;
const SYNTHETIC_AGGREGATE_TOOL_RESULT_PREFIX =
  'The following tool executions have completed. Please analyze their results and decide the next course of action.';

class TestSummarizer extends Summarizer {
  async summarize(blocks: any[]): Promise<CompactionResult> {
    const summary = blocks
      .flatMap((block) => block.traces ?? [])
      .map((trace) => trace.content)
      .filter(Boolean)
      .join(' | ');
    return new CompactionResult(summary || 'runtime summary', {
      durableFacts: [{ fact: 'runtime compaction executed' }],
    });
  }
}

class StreamingLLM extends BaseLLM {
  constructor(
    chunks: ChunkResponse[],
    renderer: OpenAIChatRenderer | LMStudioTextToolHistoryRenderer = new OpenAIChatRenderer(),
  ) {
    super(
      new LLMModel({
        name: 'test-openai-compatible',
        value: 'test-openai-compatible',
        canonicalName: 'test-openai-compatible',
        provider: LLMProvider.OPENAI,
        maxInputTokens: 1000,
        defaultCompactionRatio: 0.1,
        defaultSafetyMarginTokens: 0,
      }),
      new LLMConfig({
        systemMessage: 'System prompt',
        maxTokens: 64,
        compactionRatio: 0.1,
        safetyMarginTokens: 0,
      }),
    );
    this.chunks = chunks;
    (this as any)._renderer = renderer;
  }

  private readonly chunks: ChunkResponse[];

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions,
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

const highUsage = buildLlmTokenUsageObservation({
  inputTokens: 200,
  outputTokens: 10,
  totalTokens: 210,
  rawUsage: { input_tokens: 200, output_tokens: 10, total_tokens: 210 },
});

const createMemoryManager = (tempDir: string, agentId: string): MemoryManager => {
  const store = new FileMemoryStore(tempDir, agentId);
  const compactor = new Compactor(store, new TestSummarizer());
  return new MemoryManager({
    store,
    compactor,
    compactionPolicy: new CompactionPolicy({ triggerRatio: 0.1, safetyMarginTokens: 0 }),
  });
};

const seedSettledHistory = (memoryManager: MemoryManager): void => {
  const olderTurn = memoryManager.startTurn();
  memoryManager.appendWorkingContextUserMessage('older user context', { turnId: olderTurn });
  memoryManager.ingestAssistantResponse(
    new CompleteResponse({ content: 'older assistant context' }),
    olderTurn,
    'test',
  );

  const recentTurn = memoryManager.startTurn();
  memoryManager.appendWorkingContextUserMessage('recent user context', { turnId: recentTurn });
  memoryManager.ingestAssistantResponse(
    new CompleteResponse({ content: 'recent assistant context' }),
    recentTurn,
    'test',
  );
};

const makeContextAndTurn = (options: {
  memoryManager: MemoryManager;
  llm: BaseLLM;
  statuses: CompactionStatusPayload[];
  toolNames?: string[];
}): { context: AgentContext; turn: AgentTurn } => {
  const toolEntries = (options.toolNames ?? []).map((name) => ({ getName: () => name }));
  const config = new AgentConfig(
    'agent',
    'role',
    'description',
    options.llm,
    'System prompt',
    toolEntries as any[],
  );
  const state = new AgentRuntimeState('agent-1');
  state.llmInstance = options.llm;
  state.memoryManager = options.memoryManager;
  state.statusManagerRef = {
    notifier: {
      notifyAgentCompactionStatus: (payload: CompactionStatusPayload) => options.statuses.push(payload),
    },
  } as any;
  const turnId = options.memoryManager.startTurn();
  const turn = new AgentTurn(turnId);
  state.activeTurn = turn;
  return { context: new AgentContext('agent-1', config, state), turn };
};

const makeInput = (turn: AgentTurn, content: string, mode?: 'tool_history_only') => ({
  llmUserMessage: new LLMUserMessage({ content }),
  turnId: turn.turnId,
  sourceEvent: new UserMessageReceivedEvent(new AgentInputUserMessage(content)),
  ...(mode ? { llmRequestMode: mode } : {}),
});

afterEach(() => {
  if (originalParser === undefined) {
    delete process.env.AUTOBYTEUS_STREAM_PARSER;
  } else {
    process.env.AUTOBYTEUS_STREAM_PARSER = originalParser;
  }
});

describe('memory compaction runtime API/E2E validation', () => {
  it('emits requested, started, and completed during the same no-tool LLM lifecycle after threshold crossing', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-status-no-tool-'));
    try {
      const memoryManager = createMemoryManager(tempDir, 'agent_no_tool_status');
      seedSettledHistory(memoryManager);
      const statuses: CompactionStatusPayload[] = [];
      const llm = new StreamingLLM([
        new ChunkResponse({
          content: 'final answer',
          is_complete: true,
          usage: highUsage,
        }),
      ]);
      const { context, turn } = makeContextAndTurn({ memoryManager, llm, statuses });

      const outcome = await new LlmPhase().run(makeInput(turn, 'current user asks for final answer'), context, turn, null);

      expect(outcome.kind).toBe('final');
      expect(statuses.map((status) => status.phase)).toEqual(['requested', 'started', 'completed']);
      expect(statuses.map((status) => status.compaction_operation_id)).toEqual([
        statuses[0].compaction_operation_id,
        statuses[0].compaction_operation_id,
        statuses[0].compaction_operation_id,
      ]);
      expect(statuses[0].execution_turn_id).toBeNull();
      expect(statuses[1].execution_turn_id).toBe(turn.turnId);
      expect(statuses[2].execution_turn_id).toBe(turn.turnId);
      expect(memoryManager.compactionRequired).toBe(false);
      const compactedText = memoryManager.getWorkingContextMessages().map((message) => message.content ?? '').join('\n');
      expect(compactedText).toContain('You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.');
      expect(compactedText).not.toContain('[RAW_FRONTIER]');
      expect(compactedText).not.toContain('[BLOCK');
      expect(compactedText).not.toContain('source_event');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('defers tool-call compaction until tool results are ingested, then renders a native same-turn continuation payload', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-status-tool-'));
    try {
      const memoryManager = createMemoryManager(tempDir, 'agent_tool_status');
      seedSettledHistory(memoryManager);
      const statuses: CompactionStatusPayload[] = [];
      const llm = new StreamingLLM([
        new ChunkResponse({
          content: 'I will inspect the runtime.',
          tool_calls: [{
            index: 0,
            call_id: 'call_lookup_1',
            name: 'lookup',
            arguments_delta: '{"query":"runtime status"}',
          }],
          is_complete: true,
          usage: highUsage,
        }),
      ]);
      const { context, turn } = makeContextAndTurn({
        memoryManager,
        llm,
        statuses,
        toolNames: ['lookup'],
      });

      const outcome = await new LlmPhase().run(makeInput(turn, 'check runtime status'), context, turn, null);

      expect(outcome.kind).toBe('tool_invocations');
      expect(statuses.map((status) => status.phase)).toEqual(['requested']);
      expect(memoryManager.compactionRequired).toBe(true);

      const invocation = outcome.kind === 'tool_invocations'
        ? outcome.toolInvocations[0]
        : new ToolInvocation('lookup', {}, 'unreachable');
      const continuation = new ToolResultContinuationBuilder().build([
        new ToolResultEvent(
          invocation.name,
          { status: 'ok' },
          invocation.id,
          undefined,
          invocation.arguments,
          turn.turnId,
        ),
      ], { context, turn });

      expect(continuation.senderType).toBe(SenderType.TOOL);
      const reporter = new CompactionRuntimeReporter(context.agentId, {
        notifyAgentCompactionStatus: (payload: CompactionStatusPayload) => statuses.push(payload),
      } as any);
      const request = await new LLMRequestAssembler(
        memoryManager,
        new OpenAIChatRenderer(),
        new PendingCompactionExecutor(memoryManager, {
          reporter,
          inputBudgetTokens: 1000,
        }),
      ).prepareToolContinuationRequest(turn.turnId, 'System prompt');

      expect(request.didCompact).toBe(true);
      expect(statuses.map((status) => status.phase)).toEqual(['requested', 'started', 'completed']);
      expect(statuses.map((status) => status.compaction_operation_id)).toEqual([
        statuses[0].compaction_operation_id,
        statuses[0].compaction_operation_id,
        statuses[0].compaction_operation_id,
      ]);

      const latestAssistant = request.messages.at(-2);
      const latestToolResult = request.messages.at(-1);
      expect(latestAssistant?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect(latestToolResult?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect((latestAssistant?.tool_payload as ToolCallPayload).toolCalls.map((call: ToolCallSpec) => call.id)).toEqual([
        'call_lookup_1',
      ]);
      expect((latestToolResult?.tool_payload as ToolResultPayload).toolCallId).toBe('call_lookup_1');

      const rendered = JSON.stringify(request.renderedPayload);
      expect(rendered).toContain('"tool_calls"');
      expect(rendered).toContain('"tool_call_id":"call_lookup_1"');
      expect(rendered).not.toContain(SYNTHETIC_AGGREGATE_TOOL_RESULT_PREFIX);
      expect(rendered).not.toContain('[RAW_FRONTIER]');
      expect(rendered).not.toContain('[BLOCK');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses canonical messages plus renderer-owned text history for non-native tool continuations without an aggregate user message', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-text-history-'));
    try {
      const memoryManager = createMemoryManager(tempDir, 'agent_text_history');
      seedSettledHistory(memoryManager);
      const turnId = memoryManager.startTurn();
      memoryManager.appendWorkingContextUserMessage('tail user asks for lookup', { turnId });
      memoryManager.ingestAssistantToolResponse(
        new CompleteResponse({ content: 'I will look this up.' }),
        [new ToolInvocation('lookup', { query: 'text mode status' }, 'call_text_1', turnId)],
        turnId,
        'test',
      );
      memoryManager.requestCompaction(turnId);

      const ingestSpy = vi.spyOn(memoryManager, 'ingestToolResults');
      const continuation = new ToolResultContinuationBuilder().build([
        new ToolResultEvent(
          'lookup',
          { status: 'ok' },
          'call_text_1',
          undefined,
          { query: 'text mode status' },
          turnId,
        ),
      ], {
        context: {
          agentId: 'agent-1',
          state: { memoryManager },
        } as any,
        turn: { turnId } as any,
      });
      expect(continuation.senderType).toBe(SenderType.TOOL);
      expect(ingestSpy).toHaveBeenCalledWith(expect.any(Array), turnId, {
        source: 'text_history_ordered_batch',
      });

      const request = await new LLMRequestAssembler(
        memoryManager,
        new LMStudioTextToolHistoryRenderer(),
        new PendingCompactionExecutor(memoryManager, { inputBudgetTokens: 1000 }),
      ).prepareToolContinuationRequest(turnId, 'System prompt');

      expect(request.didCompact).toBe(true);
      expect(request.messages.at(-2)?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect(request.messages.at(-1)?.tool_payload).toBeInstanceOf(ToolResultPayload);
      const rendered = JSON.stringify(request.renderedPayload);
      expect(rendered).toContain('[TOOL_CALL] lookup');
      expect(rendered).toContain('[TOOL_RESULT] lookup');
      expect(rendered).not.toContain(SYNTHETIC_AGGREGATE_TOOL_RESULT_PREFIX);
      expect(rendered).not.toContain('[RAW_FRONTIER]');
      expect(rendered).not.toContain('[BLOCK');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
