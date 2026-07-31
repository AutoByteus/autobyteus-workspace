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

class FailingThenRecoveringLLM extends BaseLLM {
  public readonly _renderer = new OpenAIChatRenderer();
  public readonly streamCaptures: Message[][] = [];

  constructor() {
    super(
      new LLMModel({
        name: 'unknown-capability-recovery-model',
        value: 'unknown-capability-recovery-model',
        canonicalName: 'unknown-capability-recovery-model',
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
    _renderedPayload: unknown = null,
    _kwargs: Record<string, unknown> = {},
    _options: LLMInvocationOptions = {},
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.streamCaptures.push([...messages]);
    if (this.streamCaptures.length === 1) {
      throw new Error('provider rejected image input');
    }
    yield new ChunkResponse({ content: 'recovered', is_complete: true });
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

describe('LlmPhase unknown-capability provider recovery', () => {
  it('rolls back one failed image request and accepts the next text-only turn without retrying', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-phase-provider-recovery-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_provider_recovery');
      const memoryManager = new MemoryManager({ store });
      memoryManager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.USER, { content: 'baseline context' }),
      ]));

      const llm = new FailingThenRecoveringLLM();
      const state = new AgentRuntimeState('agent_provider_recovery');
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      const config = new AgentConfig('agent', 'role', 'description', llm, 'System prompt', []);
      const context = new AgentContext('agent_provider_recovery', config, state);

      const failedTurn = new AgentTurn('turn_provider_failure');
      const failedOutcome = await new LlmPhase().run({
        llmUserMessage: new LLMUserMessage({
          content: 'inspect this image',
          image_urls: ['data:image/png;base64,aW1hZ2U='],
        }),
        turnId: failedTurn.turnId,
        sourceEvent: new UserMessageReceivedEvent(
          new AgentInputUserMessage('inspect this image')
        ),
      }, context, failedTurn, null);

      expect(failedOutcome).toMatchObject({ kind: 'final', isError: true });
      expect((failedOutcome as { kind: 'final'; response: CompleteResponse }).response.content)
        .toContain('provider rejected image input');
      expect(llm.streamCaptures).toHaveLength(1);
      expect(llm.streamCaptures[0].at(-1)).toMatchObject({
        role: MessageRole.USER,
        content: 'inspect this image',
        image_urls: ['data:image/png;base64,aW1hZ2U='],
      });
      expect(memoryManager.getWorkingContextMessages()).toEqual([
        expect.objectContaining({ role: MessageRole.SYSTEM, content: 'System prompt' }),
        expect.objectContaining({ role: MessageRole.USER, content: 'baseline context' }),
      ]);

      const recoveryTurn = new AgentTurn('turn_provider_recovery');
      const recoveryOutcome = await new LlmPhase().run({
        llmUserMessage: new LLMUserMessage({ content: 'continue with text only' }),
        turnId: recoveryTurn.turnId,
        sourceEvent: new UserMessageReceivedEvent(
          new AgentInputUserMessage('continue with text only')
        ),
      }, context, recoveryTurn, null);

      expect(recoveryOutcome.kind).toBe('final');
      expect('isError' in recoveryOutcome && recoveryOutcome.isError).toBe(false);
      expect(llm.streamCaptures).toHaveLength(2);
      expect(llm.streamCaptures[1].at(-1)).toMatchObject({
        role: MessageRole.USER,
        content: 'continue with text only',
        image_urls: [],
      });
      expect(llm.streamCaptures[1].some((message) => message.image_urls.length > 0)).toBe(false);
      expect(memoryManager.getWorkingContextMessages().some((message) =>
        message.image_urls.includes('data:image/png;base64,aW1hZ2U=')
      )).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
