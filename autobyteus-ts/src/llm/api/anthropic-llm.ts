import { completionFromReason } from './completion-status.js';
import Anthropic from '@anthropic-ai/sdk';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMProvider } from '../providers.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { AnthropicAssistantTurnAssembler } from './anthropic-assistant-turn-assembler.js';
import { parseAnthropicAssistantTurn } from './anthropic-native-assistant-turn.js';
import {
  createAnthropicTokenUsageObservation,
  createAnthropicUsageAccumulator,
  createAnthropicTokenUsageObservationFromAccumulator,
  foldAnthropicUsage,
} from './anthropic-token-usage-normalizer.js';
import { Message, MessageRole, leadingSystemMessages } from '../utils/messages.js';
import { convertAnthropicToolCall } from '../converters/anthropic-tool-call-converter.js';
import { BasePromptRenderer } from '../prompt-renderers/base-prompt-renderer.js';
import { AnthropicPromptRenderer } from '../prompt-renderers/anthropic-prompt-renderer.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import {
  applySafeProviderRequestKwargs,
  cloneSafeProviderRequestKwargs,
} from './provider-request-kwargs.js';
import type {
  CacheControlEphemeral,
  ContentBlock,
  MessageCreateParamsBase,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageParam,
  RawMessageStreamEvent,
  ToolUnion
} from '@anthropic-ai/sdk/resources/messages/messages.js';

/**
 * Agent conversations cache with the 1-hour TTL. Two breakpoints are used: the last
 * top-level system block (covers tools + system) and top-level automatic caching (the
 * growing tail). Both are 1h, so the longer-TTL-first ordering rule always holds.
 */
const ANTHROPIC_CONVERSATION_CACHE_CONTROL: Readonly<CacheControlEphemeral> = { type: 'ephemeral', ttl: '1h' };

/**
 * Only the leading system run becomes the top-level `system`, so a SYSTEM note added
 * later (e.g. an interruption boundary note) never changes the cached system prefix.
 * Late notes stay in place; the prompt renderer sends them as user-role text.
 */
const splitLeadingSystemMessages = (messages: Message[]): { systemPrompt: string | null; remaining: Message[] } => {
  const leading = leadingSystemMessages(messages);
  const systemParts = leading
    .map((msg) => msg.content)
    .filter((content): content is string => Boolean(content));
  const systemPrompt = systemParts.length ? systemParts.join('\n') : null;
  const remaining = messages
    .slice(leading.length)
    .filter((msg) => msg.role !== MessageRole.SYSTEM || Boolean(msg.content));
  return { systemPrompt, remaining };
};

const ANTHROPIC_INTERNAL_EXTRA_PARAM_KEYS = new Set([
  'thinking_enabled',
  'thinking_budget_tokens',
  'thinking_display'
]);
// Config extra params are forwarded to the request except internal toggles and
// `cache_control`, which only the adapter decides (from the invocation's cache scope).
const ANTHROPIC_EXCLUDED_EXTRA_PARAM_KEYS = new Set([...ANTHROPIC_INTERNAL_EXTRA_PARAM_KEYS, 'cache_control']);

/** `@anthropic-ai/sdk` throws "Streaming is required" above ~21k `max_tokens` without a timeout. */
const ANTHROPIC_NON_STREAMING_DEFAULT_MAX_TOKENS = 8192;

const ANTHROPIC_SAMPLING_PARAM_KEYS =new Set(['temperature', 'top_p', 'top_k']);
const ANTHROPIC_CONTROLLED_KWARG_KEYS = new Set(['stream', 'tools', 'cache_control']);

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
  return cloneSafeProviderRequestKwargs(extraParams, { controlledKeys: ANTHROPIC_EXCLUDED_EXTRA_PARAM_KEYS });
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
  params: MessageCreateParamsBase,
  modelValue: string,
  configExtraParams: Record<string, unknown> | null | undefined,
  kwargs: Record<string, unknown>
): void => {
  const request = params as unknown as Record<string, unknown>;
  const policy = resolveAnthropicModelRequestPolicy(modelValue);
  const providerExtraParams = filterInternalExtraParams(configExtraParams);

  applySafeProviderRequestKwargs(request, providerExtraParams);
  applySafeProviderRequestKwargs(request, kwargs, { controlledKeys: ANTHROPIC_CONTROLLED_KWARG_KEYS });

  if (modelValue === 'claude-opus-5-5') {
    const explicitThinking = kwargs.thinking ?? providerExtraParams.thinking;
    const internalEnabled = configExtraParams?.thinking_enabled;
    if (internalEnabled === false || configExtraParams?.thinking_budget_tokens !== undefined ||
        (explicitThinking !== undefined && (!isObjectRecord(explicitThinking) || explicitThinking.type !== 'adaptive'))) {
      throw new Error('Claude Opus 5.5 supports adaptive thinking only; disabled and manual thinking are unavailable.');
    }
    if ([...ANTHROPIC_SAMPLING_PARAM_KEYS].some((key) => request[key] !== undefined)) {
      throw new Error('Claude Opus 5.5 does not support explicit sampling parameters.');
    }
    const toolChoice = request.tool_choice;
    if (toolChoice !== undefined && (!isObjectRecord(toolChoice) || (toolChoice.type !== 'auto' && toolChoice.type !== 'none'))) {
      throw new Error('Claude Opus 5.5 does not support forced tool choice.');
    }
  }

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

  if (modelValue === 'claude-opus-5-5' && request.thinking === undefined) {
    request.thinking = configExtraParams?.thinking_display === 'summarized'
      ? { type: 'adaptive', display: 'summarized' }
      : { type: 'adaptive' };
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
  protected _renderer: BasePromptRenderer;

  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
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

  /**
   * One request builder for the sync and streaming paths, so caching applies identically.
   * Cache markers are added only for a conversation-scoped invocation; one-shot calls
   * (e.g. the compaction summarizer) are sent without any `cache_control`.
   */
  private async buildRequestParams(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions,
    maxTokens: number,
  ): Promise<MessageCreateParamsBase> {
    const { systemPrompt, remaining } = splitLeadingSystemMessages(messages);
    const cachesConversation = options.promptCacheScope === 'conversation';
    const params: MessageCreateParamsBase = {
      model: this.model.value,
      max_tokens: maxTokens,
      messages: await this._renderer.render(remaining) as MessageParam[],
    };

    if (systemPrompt) {
      params.system = cachesConversation
        ? [{ type: 'text', text: systemPrompt, cache_control: { ...ANTHROPIC_CONVERSATION_CACHE_CONTROL } }]
        : systemPrompt;
    }

    applyAnthropicRequestParams(params, this.model.value, this.config.extraParams ?? null, kwargs);

    if (cachesConversation) {
      params.cache_control = { ...ANTHROPIC_CONVERSATION_CACHE_CONTROL };
    }
    return params;
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): Promise<CompleteResponse> {
    // Non-streaming keeps a bounded default: the SDK refuses large non-streaming limits.
    const maxTokens = this.config.maxTokens ?? ANTHROPIC_NON_STREAMING_DEFAULT_MAX_TOKENS;
    const { stream: _stream, ...base } = await this.buildRequestParams(messages, kwargs, options, maxTokens);
    const params: MessageCreateParamsNonStreaming = base;

    try {
      const requestOptions = { ...(options.signal ? { signal: options.signal } : {}),
        ...(options.retryMode === 'single_attempt' ? { maxRetries: 0 } : {}) };
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
        ...completionFromReason(response.stop_reason, ['end_turn', 'stop_sequence'], ['max_tokens', 'model_context_window_exceeded', 'tool_use', 'pause_turn', 'refusal'], response.content?.some((block) => block.type === 'tool_use')),
        content: content ?? '',
        reasoning,
        usage: createAnthropicTokenUsageObservation(response.usage, this.model),
        providerNativeAssistantTurn: response.content?.some((block) => block.type === 'tool_use')
          ? parseAnthropicAssistantTurn({ provider: 'anthropic', blocks: response.content })
          : null,
      });
    } catch (e) {
      throw new Error(`Error in Anthropic API: ${e}`);
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const maxTokens = this.resolveMaxOutputTokens();
    if (maxTokens === null) {
      throw new Error(`Anthropic model '${this.model.value}' has no known maximum output tokens; configure max_tokens for it.`);
    }
    const params: MessageCreateParamsStreaming = {
      ...(await this.buildRequestParams(messages, kwargs, options, maxTokens)),
      stream: true,
    };

    try {
      const requestOptions = { ...(options.signal ? { signal: options.signal } : {}),
        ...(options.retryMode === 'single_attempt' ? { maxRetries: 0 } : {}) };
      const client = await this.getClient();
      const stream = await client.messages.create(params, requestOptions as any);
      
      const usageAccumulator = createAnthropicUsageAccumulator();
      const nativeTurnAssembler = new AnthropicAssistantTurnAssembler();
      let sawToolUse = false;
      let completedNativeTurn = false;

      for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
        nativeTurnAssembler.accept(event);
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') sawToolUse = true;
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
          const turn = nativeTurnAssembler.complete();
          completedNativeTurn = true;
          if (turn?.blocks.some((block) => block.type === 'tool_use')) {
            yield new ChunkResponse({ content: '', providerNativeAssistantTurn: turn });
          }
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
      if (sawToolUse && !completedNativeTurn) {
        throw new Error('Anthropic tool-use stream ended before the native assistant turn was complete.');
      }
    } catch (e) {
      throw new Error(`Error in Anthropic streaming: ${e}`);
    }
  }
}
