import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import type { CompactionStatusPayload } from '../../../src/agent/compaction/compaction-runtime-reporter.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { ToolResultEvent, UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { LlmPhase } from '../../../src/agent/loop/llm-phase.js';
import { ToolPhase } from '../../../src/agent/loop/tool-phase.js';
import { ToolContinuationInputBuilder } from '../../../src/agent/loop/tool-continuation-input-builder.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { buildLlmTokenUsageObservation } from '../../../src/llm/utils/llm-token-usage-observation.js';
import { Message, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import type {
  CompactionAgentRunner,
  CompactionAgentTask,
} from '../../../src/memory/compaction/compaction-agent-runner.js';
import { AUTOBYTEUS_COMPACTION_STRATEGY } from '../../../src/memory/compaction/working-context-compaction-strategy-setting.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { CompactedMemoryContextProjector } from '../../../src/memory/projection/compacted-memory-context-projector.js';
import { CurrentCompactionOutputLoader } from '../../../src/memory/projection/current-compaction-output-loader.js';
import { FileCompactionLineageStore } from '../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { registerReadFileTool } from '../../../src/tools/file/read-file.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';

const originalStrategy = process.env[AUTOBYTEUS_COMPACTION_STRATEGY];

class SequencedStreamingLLM extends BaseLLM {
  readonly requests: Message[][] = [];
  readonly renderedPayloads: unknown[] = [];
  private sequenceIndex = 0;

  constructor(private readonly sequences: ChunkResponse[][]) {
    super(
      new LLMModel({
        name: 'tool-lifecycle-model',
        value: 'tool-lifecycle-model',
        canonicalName: 'tool-lifecycle-model',
        provider: LLMProvider.OPENAI,
        maxInputTokens: 10_000,
        defaultCompactionRatio: 0.5,
        defaultSafetyMarginTokens: 0,
      }),
      new LLMConfig({
        systemMessage: 'System prompt',
        maxTokens: 64,
        compactionRatio: 0.5,
        safetyMarginTokens: 0,
      }),
    );
  }

  override async *streamMessages(
    messages: Message[],
    renderedPayload: unknown = null,
    _kwargs: Record<string, unknown> = {},
    _options: LLMInvocationOptions = {},
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requests.push(new WorkingContext(messages).buildMessages());
    this.renderedPayloads.push(renderedPayload);
    const chunks = this.sequences[this.sequenceIndex++] ?? [];
    for (const chunk of chunks) yield chunk;
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    throw new Error('SequencedStreamingLLM records calls through streamMessages.');
  }
}

class RecordingCompactionRunner implements CompactionAgentRunner {
  readonly tasks: CompactionAgentTask[] = [];

  async runCompactionTask(task: CompactionAgentTask) {
    this.tasks.push(task);
    return {
      outputText: JSON.stringify({
        episodes: Array.from({ length: 4 }, (_, index) => ({
          summary: `Settled natural phase ${index + 1} before the active tool protocol.`,
        })),
        critical_issues: [],
        unresolved_work: [],
        durable_facts: Array.from({ length: 25 }, (_, index) => ({
          fact: `Continuation-critical natural fact ${index + 1}.`,
        })),
        user_preferences: [],
        important_artifacts: [],
      }),
      metadata: {
        compactionAgentDefinitionId: 'memory-compactor',
        compactionAgentName: 'Memory Compactor',
        runtimeKind: 'autobyteus',
        modelIdentifier: 'tool-lifecycle-model',
        provider: 'openai',
        compactionRunId: 'tool-lifecycle-compaction-run',
        taskId: task.taskId,
      },
    };
  }
}

const usage = (inputTokens: number) => buildLlmTokenUsageObservation({
  inputTokens,
  outputTokens: 10,
  totalTokens: inputTokens + 10,
  rawUsage: null,
});

const makeInput = (
  turn: AgentTurn,
  content: string,
  llmUserMessage: LLMUserMessage | null = new LLMUserMessage({ content }),
) => ({
  llmUserMessage,
  turnId: turn.turnId,
  sourceEvent: new UserMessageReceivedEvent(new AgentInputUserMessage(content)),
});

const seedSettledHistory = (manager: MemoryManager): void => {
  for (let index = 1; index <= 3; index += 1) {
    const turnId = manager.startTurn();
    manager.appendWorkingContextUserMessage(
      `settled user ${index} ${'user-history '.repeat(350)}`,
      { turnId },
    );
    manager.ingestAssistantResponse(
      new CompleteResponse({
        content: `settled assistant ${index} ${'assistant-history '.repeat(300)}`,
      }),
      turnId,
      'test',
    );
  }
};

afterEach(() => {
  if (originalStrategy === undefined) delete process.env[AUTOBYTEUS_COMPACTION_STRATEGY];
  else process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = originalStrategy;
});

describe('structured strategy tool-safe lifecycle', () => {
  it('waits for the terminal result, compacts through the current strategy, and renders the complete native tool group', async () => {
    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = 'structured-json';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structured-tool-lifecycle-'));
    const registrySnapshot = defaultToolRegistry.snapshot();
    let now = Date.now();
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now++);
    try {
      const runtimeStatusPath = path.join(tempDir, 'runtime-status.txt');
      fs.writeFileSync(runtimeStatusPath, 'runtime status: ready\n', 'utf8');
      const readFileTool = registerReadFileTool();
      const store = new FileMemoryStore(tempDir, 'tool-lifecycle-agent');
      const lineageScope = {
        targetKind: 'agent_run' as const,
        runId: 'tool-lifecycle-agent',
        memberId: null,
      };
      const lineageStore = new FileCompactionLineageStore(store.agentDir, lineageScope);
      const manager = new MemoryManager({
        store,
        compactionPolicy: new CompactionPolicy({ triggerRatio: 0.5, safetyMarginTokens: 0 }),
        lineageStore,
        lineageScope,
        agentId: 'tool-lifecycle-agent',
      });
      seedSettledHistory(manager);
      const runner = new RecordingCompactionRunner();
      const llm = new SequencedStreamingLLM([
        [new ChunkResponse({
          content: 'I will inspect the runtime.',
          tool_calls: [{
            index: 0,
            call_id: 'call-lookup-1',
            name: 'read_file',
            arguments_delta: JSON.stringify({
              path: runtimeStatusPath,
              include_line_numbers: false,
            }),
          }],
          is_complete: true,
          usage: usage(6_000),
        })],
        [new ChunkResponse({
          content: 'The lookup completed.',
          is_complete: true,
          usage: usage(10),
        })],
      ]);
      const config = new AgentConfig(
        'agent',
        'role',
        'description',
        llm,
        'System prompt',
        [readFileTool],
      );
      config.compactionAgentRunner = runner;
      const state = new AgentRuntimeState('tool-lifecycle-agent', tempDir);
      state.llmInstance = llm;
      state.memoryManager = manager;
      state.toolInstances = { read_file: readFileTool };
      const statuses: CompactionStatusPayload[] = [];
      state.statusManagerRef = {
        notifier: {
          notifyAgentCompactionStatus: (payload: CompactionStatusPayload) => statuses.push(payload),
        },
      } as any;
      const turn = new AgentTurn(manager.startTurn());
      state.activeTurn = turn;
      const context = new AgentContext('tool-lifecycle-agent', config, state);

      const toolOutcome = await new LlmPhase().run(
        makeInput(turn, 'Check the runtime status.'),
        context,
        turn,
        null,
      );

      expect(toolOutcome.kind).toBe('tool_invocations');
      expect(statuses.map((status) => status.phase)).toEqual(['requested']);
      expect(manager.hasPendingCompaction()).toBe(true);
      expect(runner.tasks).toHaveLength(0);

      if (toolOutcome.kind !== 'tool_invocations') {
        throw new Error('Expected the first LLM leg to request a tool.');
      }
      const invocation = toolOutcome.toolInvocations[0]!;
      const toolResults = await new ToolPhase().run(
        toolOutcome.toolInvocations,
        context,
        turn,
        null,
      );
      expect(toolResults).toHaveLength(1);
      expect(toolResults[0]).toBeInstanceOf(ToolResultEvent);
      expect(toolResults[0]).toMatchObject({
        toolName: 'read_file',
        toolInvocationId: invocation.id,
        result: 'runtime status: ready\n',
      });
      const activeBatch = turn.activeToolInvocationBatch;
      expect(activeBatch).not.toBeNull();
      turn.clearActiveToolInvocationBatch(activeBatch!);
      manager.ingestToolResults(toolResults, turn.turnId, {
        source: 'native_api_ordered_batch',
      });
      const continuation = new ToolContinuationInputBuilder().build(toolResults, turn.turnId);

      expect(manager.getWorkingContextMessages().at(-1)?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect(continuation.metadata).toEqual({
        turn_id: turn.turnId,
        tool_result_count: 1,
      });
      expect(runner.tasks).toHaveLength(0);
      expect(manager.hasPendingCompaction()).toBe(true);

      const finalOutcome = await new LlmPhase().run(
        makeInput(turn, 'Tool results are ready.', null),
        context,
        turn,
        null,
      );

      expect(finalOutcome.kind).toBe('final');
      expect(runner.tasks).toHaveLength(1);
      expect(statuses.map((status) => status.phase)).toEqual(['requested', 'started', 'completed']);
      expect(statuses[2]).toMatchObject({
        compaction_strategy_id: 'structured-json',
        compaction_strategy_name: 'Structured JSON',
        semantic_fact_count: 25,
      });
      expect(manager.hasPendingCompaction()).toBe(false);

      expect(store.list(MemoryType.EPISODIC)).toHaveLength(4);
      expect(store.list(MemoryType.SEMANTIC)).toHaveLength(25);
      expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);
      const head = lineageStore.readHead()!;
      expect(head).toMatchObject({
        previousCompactionId: null,
        execution: {
          promptContractVersion: 3,
          selectionPolicyVersion: 1,
        },
      });
      expect(head.episodeIds).toHaveLength(4);
      expect(head.semanticIds).toHaveLength(25);

      const current = new CurrentCompactionOutputLoader(lineageStore, store).loadCurrent()!;
      expect(current.episodes).toHaveLength(4);
      expect(current.semantics).toHaveLength(25);
      const projected = new CompactedMemoryContextProjector().project({
        systemPrompt: 'System prompt',
        continuationMessages: [],
        bundle: current,
      }).buildMessages();
      expect(projected[1]?.content).toContain('Settled natural phase 4');
      expect(projected[1]?.content).toContain('Continuation-critical natural fact 25.');

      const nextRequest = llm.requests[1]!;
      expect(nextRequest.some(({ role, content }) =>
        role === 'user' && content === 'Tool results are ready.')).toBe(false);
      const toolCallIndex = nextRequest.findIndex((message) =>
        message.tool_payload instanceof ToolCallPayload
        && message.tool_payload.toolCalls.some((call) => call.id === 'call-lookup-1'));
      expect(toolCallIndex).toBeGreaterThanOrEqual(0);
      expect(nextRequest[toolCallIndex + 1]?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect((nextRequest[toolCallIndex + 1]?.tool_payload as ToolResultPayload).toolCallId)
        .toBe('call-lookup-1');
      expect(runner.tasks[0]?.prompt.match(/<target_agent_conversation_history>/g)).toHaveLength(1);
      expect(runner.tasks[0]?.prompt.match(/<\/target_agent_conversation_history>/g)).toHaveLength(1);
      expect(runner.tasks[0]?.prompt).not.toContain('call-lookup-1');

      const rendered = llm.renderedPayloads[1] as Array<Record<string, any>>;
      const renderedCallIndex = rendered.findIndex((message) => Array.isArray(message.tool_calls));
      expect(renderedCallIndex).toBeGreaterThanOrEqual(0);
      expect(rendered[renderedCallIndex]?.tool_calls?.[0]?.id).toBe('call-lookup-1');
      expect(rendered[renderedCallIndex + 1]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call-lookup-1',
      });
      const traceCorpus = manager.listRawTraceCorpusOrdered();
      expect(traceCorpus.filter(({ traceType }) => traceType === 'tool_call')).toHaveLength(1);
      expect(traceCorpus.filter(({ traceType }) => traceType === 'tool_result')).toHaveLength(1);
      expect(traceCorpus.some(({ traceType }) => traceType === 'tool_continuation')).toBe(false);
      expect(traceCorpus.some(({ content }) => content === 'Native API tool continuation')).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
      defaultToolRegistry.restore(registrySnapshot);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
