import type { OpenAI } from 'openai';
import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { Message } from '../utils/messages.js';
import { convertOpenAIToolCalls } from '../converters/openai-tool-call-converter.js';
import { OpenAIChatRenderer } from '../prompt-renderers/openai-chat-renderer.js';

// We need to inject the OpenAI client implementation or factory.
// Python implementation constructs `OpenAI` client inside. 
// We should use the official `openai` Node SDK.
import { OpenAI as OpenAIClient } from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption
} from 'openai/resources/chat/completions.mjs';
import { ChatCompletionChunk } from 'openai/resources/chat/completions.mjs';

export class OpenAICompatibleLLM extends BaseLLM {
  protected client: OpenAIClient;
  protected maxTokens?: number;
  protected _renderer: OpenAIChatRenderer;

  constructor(
    model: LLMModel,
    apiKeyEnvVar: string,
    baseUrl: string,
    llmConfig?: LLMConfig,
    apiKeyDefault?: string
  ) {
    let effectiveConfig = model.defaultConfig ? model.defaultConfig.clone() : new LLMConfig();
    if (llmConfig) {
      effectiveConfig.mergeWith(llmConfig);
    }
    
    // Pass to super
    super(model, effectiveConfig);

    let apiKey = process.env[apiKeyEnvVar];
    if ((!apiKey || apiKey === "") && apiKeyDefault) {
       apiKey = apiKeyDefault;
    }

    if (!apiKey) {
      throw new Error(`${apiKeyEnvVar} environment variable is not set.`);
    }

    this.client = new OpenAIClient({
      apiKey: apiKey,
      baseURL: baseUrl
    });
    
    this.maxTokens = effectiveConfig.maxTokens ?? undefined;
    this._renderer = new OpenAIChatRenderer();
  }

  private createTokenUsage(usageData?: OpenAIClient.CompletionUsage): TokenUsage | null {
    if (!usageData) return null;
    return {
      prompt_tokens: usageData.prompt_tokens,
      completion_tokens: usageData.completion_tokens,
      total_tokens: usageData.total_tokens
    };
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages) as ChatCompletionMessageParam[];
    
    const params: OpenAIClient.Chat.ChatCompletionCreateParams = {
      model: this.model.value,
      messages: formattedMessages,
      ...kwargs
    };

    if (this.maxTokens) {
      params.max_completion_tokens = this.maxTokens; 
    }
    
    // extra params handling
    if (this.config.extraParams) {
       Object.assign(params, this.config.extraParams);
    }
    if (Array.isArray(kwargs.tools)) {
      params.tools = kwargs.tools as ChatCompletionTool[];
    }
    if (kwargs.tool_choice !== undefined && kwargs.tool_choice !== null) {
      params.tool_choice = kwargs.tool_choice as ChatCompletionToolChoiceOption;
    }

    try {
      const response = await this.client.chat.completions.create(params as any); // Cast for extra params flexibility
      const choice = response.choices[0];
      const message = choice.message;
      
      const content = message.content || "";
      return new CompleteResponse({
        content,
        usage: this.createTokenUsage(response.usage),
        // reasoning
      });
    } catch (e) {
      throw new Error(`Error in API request: ${e}`);
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages) as ChatCompletionMessageParam[];
    const params: any = {
      model: this.model.value,
      messages: formattedMessages,
      stream: true,
      stream_options: { include_usage: true },
      ...kwargs
    };

    if (this.maxTokens) params.max_completion_tokens = this.maxTokens;
    if (this.config.extraParams) Object.assign(params, this.config.extraParams);

    if (Array.isArray(kwargs.tools)) params.tools = kwargs.tools as ChatCompletionTool[];

    try {
      const stream = await this.client.chat.completions.create(params) as unknown as AsyncIterable<ChatCompletionChunk>;
      
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
           const delta = chunk.choices[0].delta;
           
           // Handle content
           if (delta.content) {
             yield new ChunkResponse({ content: delta.content });
           }

           // Handle tool calls
           if (delta.tool_calls) {
             const toolDeltas = convertOpenAIToolCalls(delta.tool_calls as any);
             if (toolDeltas) {
               yield new ChunkResponse({ content: "", tool_calls: toolDeltas });
             }
           }
        }

        if (chunk.usage) {
           yield new ChunkResponse({ 
             content: "", is_complete: true, usage: this.createTokenUsage(chunk.usage) 
           });
        }
      }

    } catch (e) {
      throw new Error(`Error in API streaming: ${e}`);
    }
  }
}
