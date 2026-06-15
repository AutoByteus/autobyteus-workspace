import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { LlmPhase } from '../../../src/agent/loop/llm-phase.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { WorkingContextSnapshotBootstrapOptions, WorkingContextSnapshotBootstrapper } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

class CapturingOpenAICompatibleLLM extends BaseLLM {
  public readonly _renderer = new OpenAIChatRenderer();
  public readonly streamCaptures: Array<{ messages: Message[]; renderedPayload: any }> = [];

  constructor() {
    super(
      new LLMModel({
        name: 'persisted-resume-recovery-openai-compatible',
        value: 'persisted-resume-recovery-openai-compatible',
        canonicalName: 'persisted-resume-recovery-openai-compatible',
        provider: LLMProvider.OPENAI,
      }),
      new LLMConfig({ systemMessage: 'System prompt', maxTokens: 64 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  override async *streamMessages(
    messages: Message[],
    renderedPayload: unknown = null,
    _kwargs: Record<string, unknown> = {},
    _options: LLMInvocationOptions = {},
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.streamCaptures.push({ messages: [...messages], renderedPayload });
    yield new ChunkResponse({ content: 'resumed after repair', is_complete: true });
  }
}

const toolResultsForCall = (messages: Message[], toolCallId: string): ToolResultPayload[] => messages
  .map((message) => message.tool_payload)
  .filter((payload): payload is ToolResultPayload => payload instanceof ToolResultPayload)
  .filter((payload) => payload.toolCallId === toolCallId);

describe('incomplete native tool-call persisted resume recovery (API/E2E)', () => {
  it('restores a cached poisoned snapshot and starts LLM execution after one additional user prompt', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'incomplete-tool-call-resume-'));
    try {
      const agentId = 'agent_incomplete_tool_resume';
      const store = new FileMemoryStore(tempDir, agentId);
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
      store.add([
        new RawTraceItem({
          id: 'rt_resume_missing_tool_call',
          ts: 1,
          turnId: 'turn_before_shutdown',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'PendingToolInvocationEvent',
          toolName: 'generate_image',
          toolCallId: 'call_resume_missing',
          toolArgs: { prompt: 'draw page two' },
        }),
      ]);

      const cached = new WorkingContextSnapshot();
      cached.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System prompt' }));
      cached.appendMessage(new Message(MessageRole.ASSISTANT, {
        content: 'I will generate page two.',
        tool_payload: new ToolCallPayload([
          { id: 'call_resume_missing', name: 'generate_image', arguments: { prompt: 'draw page two' } },
        ]),
      }));
      cached.appendMessage(new Message(MessageRole.USER, { content: 'earlier failed continue attempt' }));
      snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(cached, {
        schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
        agent_id: agentId,
      }));

      const memoryManager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });
      new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
        memoryManager,
        'System prompt',
        new WorkingContextSnapshotBootstrapOptions(),
      );

      const restoredMessages = memoryManager.getWorkingContextMessages();
      expect(restoredMessages.map((message) => message.role)).toEqual([
        MessageRole.SYSTEM,
        MessageRole.ASSISTANT,
        MessageRole.TOOL,
        MessageRole.USER,
      ]);
      expect(toolResultsForCall(restoredMessages, 'call_resume_missing')).toHaveLength(1);

      const persistedAfterRestore = snapshotStore.read(agentId);
      expect(JSON.stringify(persistedAfterRestore)).toContain('call_resume_missing');
      expect(JSON.stringify(persistedAfterRestore)).toContain(
        'Tool execution was interrupted by runtime shutdown before a result was recorded.',
      );

      const llm = new CapturingOpenAICompatibleLLM();
      const state = new AgentRuntimeState(agentId);
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      const turn = new AgentTurn('turn_after_restart');
      state.activeTurn = turn;
      const config = new AgentConfig('agent', 'role', 'description', llm, 'System prompt', []);
      const context = new AgentContext(agentId, config, state);

      const outcome = await new LlmPhase().run({
        llmUserMessage: new LLMUserMessage({ content: 'please continue there was a shutdown' }),
        turnId: turn.turnId,
        sourceEvent: new UserMessageReceivedEvent(
          new AgentInputUserMessage('please continue there was a shutdown'),
        ),
      }, context, turn, null);

      expect(outcome).toMatchObject({ kind: 'final' });
      expect(llm.streamCaptures).toHaveLength(1);
      const rendered = llm.streamCaptures[0].renderedPayload as any[];
      const assistantIndex = rendered.findIndex((message) => Array.isArray(message.tool_calls));
      expect(assistantIndex).toBeGreaterThanOrEqual(0);
      expect(rendered[assistantIndex]).toMatchObject({
        role: 'assistant',
        tool_calls: [expect.objectContaining({ id: 'call_resume_missing' })],
      });
      expect(rendered[assistantIndex + 1]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_resume_missing',
      });
      expect(rendered[assistantIndex + 1].content).toContain(
        'Tool execution was interrupted by runtime shutdown before a result was recorded.',
      );
      expect(rendered[assistantIndex + 1].content).toContain(
        'Completion status is unknown. No tool output is available in memory.',
      );
      expect(rendered[assistantIndex + 2]).toMatchObject({
        role: 'user',
        content: 'earlier failed continue attempt',
      });
      expect(rendered.at(-1)).toMatchObject({
        role: 'user',
        content: 'please continue there was a shutdown',
      });

      memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm();
      expect(toolResultsForCall(memoryManager.getWorkingContextMessages(), 'call_resume_missing')).toHaveLength(1);

      const rawTraces = memoryManager.listRawTracesOrdered();
      expect(rawTraces.some((trace) =>
        trace.traceType === 'tool_call' &&
        trace.toolCallId === 'call_resume_missing' &&
        trace.sourceEvent === 'PendingToolInvocationEvent'
      )).toBe(true);
      const recoveryMarkers = rawTraces.filter((trace) =>
        trace.traceType === 'operation_boundary' &&
        trace.toolCallId === 'call_resume_missing'
      );
      expect(recoveryMarkers).toHaveLength(1);
      expect(recoveryMarkers[0].sourceEvent).toBe('WorkingContextSnapshotBootstrapper');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
