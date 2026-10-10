import { GoogleGenAI, type ThinkingConfig } from '@google/genai';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMProvider } from '../providers.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import {
  buildFinish,
  mapProviderFinish,
  withToolCallsFinish,
  type LlmFinishTable,
  type LlmResponseFinish,
} from '../utils/llm-response-finish.js';
import { Message } from '../utils/messages.js';
import { createGeminiTokenUsageObservation } from './gemini-token-usage-normalizer.js';
import type { LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';
import {
  initializeGeminiClientWithRuntime,
  type GeminiRuntimeInfo,
} from '../../utils/gemini-helper.js';
import { resolveModelForRuntime } from '../../utils/gemini-model-mapping.js';
import { convertGeminiToolCalls } from '../converters/gemini-tool-call-converter.js';
import { BasePromptRenderer } from '../prompt-renderers/base-prompt-renderer.js';
import { GeminiPromptRenderer } from '../prompt-renderers/gemini-prompt-renderer.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../utils/gemini-runtime.js';

const THINKING_LEVEL_BUDGETS: Record<string, number> = {
  low: 1024,
  medium: 4096,
  high: 16384
};

const GEMINI_38_MODEL = 'gemini-3.8-flash';
const GEMINI_38_THINKING_LEVELS = new Set(['low', 'medium', 'high']);
const GEMINI_38_FILTERED_EXTRA_PARAM_KEYS = [
  'thinking_level', 'thinkingLevel', 'include_thoughts', 'includeThoughts',
  'thinkingConfig', 'thinking_config', 'thinkingBudget', 'thinking_budget',
  'temperature', 'topP', 'top_p', 'topK', 'top_k',
  'candidateCount', 'candidate_count', 'frequencyPenalty', 'frequency_penalty',
  'presencePenalty', 'presence_penalty', 'tools', 'abortSignal', 'abort_signal'
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Gemini `finishReason` → normalized finish. `MALFORMED_FUNCTION_CALL` and the rest are unmapped. */
const GEMINI_FINISH_TABLE: LlmFinishTable = {
  STOP: 'stop',
  MAX_TOKENS: 'output_limit',
  SAFETY: 'content_filter',
  RECITATION: 'content_filter',
  BLOCKLIST: 'content_filter',
  PROHIBITED_CONTENT: 'content_filter',
  SPII: 'content_filter',
  IMAGE_SAFETY: 'content_filter',
  IMAGE_PROHIBITED_CONTENT: 'content_filter',
  IMAGE_RECITATION: 'content_filter',
  IMAGE_OTHER: 'content_filter',
};

/** A candidate finish reason, else a blocked prompt (`promptFeedback.blockReason`) as filtered. */
const geminiFinish = (
  finishReason: unknown,
  blockReason: unknown,
  emittedToolCalls: boolean,
): LlmResponseFinish | null => {
  if (typeof finishReason !== 'string' && typeof blockReason === 'string' && blockReason) {
    return buildFinish('content_filter', blockReason);
  }
  return withToolCallsFinish(mapProviderFinish(GEMINI_FINISH_TABLE, finishReason), emittedToolCalls);
};

const splitGeminiParts = (parts: Array<Record<string, unknown>> = []): { content: string; reasoning: string } => {
  let content = '';
  let reasoning = '';
  for (const part of parts) {
    const text = part?.text;
    if (typeof text !== 'string' || text.length === 0) {
      continue;
    }
    if (part?.thought) {
      reasoning += text;
    } else {
      content += text;
    }
  }
  return { content, reasoning };
};

/**
 * Request-level `httpOptions` (e.g. from config extra params) replace the client's
 * retry options in `@google/genai`, so a single-attempt call must also pin them here.
 */
const applySingleAttemptRetry = (config: Record<string, unknown>): void => {
  const httpOptions = isRecord(config.httpOptions) ? config.httpOptions : {};
  const retryOptions = isRecord(httpOptions.retryOptions) ? httpOptions.retryOptions : {};
  config.httpOptions = { ...httpOptions, retryOptions: { ...retryOptions, attempts: 1 } };
};

export class GeminiLLM extends BaseLLM {
  private clientPromise: Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  private readonly runtimeResolver: GeminiRuntimeResolver;
  private _renderer: BasePromptRenderer;

  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver, runtimeResolver?: GeminiRuntimeResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    if (!runtimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_REQUIRED');
    this.runtimeResolver = runtimeResolver;
    this._renderer = new GeminiPromptRenderer();
  }

  private getClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(singleAttempt = false): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    const selection = await this.runtimeResolver();
    return initializeGeminiClientWithRuntime(selection, this.apiKeyResolver, { singleAttempt });
  }

  private buildGenerationConfig(tools?: Array<Record<string, unknown>>): Record<string, unknown> {
    const extraParams = { ...(this.config.extraParams ?? {}) };
    const thinkingLevel = extraParams.thinking_level ?? 'medium';
    const includeThoughts = Boolean(extraParams.include_thoughts ?? false);
    delete extraParams.thinking_level;
    delete extraParams.include_thoughts;

    if (this.model.value === GEMINI_38_MODEL) {
      const configuredLevel = String(thinkingLevel);
      const normalizedLevel = GEMINI_38_THINKING_LEVELS.has(configuredLevel)
        ? configuredLevel as 'low' | 'medium' | 'high'
        : 'medium';
      return this.buildGemini38GenerationConfig(extraParams, normalizedLevel, includeThoughts, tools);
    }

    const config: Record<string, unknown> = {
      responseMimeType: 'text/plain',
      systemInstruction: this.systemMessage,
      temperature: this.config.temperature,
      topP: this.config.topP ?? undefined,
      maxOutputTokens: this.resolveMaxOutputTokens() ?? undefined,
      stopSequences: this.config.stopSequences ?? undefined,
      presencePenalty: this.config.presencePenalty ?? undefined,
      frequencyPenalty: this.config.frequencyPenalty ?? undefined
    };

    const budget = THINKING_LEVEL_BUDGETS[String(thinkingLevel)] ?? 0;
    if (budget || includeThoughts) {
      config.thinkingConfig = {
        thinkingBudget: budget,
        includeThoughts
      };
    }

    if (tools && tools.length > 0) {
      config.tools = tools;
    }

    if (Object.keys(extraParams).length) {
      Object.assign(config, extraParams);
    }

    return config;
  }

  private buildGemini38GenerationConfig(
    extraParams: Record<string, unknown>,
    thinkingLevel: 'low' | 'medium' | 'high',
    includeThoughts: boolean,
    tools?: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    for (const key of GEMINI_38_FILTERED_EXTRA_PARAM_KEYS) {
      delete extraParams[key];
    }

    const config: Record<string, unknown> = {
      responseMimeType: 'text/plain',
      systemInstruction: this.systemMessage,
      ...extraParams,
      // Google documents lower-case wire values; the generated SDK enum is upper-case.
      thinkingConfig: { thinkingLevel, includeThoughts } as unknown as ThinkingConfig
    };
    const maxOutputTokens = this.resolveMaxOutputTokens();
    if (maxOutputTokens !== null) config.maxOutputTokens = maxOutputTokens;
    if (this.config.stopSequences !== null) config.stopSequences = this.config.stopSequences;
    if (tools && tools.length > 0) config.tools = tools;

    return config;
  }

  private normalizeGeminiTools(tools: unknown): Array<Record<string, unknown>> | undefined {
    if (!tools) {
      return undefined;
    }

    if (!Array.isArray(tools)) {
      if (!isRecord(tools)) {
        return undefined;
      }
      if ('function_declarations' in tools && !('functionDeclarations' in tools)) {
        return [{ functionDeclarations: tools.function_declarations as unknown }];
      }
      if ('functionDeclarations' in tools) {
        return [tools as Record<string, unknown>];
      }
      return [{ functionDeclarations: [tools] }];
    }

    const first = tools[0];
    if (isRecord(first)) {
      if ('functionDeclarations' in first) {
        return tools;
      }
      if ('function_declarations' in first) {
        return tools.map((tool) => {
          if (isRecord(tool) && 'function_declarations' in tool && !('functionDeclarations' in tool)) {
            return { functionDeclarations: tool.function_declarations as unknown };
          }
          return tool as Record<string, unknown>;
        });
      }
    }

    if (isRecord(first) && 'name' in first && 'description' in first) {
      return [{ functionDeclarations: tools as Array<Record<string, unknown>> }];
    }

    return tools as Array<Record<string, unknown>>;
  }

  private toTokenUsage(usage: unknown): LlmTokenUsageObservation | null {
    return createGeminiTokenUsageObservation(usage, this.model);
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): Promise<CompleteResponse> {
    const history = await this._renderer.render(messages);
    const { client, runtimeInfo } = await (options.retryMode === 'single_attempt'
      ? this.initializeClient(true) : this.getClient());
    const runtimeAdjustedModel = resolveModelForRuntime(
      this.model.value,
      'llm',
      runtimeInfo.runtime
    );

    const tools = this.normalizeGeminiTools(kwargs.tools);
    const config = this.buildGenerationConfig(tools);
    if (options.signal) {
      (config as any).abortSignal = options.signal;
    }
    if (options.retryMode === 'single_attempt') {
      applySingleAttemptRetry(config);
    }

    const response = await client.models.generateContent({
      model: runtimeAdjustedModel,
      contents: history,
      config
    });

    let content = response.text ?? '';
    let reasoning: string | null = null;

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    if (parts.length) {
      const split = splitGeminiParts(parts as Array<Record<string, unknown>>);
      content = split.content || content;
      reasoning = split.reasoning || null;
    }

    return new CompleteResponse({
      finish: geminiFinish(
        response.candidates?.[0]?.finishReason,
        response.promptFeedback?.blockReason,
        parts.some((part) => Boolean(part.functionCall)),
      ),
      content,
      reasoning: reasoning ?? null,
      usage: this.toTokenUsage(response.usageMetadata ?? null)
    });
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const history = await this._renderer.render(messages);
    const { client, runtimeInfo } = await (options.retryMode === 'single_attempt'
      ? this.initializeClient(true) : this.getClient());
    const runtimeAdjustedModel = resolveModelForRuntime(
      this.model.value,
      'llm',
      runtimeInfo.runtime
    );

    const tools = this.normalizeGeminiTools(kwargs.tools);
    const config = this.buildGenerationConfig(tools);
    if (options.signal) {
      (config as any).abortSignal = options.signal;
    }
    if (options.retryMode === 'single_attempt') {
      applySingleAttemptRetry(config);
    }

    const stream = await client.models.generateContentStream({
      model: runtimeAdjustedModel,
      contents: history,
      config
    });

    let nextToolCallIndex = 0;
    let finishReason: unknown = null;
    let blockReason: unknown = null;
    let usageMetadata: unknown = null;

    for await (const chunk of stream) {
      let handledParts = false;
      const candidate = chunk.candidates?.[0];
      if (candidate?.finishReason) finishReason = candidate.finishReason;
      if (chunk.promptFeedback?.blockReason) blockReason = chunk.promptFeedback.blockReason;
      // Usage metadata can arrive on several chunks; the last one is cumulative.
      if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;

      const parts = candidate?.content?.parts ?? [];
      if (parts.length) {
        handledParts = true;
        for (const part of parts) {
          const partText = (part as any)?.text;
          if (partText) {
            if ((part as any)?.thought) {
              yield new ChunkResponse({ content: '', reasoning: partText, is_complete: false });
            } else {
              yield new ChunkResponse({ content: partText, is_complete: false });
            }
          }

          const toolCalls = convertGeminiToolCalls(part, nextToolCallIndex);
          if (toolCalls) {
            nextToolCallIndex += toolCalls.length;
            yield new ChunkResponse({ content: '', tool_calls: toolCalls, is_complete: false });
          }
        }
      }

      if (!handledParts && chunk.text) {
        yield new ChunkResponse({ content: chunk.text, is_complete: false });
      }
    }

    yield new ChunkResponse({
      content: '',
      is_complete: true,
      usage: usageMetadata ? this.toTokenUsage(usageMetadata) : null,
      finish: geminiFinish(finishReason, blockReason, nextToolCallIndex > 0),
    });
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
  }
}
