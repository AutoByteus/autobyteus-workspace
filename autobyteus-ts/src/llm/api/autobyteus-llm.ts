import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { Message } from '../utils/messages.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { AutobyteusClient } from '../../clients/autobyteus-client.js';
import { AutobyteusPromptRenderer } from '../prompt-renderers/autobyteus-prompt-renderer.js';
import { AutobyteusConversationPayload } from './autobyteus-conversation-payload.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toTokenUsage = (value: unknown): TokenUsage => {
  const record = isRecord(value) ? value : {};
  return {
    prompt_tokens: typeof record.prompt_tokens === 'number' ? record.prompt_tokens : 0,
    completion_tokens: typeof record.completion_tokens === 'number' ? record.completion_tokens : 0,
    total_tokens: typeof record.total_tokens === 'number' ? record.total_tokens : 0
  };
};

export class AutobyteusLLM extends BaseLLM {
  private client: AutobyteusClient;
  private usedConversationIds: Set<string>;
  private _renderer: AutobyteusPromptRenderer;

  constructor(model: LLMModel, llmConfig: LLMConfig) {
    if (!model.hostUrl) {
      throw new Error('AutobyteusLLM requires a hostUrl to be set on the LLMModel.');
    }

    super(model, llmConfig);

    this.client = new AutobyteusClient(model.hostUrl);
    this.usedConversationIds = new Set();
    this._renderer = new AutobyteusPromptRenderer();
  }

  resolveConversationId(kwargs: Record<string, unknown>): string {
    const logicalConversationId = asString(kwargs.logicalConversationId)?.trim();
    if (!logicalConversationId) {
      throw new Error('AutobyteusLLM requires kwargs.logicalConversationId as a non-empty string.');
    }
    return logicalConversationId;
  }

  protected async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    const conversationId = this.resolveConversationId(kwargs);
    const payload = await this.renderPayload(messages);
    this.usedConversationIds.add(conversationId);

    const response = await this.client.sendMessage({
      conversationId,
      modelName: this.model.name,
      payload
    });

    const responseRecord = isRecord(response) ? response : {};
    const assistantMessage =
      asString(responseRecord.response) ??
      asString(responseRecord.content) ??
      asString(responseRecord.message) ??
      '';
    const tokenUsage = toTokenUsage(responseRecord.token_usage);

    return new CompleteResponse({
      content: assistantMessage,
      usage: tokenUsage
    });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const conversationId = this.resolveConversationId(kwargs);
    const payload = await this.renderPayload(messages);
    this.usedConversationIds.add(conversationId);

    for await (const chunk of this.client.streamMessage({
      conversationId,
      modelName: this.model.name,
      payload
    })) {
      if (chunk?.error) {
        throw new Error(String(chunk.error));
      }

      const chunkRecord = isRecord(chunk) ? chunk : {};
      const content = asString(chunkRecord.content) ?? '';

      const isComplete = Boolean(chunkRecord.is_complete ?? false);
      let usage: TokenUsage | null = null;

      if (isComplete) {
        usage = toTokenUsage(chunkRecord.token_usage);
      }

      yield new ChunkResponse({
        content,
        reasoning: asString(chunkRecord.reasoning) ?? null,
        is_complete: isComplete,
        image_urls: asStringArray(chunkRecord.image_urls),
        audio_urls: asStringArray(chunkRecord.audio_urls),
        video_urls: asStringArray(chunkRecord.video_urls),
        usage
      });
    }
  }

  private async renderPayload(messages: Message[]): Promise<AutobyteusConversationPayload> {
    return this._renderer.render(messages);
  }

  async cleanup(): Promise<void> {
    let cleanupError: unknown = null;
    for (const conversationId of this.usedConversationIds) {
      try {
        await this.client.cleanup(conversationId);
      } catch (error) {
        cleanupError ??= error;
      }
    }
    await super.cleanup();
    if (cleanupError) {
      throw cleanupError;
    }
  }
}
