import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { AgentRuntime } from '../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { MemoryIngestToolResultProcessor } from '../../../src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { AnthropicPromptRenderer } from '../../../src/llm/prompt-renderers/anthropic-prompt-renderer.js';
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { GeminiPromptRenderer } from '../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import { MistralPromptRenderer } from '../../../src/llm/prompt-renderers/mistral-prompt-renderer.js';
import { OllamaPromptRenderer } from '../../../src/llm/prompt-renderers/ollama-prompt-renderer.js';
import { OpenAIResponsesRenderer } from '../../../src/llm/prompt-renderers/openai-responses-renderer.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../src/utils/parameter-schema.js';
import { FunctionalTool } from '../../../src/tools/functional-tool.js';
import { ToolCategory } from '../../../src/tools/tool-category.js';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import type { BaseTool } from '../../../src/tools/base-tool.js';
import type { ProviderNativeToolCallContext } from '../../../src/llm/utils/tool-call-delta.js';

const originalEnv = { ...process.env };

const SYNTHETIC_AGGREGATE_PREFIX =
  'The following tool executions have completed. Please analyze their results and decide the next course of action.';

type ProviderCase = {
  name: 'gemini' | 'ollama' | 'anthropic' | 'mistral' | 'openai_responses';
  provider: LLMProvider;
  renderer: () => BasePromptRenderer;
};

class ScriptedProviderLLM extends BaseLLM {
  public _renderer: BasePromptRenderer;
  public renderCaptures: Array<{ messages: Message[]; renderedPayload: any; kwargs: Record<string, unknown> }> = [];
  private streamCalls = 0;
  private readonly providerCase: ProviderCase;

  constructor(providerCase: ProviderCase) {
    super(
      new LLMModel({
        name: `integration-${providerCase.name}`,
        value: `integration-${providerCase.name}`,
        canonicalName: `integration-${providerCase.name}`,
        provider: providerCase.provider
      }),
      new LLMConfig({
        systemMessage: 'Provider native tool continuation integration test.',
        temperature: 0,
        maxTokens: 128
      })
    );
    this.providerCase = providerCase;
    this._renderer = providerCase.renderer();
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const renderedPayload = await this._renderer.render(messages);
    this.renderCaptures.push({ messages: [...messages], renderedPayload, kwargs });
    this.streamCalls += 1;

    if (this.streamCalls === 1) {
      yield new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_a',
            name: 'get_weather',
            arguments_delta: JSON.stringify({ city: 'Berlin', unit: 'celsius' }),
            native_context: nativeContextFor(this.providerCase.name, 'call_a', 'get_weather')
          },
          {
            index: 1,
            call_id: 'call_b',
            name: 'get_time',
            arguments_delta: JSON.stringify({ city: 'Berlin' }),
            native_context: nativeContextFor(this.providerCase.name, 'call_b', 'get_time')
          }
        ]
      });
      yield new ChunkResponse({
        content: '',
        is_complete: true,
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
      });
      return;
    }

    yield new ChunkResponse({
      content: 'done',
      is_complete: true,
      usage: { prompt_tokens: 20, completion_tokens: 1, total_tokens: 21 }
    });
  }
}

const nativeContextFor = (
  provider: ProviderCase['name'],
  callId: string,
  name: string
): ProviderNativeToolCallContext | undefined => {
  if (provider === 'gemini') {
    return {
      provider: 'gemini',
      functionCallPart: {
        functionCall: {
          id: callId,
          name,
          args: { stale: true }
        }
      }
    };
  }
  if (provider === 'anthropic') {
    return {
      provider: 'anthropic',
      toolUseBlock: {
        type: 'tool_use',
        id: callId,
        name,
        input: { stale: true }
      }
    };
  }
  if (provider === 'mistral') {
    return {
      provider: 'mistral',
      toolCall: {
        id: callId,
        type: 'function',
        function: { name, arguments: '{"stale":true}' }
      }
    };
  }
  if (provider === 'ollama') {
    return {
      provider: 'ollama',
      toolCall: {
        id: callId,
        type: 'function',
        function: { name, arguments: { stale: true } }
      }
    };
  }
  if (provider === 'openai_responses') {
    return {
      provider: 'openai_responses',
      functionCallItem: {
        type: 'function_call',
        id: callId === 'call_a' ? 'fc_a' : 'fc_b',
        call_id: callId,
        name,
        arguments: '{"stale":true}',
        status: 'completed'
      }
    };
  }
  return undefined;
};

const makeToolDefinition = (name: string): ToolDefinition => {
  const schema = new ParameterSchema([
    new ParameterDefinition({
      name: 'city',
      type: ParameterType.STRING,
      description: 'City name',
      required: true
    })
  ]);

  return new ToolDefinition(
    name,
    `Integration test tool ${name}`,
    ToolOrigin.LOCAL,
    ToolCategory.GENERAL,
    () => schema,
    () => null,
    {
      customFactory: () =>
        new FunctionalTool(
          (city: unknown) => ({ city, tool: name }),
          name,
          `Integration test tool ${name}`,
          schema,
          null,
          false,
          false,
          false,
          ['city'],
          ['city']
        )
    }
  );
};

const registerIntegrationTools = (): Record<string, BaseTool> => {
  defaultToolRegistry.registerTool(makeToolDefinition('get_weather'));
  defaultToolRegistry.registerTool(makeToolDefinition('get_time'));
  return {
    get_weather: defaultToolRegistry.createTool('get_weather'),
    get_time: defaultToolRegistry.createTool('get_time')
  };
};

const providerCases: ProviderCase[] = [
  { name: 'gemini', provider: LLMProvider.GEMINI, renderer: () => new GeminiPromptRenderer() },
  { name: 'ollama', provider: LLMProvider.OLLAMA, renderer: () => new OllamaPromptRenderer() },
  { name: 'anthropic', provider: LLMProvider.ANTHROPIC, renderer: () => new AnthropicPromptRenderer() },
  { name: 'mistral', provider: LLMProvider.MISTRAL, renderer: () => new MistralPromptRenderer() },
  { name: 'openai_responses', provider: LLMProvider.OPENAI, renderer: () => new OpenAIResponsesRenderer() }
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const assertNoSyntheticAggregateUserText = (value: unknown) => {
  const text = JSON.stringify(value);
  expect(text).not.toContain(SYNTHETIC_AGGREGATE_PREFIX);
  expect(text).not.toContain('Tool: get_weather (ID: call_a)');
  expect(text).not.toContain('Tool: get_time (ID: call_b)');
  expect(text).not.toContain('Status: Success');
  expect(text).not.toContain('[TOOL_RESULT]');
  expect(text).not.toContain('[TOOL_CALL]');
};

const assertProviderNativeToolResults = (provider: ProviderCase['name'], rendered: any) => {
  if (provider === 'gemini') {
    const resultTurn = rendered.find((item: any) =>
      item.role === 'user' && item.parts?.some((part: any) => part.functionResponse)
    );
    expect(resultTurn.parts.map((part: any) => part.functionResponse.id)).toEqual(['call_a', 'call_b']);
    expect(resultTurn.parts.every((part: any) => part.functionResponse && !part.text)).toBe(true);
    return;
  }

  if (provider === 'anthropic') {
    const assistantIndex = rendered.findIndex((item: any) =>
      item.role === 'assistant' &&
      Array.isArray(item.content) &&
      item.content.some((block: any) => block.type === 'tool_use')
    );
    const resultTurn = rendered[assistantIndex + 1];
    expect(resultTurn.role).toBe('user');
    expect(resultTurn.content.slice(0, 2).map((block: any) => block.type)).toEqual([
      'tool_result',
      'tool_result'
    ]);
    expect(resultTurn.content.slice(0, 2).map((block: any) => block.tool_use_id)).toEqual([
      'call_a',
      'call_b'
    ]);
    return;
  }

  if (provider === 'ollama') {
    const userMessages = rendered.filter((item: any) => item.role === 'user');
    const toolMessages = rendered.filter((item: any) => item.role === 'tool');
    expect(userMessages.map((item: any) => item.content)).toEqual(['Use both tools.']);
    expect(toolMessages.map((item: any) => item.tool_name)).toEqual(['get_weather', 'get_time']);
    return;
  }

  if (provider === 'mistral') {
    const userMessages = rendered.filter((item: any) => item.role === 'user');
    const toolMessages = rendered.filter((item: any) => item.role === 'tool');
    expect(userMessages.map((item: any) => item.content)).toEqual(['Use both tools.']);
    expect(toolMessages.map((item: any) => item.tool_call_id)).toEqual(['call_a', 'call_b']);
    return;
  }

  const userMessages = rendered.filter((item: any) =>
    item.type === 'message' && item.role === 'user'
  );
  const outputs = rendered.filter((item: any) => item.type === 'function_call_output');
  expect(userMessages.map((item: any) => item.content)).toEqual(['Use both tools.']);
  expect(outputs.map((item: any) => item.call_id)).toEqual(['call_a', 'call_b']);
};

describe('provider-native tool continuation integration flow', () => {
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTOBYTEUS_STREAM_PARSER: 'api_tool_call'
    };
    registrySnapshot = defaultToolRegistry.snapshot();
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
    process.env = { ...originalEnv };
  });

  it.each(providerCases)(
    'continues $name with native tool results and no duplicated aggregate user message',
    async (providerCase) => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `native-continuation-${providerCase.name}-`));
      const llm = new ScriptedProviderLLM(providerCase);
      let runtime: AgentRuntime | null = null;

      try {
        const memoryManager = new MemoryManager({
          store: new FileMemoryStore(tempDir, `agent_${providerCase.name}`)
        });
        const runtimeState = new AgentRuntimeState(`agent_${providerCase.name}`, tempDir);
        runtimeState.memoryManager = memoryManager;
        runtimeState.llmInstance = llm;
        runtimeState.toolInstances = registerIntegrationTools();
        const config = new AgentConfig(
          `NativeContinuation${providerCase.name}`,
          'integration tester',
          'Provider-native continuation integration test',
          llm,
          null,
          Object.values(runtimeState.toolInstances),
          true,
          [new MemoryIngestInputProcessor()],
          null,
          [],
          [new MemoryIngestToolResultProcessor()]
        );
        const context = new AgentContext(runtimeState.agentId, config, runtimeState);
        runtime = new AgentRuntime(context);

        runtime.start();
        const ready = await waitForCondition(
          () => context.currentStatus === AgentStatus.IDLE || context.currentStatus === AgentStatus.ERROR
        );
        expect(ready).toBe(true);
        expect(context.currentStatus).toBe(AgentStatus.IDLE);

        await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('Use both tools.')));

        const continuationReached = await waitForCondition(
          () => llm.renderCaptures.length >= 2 && runtimeState.activeTurn === null,
          10000
        );
        expect(continuationReached).toBe(true);

        const continuationCapture = llm.renderCaptures[1];
        expect(continuationCapture).toBeTruthy();
        assertNoSyntheticAggregateUserText(continuationCapture.messages);
        assertNoSyntheticAggregateUserText(continuationCapture.renderedPayload);

        const internalUserMessages = continuationCapture.messages.filter((message) => message.role === MessageRole.USER);
        expect(internalUserMessages.map((message) => message.content)).toEqual(['Use both tools.']);

        const workingToolMessages = memoryManager
          .getWorkingContextMessages()
          .filter((message) => message.role === MessageRole.TOOL);
        expect(workingToolMessages.map((message) => (message.tool_payload as any).toolCallId)).toEqual([
          'call_a',
          'call_b'
        ]);

        const rawToolResults = memoryManager.store
          .list(MemoryType.RAW_TRACE)
          .filter((item: any) => item.traceType === 'tool_result');
        expect(rawToolResults.map((item: any) => item.toolCallId)).toEqual(['call_a', 'call_b']);

        assertProviderNativeToolResults(providerCase.name, continuationCapture.renderedPayload);
      } finally {
        if (runtime?.isRunning) {
          await runtime.stop(2);
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  );
});
