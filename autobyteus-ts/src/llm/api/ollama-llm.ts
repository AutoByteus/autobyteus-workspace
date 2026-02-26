import { Ollama } from 'ollama';
import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { Message } from '../utils/messages.js';
import { OllamaPromptRenderer } from '../prompt-renderers/ollama-prompt-renderer.js';

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

  protected async _sendMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages);
    const response: any = await this.client.chat({
      model: this.model.value,
      messages: formattedMessages
    });

    const assistantMessage = response?.message?.content ?? '';
    let reasoning: string | null = null;
    let mainContent = assistantMessage;

    if (assistantMessage.includes('<think>') && assistantMessage.includes('</think>')) {
      const startIndex = assistantMessage.indexOf('<think>');
      const endIndex = assistantMessage.indexOf('</think>');
      if (startIndex < endIndex) {
        reasoning = assistantMessage.slice(startIndex + '<think>'.length, endIndex).trim();
        mainContent = (assistantMessage.slice(0, startIndex) + assistantMessage.slice(endIndex + '</think>'.length)).trim();
      }
    }

    const promptTokens = response?.prompt_eval_count ?? 0;
    const completionTokens = response?.eval_count ?? 0;
    const usage: TokenUsage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    };

    return new CompleteResponse({
      content: mainContent,
      reasoning,
      usage
    });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages);

    const stream = await this.client.chat({
      model: this.model.value,
      messages: formattedMessages,
      stream: true
    });

    let accumulatedMain = '';
    let accumulatedReasoning = '';
    let inReasoning = false;
    let finalResponse: any = null;

    for await (const part of stream as AsyncIterable<any>) {
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
