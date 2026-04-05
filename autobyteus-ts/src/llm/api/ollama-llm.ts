import { Ollama } from 'ollama';
import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { Message } from '../utils/messages.js';
import { OllamaPromptRenderer } from '../prompt-renderers/ollama-prompt-renderer.js';
import { convertOllamaToolCalls } from '../converters/ollama-tool-call-converter.js';

export class OllamaLLM extends BaseLLM {
  private client: Ollama;
  private _renderer: OllamaPromptRenderer;

  constructor(model: LLMModel, llmConfig: LLMConfig) {
    if (!model.hostUrl) {
      throw new Error('OllamaLLM requires a hostUrl to be set on the LLMModel.');
    }

    super(model, llmConfig);
    this.client = new Ollama({ host: model.hostUrl });
    this._renderer = new OllamaPromptRenderer();
  }

  private buildChatRequest(
    messages: Awaited<ReturnType<OllamaPromptRenderer['render']>>,
    kwargs: Record<string, unknown>,
    stream: boolean
  ): Record<string, unknown> {
    const request: Record<string, unknown> = {
      model: this.model.value,
      messages,
      stream
    };

    if (Array.isArray(kwargs.tools)) {
      request.tools = kwargs.tools;
    }

    if (this.config.extraParams) {
      Object.assign(request, this.config.extraParams);
    }

    return request;
  }

  private extractMessageParts(message: any): { content: string; reasoning: string | null } {
    const explicitContent = typeof message?.content === 'string' ? message.content : '';
    const explicitThinking = typeof message?.thinking === 'string' ? message.thinking : '';

    if (explicitThinking) {
      return {
        content: explicitContent,
        reasoning: explicitThinking
      };
    }

    let reasoning: string | null = null;
    let mainContent = explicitContent;

    if (explicitContent.includes('<think>') && explicitContent.includes('</think>')) {
      const startIndex = explicitContent.indexOf('<think>');
      const endIndex = explicitContent.indexOf('</think>');
      if (startIndex < endIndex) {
        reasoning = explicitContent.slice(startIndex + '<think>'.length, endIndex).trim();
        mainContent = (
          explicitContent.slice(0, startIndex) +
          explicitContent.slice(endIndex + '</think>'.length)
        ).trim();
      }
    }

    return {
      content: mainContent,
      reasoning
    };
  }

  protected async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages);
    const response: any = await this.client.chat(this.buildChatRequest(formattedMessages, kwargs, false) as any);
    const messageParts = this.extractMessageParts(response?.message);

    const promptTokens = response?.prompt_eval_count ?? 0;
    const completionTokens = response?.eval_count ?? 0;
    const usage: TokenUsage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    };

    return new CompleteResponse({
      content: messageParts.content,
      reasoning: messageParts.reasoning,
      usage
    });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages);
    const stream = await this.client.chat(this.buildChatRequest(formattedMessages, kwargs, true) as any);

    let accumulatedMain = '';
    let accumulatedReasoning = '';
    let inReasoning = false;
    let finalResponse: any = null;

    for await (const part of stream as AsyncIterable<any>) {
      const explicitThinking = typeof part?.message?.thinking === 'string' ? part.message.thinking : '';
      if (explicitThinking) {
        accumulatedReasoning += explicitThinking;
        yield new ChunkResponse({ content: '', reasoning: explicitThinking });
      }

      let token: string = part?.message?.content ?? '';

      if (token.includes('<think>')) {
        inReasoning = true;
        const parts = token.split('<think>');
        token = parts[parts.length - 1] ?? '';
      }

      if (token.includes('</think>')) {
        inReasoning = false;
        const parts = token.split('</think>');
        token = parts[parts.length - 1] ?? '';
      }

      if (inReasoning) {
        accumulatedReasoning += token;
        yield new ChunkResponse({ content: '', reasoning: token });
      } else {
        accumulatedMain += token;
        if (token) {
          yield new ChunkResponse({ content: token, reasoning: null });
        }
      }

      const toolDeltas = convertOllamaToolCalls(part?.message?.tool_calls);
      if (toolDeltas) {
        yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolDeltas });
      }

      if (part?.done) {
        finalResponse = part;
      }
    }

    let usage: TokenUsage | null = null;
    if (finalResponse) {
      const promptTokens = finalResponse?.prompt_eval_count ?? 0;
      const completionTokens = finalResponse?.eval_count ?? 0;
      usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      };
    }

    yield new ChunkResponse({ content: '', reasoning: null, is_complete: true, usage });
  }
}
