import { LLMModel } from './models.js';
import { LLMConfig } from './utils/llm-config.js';
import { ExtensionRegistry } from './extensions/extension-registry.js';
import { TokenUsageTrackingExtension } from './extensions/token-usage-tracking-extension.js';
import { LLMExtension } from './extensions/base-extension.js';
import { Message, MessageRole } from './utils/messages.js';
import { LLMUserMessage } from './user-message.js';
import { CompleteResponse, ChunkResponse } from './utils/response-types.js';
import { TokenUsage } from './utils/token-usage.js';

export abstract class BaseLLM {
  public static DEFAULT_SYSTEM_MESSAGE = "You are a helpful assistant";
  
  public model: LLMModel;
  public config: LLMConfig;
  protected extensionRegistry: ExtensionRegistry;
  protected tokenUsageExtension: TokenUsageTrackingExtension;
  public systemMessage: string;

  constructor(model: LLMModel, llmConfig: LLMConfig) {
    // Validation handled by types usually, but we can recurse logic.
    this.model = model;
    this.config = llmConfig;
    this.extensionRegistry = new ExtensionRegistry();
    
    // Auto-register token usage
    this.tokenUsageExtension = new TokenUsageTrackingExtension(this);
    this.registerExtension(this.tokenUsageExtension);

    this.systemMessage = this.config.systemMessage || BaseLLM.DEFAULT_SYSTEM_MESSAGE;
  }

  get latestTokenUsage(): TokenUsage | null {
    if (!this.tokenUsageExtension.isEnabled) {
      return null;
    }
    return this.tokenUsageExtension.getLatestUsage();
  }

  registerExtension(extension: LLMExtension): LLMExtension {
    this.extensionRegistry.register(extension);
    return extension;
  }

  unregisterExtension(extension: LLMExtension): void {
    this.extensionRegistry.unregister(extension);
  }

  getExtension<T extends LLMExtension>(extensionClass: { new(...args: unknown[]): T }): T | null {
    return this.extensionRegistry.get(extensionClass);
  }

  configureSystemPrompt(newSystemPrompt: string): void {
    if (!newSystemPrompt) return; // Warning log

    this.systemMessage = newSystemPrompt;
    this.config.systemMessage = newSystemPrompt;
  }

  protected buildUserMessage(userMessage: LLMUserMessage): Message {
    return new Message(MessageRole.USER, {
      content: userMessage.content,
      image_urls: userMessage.image_urls,
      audio_urls: userMessage.audio_urls,
      video_urls: userMessage.video_urls
    });
  }

  protected buildSystemMessage(): Message | null {
    if (!this.systemMessage) {
      return null;
    }
    return new Message(MessageRole.SYSTEM, this.systemMessage);
  }

  protected async executeBeforeHooks(
    messages: Message[],
    renderedPayload: unknown,
    kwargs: Record<string, unknown>
  ): Promise<void> {
    for (const ext of this.extensionRegistry.getAll()) {
      await ext.beforeInvoke(messages, renderedPayload, kwargs);
    }
  }

  protected async executeAfterHooks(
    messages: Message[],
    response: CompleteResponse | null,
    kwargs: Record<string, unknown>
  ): Promise<void> {
    for (const ext of this.extensionRegistry.getAll()) {
      await ext.afterInvoke(messages, response, kwargs);
    }
  }

  async sendMessages(
    messages: Message[],
    renderedPayload: unknown = null,
    kwargs: Record<string, unknown> = {}
  ): Promise<CompleteResponse> {
    await this.executeBeforeHooks(messages, renderedPayload, kwargs);
    const response = await this._sendMessagesToLLM(messages, kwargs);
    await this.executeAfterHooks(messages, response, kwargs);
    return response;
  }

  async *streamMessages(
    messages: Message[],
    renderedPayload: unknown = null,
    kwargs: Record<string, unknown> = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    await this.executeBeforeHooks(messages, renderedPayload, kwargs);

    let accumulatedContent = "";
    let accumulatedReasoning = "";
    let finalChunk: ChunkResponse | null = null;

    for await (const chunk of this._streamMessagesToLLM(messages, kwargs)) {
      if (chunk.content) accumulatedContent += chunk.content;
      if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
      
      if (chunk.is_complete) finalChunk = chunk;
      
      yield chunk;
    }

    const completeResponse = new CompleteResponse({
      content: accumulatedContent,
      reasoning: accumulatedReasoning || null,
      usage: finalChunk?.usage
    });

    await this.executeAfterHooks(messages, completeResponse, kwargs);
  }

  async sendUserMessage(userMessage: LLMUserMessage, kwargs: Record<string, unknown> = {}): Promise<CompleteResponse> {
    const messages: Message[] = [];
    const systemMessage = this.buildSystemMessage();
    if (systemMessage) {
      messages.push(systemMessage);
    }
    messages.push(this.buildUserMessage(userMessage));
    return this.sendMessages(messages, null, kwargs);
  }

  async *streamUserMessage(
    userMessage: LLMUserMessage,
    kwargs: Record<string, unknown> = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const messages: Message[] = [];
    const systemMessage = this.buildSystemMessage();
    if (systemMessage) {
      messages.push(systemMessage);
    }
    messages.push(this.buildUserMessage(userMessage));
    for await (const chunk of this.streamMessages(messages, null, kwargs)) {
      yield chunk;
    }
  }

  protected async _sendUserMessageToLLM(
    userMessage: LLMUserMessage,
    kwargs: Record<string, unknown> = {}
  ): Promise<CompleteResponse> {
    const messages: Message[] = [];
    const systemMessage = this.buildSystemMessage();
    if (systemMessage) {
      messages.push(systemMessage);
    }
    messages.push(this.buildUserMessage(userMessage));
    return this._sendMessagesToLLM(messages, kwargs);
  }

  protected async *_streamUserMessageToLLM(
    userMessage: LLMUserMessage,
    kwargs: Record<string, unknown> = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const messages: Message[] = [];
    const systemMessage = this.buildSystemMessage();
    if (systemMessage) {
      messages.push(systemMessage);
    }
    messages.push(this.buildUserMessage(userMessage));
    for await (const chunk of this._streamMessagesToLLM(messages, kwargs)) {
      yield chunk;
    }
  }

  protected abstract _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): Promise<CompleteResponse>;

  protected abstract _streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown>;

  async cleanup(): Promise<void> {
    for (const ext of this.extensionRegistry.getAll()) {
      await ext.cleanup();
    }
    this.extensionRegistry.clear();
  }
}
