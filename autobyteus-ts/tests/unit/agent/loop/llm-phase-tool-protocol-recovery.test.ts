import { describe, expect, it, vi } from 'vitest';
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
import { SYNTHETIC_TOOL_RESULT_ERROR } from '../../../../src/memory/working-context-tool-protocol-repairer.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerToolClass } from '../../../../src/tools/tool-meta.js';

const RECOVERY_TOOL_NAME = 'request_recovery_test_tool';

class RequestRecoveryTestTool extends BaseTool {
  static getName(): string {
    return RECOVERY_TOOL_NAME;
  }

  static getDescription(): string {
    return 'Reads one deterministic path for request-recovery settlement tests.';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(): Promise<string> {
    return 'unused';
  }
}

class CapturingResumeLLM extends BaseLLM {
  public readonly _renderer = new OpenAIChatRenderer();
  public readonly streamCaptures: Array<{
    messages: Message[];
    renderedPayload: any;
    kwargs: Record<string, unknown>;
  }> = [];

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

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    throw new Error('unused: streamMessages is overridden by this test double');
  }

  override async *streamMessages(
    messages: Message[],
    renderedPayload: unknown = null,
    kwargs: Record<string, unknown> = {},
    _options: LLMInvocationOptions = {},
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.streamCaptures.push({ messages: [...messages], renderedPayload, kwargs });
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

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    throw new Error('unused: streamMessages is overridden by this test double');
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

class ToolCallingRecoveryLLM extends BaseLLM {
  public readonly _renderer = new OpenAIChatRenderer();
  public readonly streamCaptures: Message[][] = [];

  constructor() {
    super(
      new LLMModel({
        name: 'tool-recovery-openai-compatible',
        value: 'tool-recovery-openai-compatible',
        canonicalName: 'tool-recovery-openai-compatible',
        provider: LLMProvider.OPENAI,
      }),
      new LLMConfig({ systemMessage: 'System prompt', maxTokens: 64 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    throw new Error('unused: streamMessages is overridden by this test double');
  }

  override async *streamMessages(
    messages: Message[],
    _renderedPayload: unknown = null,
    _kwargs: Record<string, unknown> = {},
    _options: LLMInvocationOptions = {},
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.streamCaptures.push([...messages]);
    yield new ChunkResponse({
      content: 'I will inspect the retained context.',
      tool_calls: [{
        index: 0,
        call_id: 'call_recovery_tool',
        name: RECOVERY_TOOL_NAME,
        arguments_delta: '{"path":"/tmp/context.txt"}',
      }],
    });
    yield new ChunkResponse({ content: '', is_complete: true });
  }
}

class InterruptingPartialRecoveryLLM extends BaseLLM {
  public readonly _renderer = new OpenAIChatRenderer();
  public readonly streamCaptures: Message[][] = [];

  constructor(private readonly interrupt: () => void) {
    super(
      new LLMModel({
        name: 'interruption-recovery-openai-compatible',
        value: 'interruption-recovery-openai-compatible',
        canonicalName: 'interruption-recovery-openai-compatible',
        provider: LLMProvider.OPENAI,
      }),
      new LLMConfig({ systemMessage: 'System prompt', maxTokens: 64 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    throw new Error('unused: streamMessages is overridden by this test double');
  }

  override async *streamMessages(
    messages: Message[],
    _renderedPayload: unknown = null,
    _kwargs: Record<string, unknown> = {},
    _options: LLMInvocationOptions = {},
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.streamCaptures.push([...messages]);
    yield new ChunkResponse({ content: 'partial response retained before interruption' });
    this.interrupt();
    yield new ChunkResponse({ content: 'must not be retained', is_complete: true });
  }
}

const makePhaseInput = (turnId: string, content: string) => ({
  llmUserMessage: new LLMUserMessage({ content }),
  turnId,
  sourceEvent: new UserMessageReceivedEvent(new AgentInputUserMessage(content)),
});

describe('LlmPhase unified streaming setup', () => {
  it('uses the unified handler path without tool schemas when the turn has no tools', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-phase-no-tools-'));
    try {
      const llm = new CapturingResumeLLM();
      const memoryManager = new MemoryManager({
        store: new FileMemoryStore(tempDir, 'agent_no_tools'),
      });
      const state = new AgentRuntimeState('agent_no_tools');
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      state.toolInstances = {};
      const config = new AgentConfig('agent', 'role', 'description', llm, 'System prompt', []);
      const context = new AgentContext('agent_no_tools', config, state);
      const turn = new AgentTurn('turn_no_tools');

      const outcome = await new LlmPhase().run(
        makePhaseInput(turn.turnId, 'reply normally'),
        context,
        turn,
        null,
      );

      expect(outcome).toMatchObject({
        kind: 'final',
        response: { content: 'resumed' },
      });
      expect(llm.streamCaptures).toHaveLength(1);
      expect(llm.streamCaptures[0].kwargs).toEqual({
        logicalConversationId: 'agent_no_tools',
      });
      expect(llm.streamCaptures[0].kwargs).not.toHaveProperty('tools');
      expect(memoryManager.listTurnRawTracesOrdered().some(({ traceType }) =>
        traceType === 'tool_call' || traceType === 'tool_result'
      )).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('LlmPhase successful retained-outcome recovery settlement', () => {
  it('captures once and releases once after real Tool-invocation ingestion without restoring retained context', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-phase-tool-recovery-'));
    const registrySnapshot = defaultToolRegistry.snapshot();
    try {
      expect(registerToolClass(RequestRecoveryTestTool)).toBe(true);
      const store = new FileMemoryStore(tempDir, 'agent_tool_recovery');
      const memoryManager = new MemoryManager({ store });
      memoryManager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.USER, { content: 'baseline context' }),
      ]));
      const captureRecovery = vi.spyOn(memoryManager, 'captureLlmRequestRecoverySnapshot');
      const restoreRecovery = vi.spyOn(memoryManager, 'restoreLlmRequestRecoverySnapshot');
      const commitRecovery = vi.spyOn(memoryManager, 'commitLlmRequestRecoverySnapshot');

      const llm = new ToolCallingRecoveryLLM();
      const state = new AgentRuntimeState('agent_tool_recovery');
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      const tool = new RequestRecoveryTestTool();
      state.toolInstances = { [RECOVERY_TOOL_NAME]: tool };
      const config = new AgentConfig('agent', 'role', 'description', llm, 'System prompt', [tool]);
      const context = new AgentContext('agent_tool_recovery', config, state);
      const turn = new AgentTurn('turn_tool_recovery');

      const outcome = await new LlmPhase().run(
        makePhaseInput(turn.turnId, 'read the retained context'),
        context,
        turn,
        null,
      );

      expect(outcome).toMatchObject({
        kind: 'tool_invocations',
        toolInvocations: [{
          id: 'call_recovery_tool',
          name: RECOVERY_TOOL_NAME,
          arguments: { path: '/tmp/context.txt' },
          turnId: turn.turnId,
        }],
      });
      expect(captureRecovery).toHaveBeenCalledTimes(1);
      expect(commitRecovery).toHaveBeenCalledTimes(1);
      expect(restoreRecovery).not.toHaveBeenCalled();
      const captured = captureRecovery.mock.results[0]?.value;
      expect(captured).toBeDefined();
      expect(commitRecovery).toHaveBeenCalledWith(captured);

      const retained = memoryManager.getWorkingContextMessages();
      expect(retained.at(-1)).toMatchObject({
        role: MessageRole.ASSISTANT,
        content: 'I will inspect the retained context.',
      });
      expect(retained.at(-1)?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect((retained.at(-1)?.tool_payload as ToolCallPayload).toolCalls).toEqual([
        expect.objectContaining({
          id: 'call_recovery_tool',
          name: RECOVERY_TOOL_NAME,
          arguments: { path: '/tmp/context.txt' },
        }),
      ]);
      expect(memoryManager.listTurnRawTracesOrdered()).toEqual(expect.arrayContaining([
        expect.objectContaining({
          traceType: 'tool_call',
          toolCallId: 'call_recovery_tool',
          turnId: turn.turnId,
        }),
      ]));
    } finally {
      defaultToolRegistry.restore(registrySnapshot);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('captures once and releases once on retained partial interruption without restoring or settling twice', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-phase-interruption-recovery-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_interruption_recovery');
      const memoryManager = new MemoryManager({ store });
      memoryManager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.USER, { content: 'baseline context' }),
      ]));
      const captureRecovery = vi.spyOn(memoryManager, 'captureLlmRequestRecoverySnapshot');
      const restoreRecovery = vi.spyOn(memoryManager, 'restoreLlmRequestRecoverySnapshot');
      const commitRecovery = vi.spyOn(memoryManager, 'commitLlmRequestRecoverySnapshot');

      const turn = new AgentTurn('turn_interruption_recovery');
      const llm = new InterruptingPartialRecoveryLLM(() => {
        expect(turn.interrupt('user_interrupt')).toMatchObject({ accepted: true, status: 'accepted' });
      });
      const state = new AgentRuntimeState('agent_interruption_recovery');
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      const config = new AgentConfig('agent', 'role', 'description', llm, 'System prompt', []);
      const context = new AgentContext('agent_interruption_recovery', config, state);

      await expect(new LlmPhase().run(
        makePhaseInput(turn.turnId, 'retain this interrupted request'),
        context,
        turn,
        null,
      )).rejects.toMatchObject({
        name: 'AgentInterruptionError',
        turnId: turn.turnId,
        reason: 'user_interrupt',
      });

      expect(captureRecovery).toHaveBeenCalledTimes(1);
      expect(commitRecovery).toHaveBeenCalledTimes(1);
      expect(restoreRecovery).not.toHaveBeenCalled();
      const captured = captureRecovery.mock.results[0]?.value;
      expect(captured).toBeDefined();
      expect(commitRecovery).toHaveBeenCalledWith(captured);

      const retained = memoryManager.getWorkingContextMessages();
      expect(retained.some((message) =>
        message.role === MessageRole.USER &&
        message.content?.includes('baseline context') &&
        message.content?.includes('retain this interrupted request')
      )).toBe(true);
      expect(retained).toEqual(expect.arrayContaining([
        expect.objectContaining({
          role: MessageRole.ASSISTANT,
          content: 'partial response retained before interruption',
        }),
      ]));
      expect(retained.some((message) => message.content === 'must not be retained')).toBe(false);
      expect(memoryManager.listTurnRawTracesOrdered()).toEqual(expect.arrayContaining([
        expect.objectContaining({
          traceType: 'assistant',
          sourceEvent: 'LlmPhaseInterruptedPartial',
          content: 'partial response retained before interruption',
          turnId: turn.turnId,
        }),
      ]));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

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
      const captureRecovery = vi.spyOn(memoryManager, 'captureLlmRequestRecoverySnapshot');
      const restoreRecovery = vi.spyOn(memoryManager, 'restoreLlmRequestRecoverySnapshot');
      const commitRecovery = vi.spyOn(memoryManager, 'commitLlmRequestRecoverySnapshot');

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
        SYNTHETIC_TOOL_RESULT_ERROR('generate_image', 'call_resume_missing')
      );
      expect(rendered[assistantIndex + 2]).toMatchObject({ role: 'user' });
      expect(rendered[assistantIndex + 2].content).toContain('earlier failed continue attempt');
      expect(rendered[assistantIndex + 2].content).toContain('The user\'s current message is:');
      expect(rendered[assistantIndex + 2].content).toContain('please continue there was a shutdown');
      expect(rendered.at(-1)).toEqual(rendered[assistantIndex + 2]);
      expect(captureRecovery).toHaveBeenCalledTimes(1);
      expect(restoreRecovery).not.toHaveBeenCalled();
      expect(commitRecovery).toHaveBeenCalledTimes(1);
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
      const captureRecovery = vi.spyOn(memoryManager, 'captureLlmRequestRecoverySnapshot');
      const restoreRecovery = vi.spyOn(memoryManager, 'restoreLlmRequestRecoverySnapshot');
      const commitRecovery = vi.spyOn(memoryManager, 'commitLlmRequestRecoverySnapshot');

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
        image_urls: ['data:image/png;base64,aW1hZ2U='],
      });
      expect(llm.streamCaptures[0].at(-1)?.content).toContain('baseline context');
      expect(llm.streamCaptures[0].at(-1)?.content).toContain('The user\'s current message is:');
      expect(llm.streamCaptures[0].at(-1)?.content).toContain('inspect this image');
      expect(memoryManager.getWorkingContextMessages()).toEqual([
        expect.objectContaining({ role: MessageRole.SYSTEM, content: 'System prompt' }),
        expect.objectContaining({ role: MessageRole.USER, content: 'baseline context' }),
      ]);
      expect(captureRecovery).toHaveBeenCalledTimes(1);
      expect(restoreRecovery).toHaveBeenCalledTimes(1);
      expect(commitRecovery).not.toHaveBeenCalled();

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
      expect(llm.streamCaptures[1].at(-1)).toMatchObject({ role: MessageRole.USER, image_urls: [] });
      expect(llm.streamCaptures[1].at(-1)?.content).toContain('baseline context');
      expect(llm.streamCaptures[1].at(-1)?.content).toContain('The user\'s current message is:');
      expect(llm.streamCaptures[1].at(-1)?.content).toContain('continue with text only');
      expect(llm.streamCaptures[1].some((message) => message.image_urls.length > 0)).toBe(false);
      expect(memoryManager.getWorkingContextMessages().some((message) =>
        message.image_urls.includes('data:image/png;base64,aW1hZ2U=')
      )).toBe(false);
      expect(captureRecovery).toHaveBeenCalledTimes(2);
      expect(restoreRecovery).toHaveBeenCalledTimes(1);
      expect(commitRecovery).toHaveBeenCalledTimes(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
