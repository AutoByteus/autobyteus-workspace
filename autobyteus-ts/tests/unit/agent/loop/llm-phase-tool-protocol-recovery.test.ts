import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { LlmPhase } from '../../../../src/agent/loop/llm-phase.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { OpenAIChatRenderer } from '../../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
} from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { WorkingContext } from '../../../../src/memory/working-context.js';
import { RawTraceItem } from '../../../../src/memory/models/raw-trace-item.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';

class CapturingResumeLLM extends BaseLLM {
  public readonly _renderer = new OpenAIChatRenderer();
  public readonly streamCaptures: Array<{ messages: Message[]; renderedPayload: any }> = [];

  constructor() {
    super(
      new LLMModel({
        name: 'resume-recovery-openai-compatible',
        value: 'resume-recovery-openai-compatible',
        canonicalName: 'resume-recovery-openai-compatible',
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
    yield new ChunkResponse({ content: 'resumed', is_complete: true });
  }
}

describe('LlmPhase incomplete native tool-call resume recovery', () => {
  it('kicks off LLM execution after one additional user prompt with provider-safe rendered history', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-phase-resume-repair-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_resume_repair');
      store.add([
        new RawTraceItem({
          id: 'rt_resume_call',
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
      const memoryManager = new MemoryManager({ store });
      memoryManager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.ASSISTANT, {
          content: 'I will generate page two.',
          tool_payload: new ToolCallPayload([
            { id: 'call_resume_missing', name: 'generate_image', arguments: { prompt: 'draw page two' } },
          ]),
        }),
        new Message(MessageRole.USER, { content: 'earlier failed continue attempt' }),
      ]));

      const llm = new CapturingResumeLLM();
      const state = new AgentRuntimeState('agent_resume_repair');
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      const turn = new AgentTurn('turn_after_restart');
      state.activeTurn = turn;
      const config = new AgentConfig('agent', 'role', 'description', llm, 'System prompt', []);
      const context = new AgentContext('agent_resume_repair', config, state);

      const outcome = await new LlmPhase().run({
        llmUserMessage: new LLMUserMessage({ content: 'please continue there was a shutdown' }),
        turnId: turn.turnId,
        sourceEvent: new UserMessageReceivedEvent(
          new AgentInputUserMessage('please continue there was a shutdown')
        ),
      }, context, turn, null);

      expect(outcome).toMatchObject({ kind: 'final' });
      expect(llm.streamCaptures).toHaveLength(1);
      const rendered = llm.streamCaptures[0].renderedPayload as any[];
      const assistantIndex = rendered.findIndex((message) => Array.isArray(message.tool_calls));
      expect(assistantIndex).toBeGreaterThanOrEqual(0);
      expect(rendered[assistantIndex + 1]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_resume_missing',
      });
      expect(rendered[assistantIndex + 1].content).toContain(
        'Tool execution was interrupted by runtime shutdown before a result was recorded.'
      );
      expect(rendered[assistantIndex + 2]).toMatchObject({
        role: 'user',
        content: 'earlier failed continue attempt',
      });
      expect(rendered.at(-1)).toMatchObject({
        role: 'user',
        content: 'please continue there was a shutdown',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
