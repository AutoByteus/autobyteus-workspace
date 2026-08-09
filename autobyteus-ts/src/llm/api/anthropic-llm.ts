import Anthropic from '@anthropic-ai/sdk';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMProvider } from '../providers.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import {
  createAnthropicTokenUsageObservation,
  createAnthropicUsageAccumulator,
  createAnthropicTokenUsageObservationFromAccumulator,
  foldAnthropicUsage,
} from './anthropic-token-usage-normalizer.js';
import { Message, MessageRole } from '../utils/messages.js';
import { convertAnthropicToolCall } from '../converters/anthropic-tool-call-converter.js';
import { BasePromptRenderer } from '../prompt-renderers/base-prompt-renderer.js';
import { AnthropicPromptRenderer } from '../prompt-renderers/anthropic-prompt-renderer.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import {
  applySafeProviderRequestKwargs,
  cloneSafeProviderRequestKwargs,
} from './provider-request-kwargs.js';
import type {
  ContentBlock,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageParam,
  RawMessageStreamEvent,
  ToolUnion
} from '@anthropic-ai/sdk/resources/messages/messages.js';

const splitSystemMessages = (messages: Message[]): { systemPrompt: string | null; remaining: Message[] } => {
  const systemParts = messages
    .filter((msg) => msg.role === MessageRole.SYSTEM)
    .map((msg) => msg.content)
    .filter((content): content is string => Boolean(content));
  const systemPrompt = systemParts.length ? systemParts.join('\n') : null;
  const remaining = messages.filter((msg) => msg.role !== MessageRole.SYSTEM);
  return { systemPrompt, remaining };
};

const ANTHROPIC_INTERNAL_EXTRA_PARAM_KEYS = new Set([
  'thinking_enabled',
  'thinking_budget_tokens',
  'thinking_display'
]);

const ANTHROPIC_SAMPLING_PARAM_KEYS = new Set(['temperature', 'top_p', 'top_k']);
const ANTHROPIC_CONTROLLED_KWARG_KEYS = new Set(['stream', 'tools']);

type AnthropicModelRequestPolicy = {
  usesAdaptiveThinking: boolean;
  supportsThinkingDisabled: boolean;
  rejectsSamplingParameters: boolean;
};

const matchesAnthropicModelFamily = (modelValue: string, familyValue: string): boolean =>
  modelValue === familyValue || modelValue.startsWith(`${familyValue}-`);

const resolveAnthropicModelRequestPolicy = (modelValue: string): AnthropicModelRequestPolicy => {
  const isCurrentAdaptiveModel = [
    'claude-opus-5',
    'claude-opus-4-8',
    'claude-opus-4-7',
    'claude-sonnet-5',
    'claude-fable-5',
  ].some((familyValue) => matchesAnthropicModelFamily(modelValue, familyValue));

  return {
    usesAdaptiveThinking: isCurrentAdaptiveModel,
    supportsThinkingDisabled: matchesAnthropicModelFamily(modelValue, 'claude-sonnet-5'),
    rejectsSamplingParameters: isCurrentAdaptiveModel,
  };
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeThinkingParam = (
  thinking: unknown,
  policy: AnthropicModelRequestPolicy
): unknown | undefined => {
  if (!policy.usesAdaptiveThinking || !isObjectRecord(thinking)) {
    return thinking;
  }

  if (thinking.type === 'enabled') {
    return undefined;
  }

  if (thinking.type === 'disabled' && !policy.supportsThinkingDisabled) {
    return undefined;
  }

  return thinking;
};

const filterInternalExtraParams = (
  extraParams: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  return cloneSafeProviderRequestKwargs(extraParams, { controlledKeys: ANTHROPIC_INTERNAL_EXTRA_PARAM_KEYS });
};

const buildThinkingParam = (
  policy: AnthropicModelRequestPolicy,
  extraParams: Record<string, unknown> | null | undefined
): Record<string, unknown> | null => {
  if (!extraParams) return null;
  const enabled = extraParams.thinking_enabled;
  if (enabled === false && policy.supportsThinkingDisabled) {
    return { type: 'disabled' };
  }
  if (enabled !== true) return null;
  if (policy.usesAdaptiveThinking) {
    const thinking: Record<string, unknown> = { type: 'adaptive' };
    if (extraParams.thinking_display === 'summarized') {
      thinking.display = 'summarized';
    }
    return thinking;
  }
  const budgetRaw = extraParams.thinking_budget_tokens;
  const budget = typeof budgetRaw === 'number' ? budgetRaw : Number(budgetRaw ?? 1024);
  return { type: 'enabled', budget_tokens: Number.isFinite(budget) ? budget : 1024 };
};

const applyAnthropicRequestParams = (
  params: MessageCreateParamsNonStreaming | MessageCreateParamsStreaming,
  modelValue: string,
  configExtraParams: Record<string, unknown> | null | undefined,
  kwargs: Record<string, unknown>
): void => {
  const request = params as unknown as Record<string, unknown>;
  const policy = resolveAnthropicModelRequestPolicy(modelValue);
  const providerExtraParams = filterInternalExtraParams(configExtraParams);

  applySafeProviderRequestKwargs(request, providerExtraParams);
  applySafeProviderRequestKwargs(request, kwargs, { controlledKeys: ANTHROPIC_CONTROLLED_KWARG_KEYS });

  if (Array.isArray(kwargs.tools)) {
    request.tools = kwargs.tools as ToolUnion[];
  }

  const explicitThinking = providerExtraParams.thinking !== undefined || kwargs.thinking !== undefined;
  if (request.thinking !== undefined) {
    const sanitizedThinking = sanitizeThinkingParam(request.thinking, policy);
    if (sanitizedThinking === undefined) {
      delete request.thinking;
    } else {
      request.thinking = sanitizedThinking;
    }
  }

  if (!explicitThinking) {
    const thinkingParam = buildThinkingParam(policy, configExtraParams);
    if (thinkingParam) {
      request.thinking = thinkingParam;
    }
  }

  if (policy.rejectsSamplingParameters) {
    for (const key of ANTHROPIC_SAMPLING_PARAM_KEYS) {
      delete request[key];
    }
    return;
  }

  if (request.thinking === undefined && request.temperature === undefined) {
    request.temperature = 0;
  }
};

const splitClaudeContentBlocks = (blocks: ContentBlock[] | null | undefined): { content: string; thinking: string } => {
  const contentSegments: string[] = [];
  const thinkingSegments: string[] = [];

  for (const block of blocks ?? []) {
    const candidate = block as { type?: string; text?: string; thinking?: string; redacted_thinking?: string };
    if (candidate?.type === 'text' && candidate.text) {
      contentSegments.push(candidate.text);
    } else if (candidate?.type === 'thinking' && candidate.thinking) {
      thinkingSegments.push(candidate.thinking);
    } else if (candidate?.type === 'redacted_thinking' && candidate.redacted_thinking) {
      thinkingSegments.push(candidate.redacted_thinking);
    }
  }

  return { content: contentSegments.join(''), thinking: thinkingSegments.join('') };
};

export class AnthropicLLM extends BaseLLM {
  private clientPromise: Promise<Anthropic> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  protected maxTokens: number;
  protected _renderer: BasePromptRenderer;

  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    this.maxTokens = config.maxTokens ?? 8192;
    this._renderer = new AnthropicPromptRenderer();
  }

  private getClient(): Promise<Anthropic> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<Anthropic> {
    const secret = await this.apiKeyResolver.resolve(LLMProvider.ANTHROPIC);
    return new Anthropic({ apiKey: secret.revealToTrustedConsumer() });
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): Promise<CompleteResponse> {
    const { systemPrompt, remaining } = splitSystemMessages(messages);
    const formattedMessages = await this._renderer.render(remaining) as MessageParam[];

    const params: MessageCreateParamsNonStreaming = {
      model: this.model.value,
      max_tokens: this.maxTokens,
      messages: formattedMessages,
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    applyAnthropicRequestParams(params, this.model.value, this.config.extraParams ?? null, kwargs);

    try {
      const requestOptions = options.signal ? { signal: options.signal } : undefined;
      const client = await this.getClient();
      const response = await client.messages.create(params, requestOptions as any);
      
      let content = '';
      let reasoning: string | null = null;
      if (response.content) {
        const split = splitClaudeContentBlocks(response.content as ContentBlock[]);
        content = split.content;
        reasoning = split.thinking || null;
      }

      return new CompleteResponse({
        content: content ?? '',
        reasoning,
usage: createAnthropicTokenUsageObservation(response.usage, this.model)      });
    } catch (e) {
      throw new Error(`Error in Anthropic API: ${e}`);
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const { systemPrompt, remaining } = splitSystemMessages(messages);
    const formattedMessages = await this._renderer.render(remaining) as MessageParam[];

    const params: MessageCreateParamsStreaming = {
      model: this.model.value,
      max_tokens: this.maxTokens,
      messages: formattedMessages,
      stream: true,
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    applyAnthropicRequestParams(params, this.model.value, this.config.extraParams ?? null, kwargs);
    params.stream = true;

    try {
      const requestOptions = options.signal ? { signal: options.signal } : undefined;
      const client = await this.getClient();
      const stream = await client.messages.create(params, requestOptions as any);
      
      const usageAccumulator = createAnthropicUsageAccumulator();

      for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
        if (event.type === 'message_start' && event.message?.usage) {
          foldAnthropicUsage(usageAccumulator, event.message.usage);
        }
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield new ChunkResponse({ content: event.delta.text });
        }
        if (event.type === 'content_block_delta' && event.delta.type === 'thinking_delta') {
          const thinkingText = event.delta.thinking ?? '';
          if (thinkingText) {
            yield new ChunkResponse({ content: '', reasoning: thinkingText });
          }
        }
        
        const toolDeltas = convertAnthropicToolCall(event);
        if (toolDeltas) {
           yield new ChunkResponse({ content: "", tool_calls: toolDeltas });
        }
        
        if (event.type === 'message_stop') {
           // Usage not always in stop event? 
           // In SDK stream, usage comes in message_delta maybe?
        }
        
        if (event.type === 'message_delta' && event.usage) {
          foldAnthropicUsage(usageAccumulator, event.usage);
          yield new ChunkResponse({
            content: "",
            is_complete: true,
            usage: createAnthropicTokenUsageObservationFromAccumulator(usageAccumulator, this.model)
          });
        }
      }
    } catch (e) {
      throw new Error(`Error in Anthropic streaming: ${e}`);
    }
  }
}
