import { resolveToolCallFormat, type ToolCallFormat } from '../../utils/tool-call-format.js';
import { BasePromptRenderer } from './base-prompt-renderer.js';
import { AnthropicPromptRenderer } from './anthropic-prompt-renderer.js';
import { AnthropicTextToolHistoryRenderer } from './anthropic-text-tool-history-renderer.js';
import { GeminiPromptRenderer } from './gemini-prompt-renderer.js';
import { GeminiTextToolHistoryRenderer } from './gemini-text-tool-history-renderer.js';
import { MistralPromptRenderer } from './mistral-prompt-renderer.js';
import { MistralTextToolHistoryRenderer } from './mistral-text-tool-history-renderer.js';
import { OllamaPromptRenderer } from './ollama-prompt-renderer.js';
import { OllamaTextToolHistoryRenderer } from './ollama-text-tool-history-renderer.js';
import { OpenAIResponsesRenderer } from './openai-responses-renderer.js';
import { OpenAIResponsesTextToolHistoryRenderer } from './openai-responses-text-tool-history-renderer.js';

const isNativeToolFormat = (format: ToolCallFormat): boolean => format === 'api_tool_call';

export function createGeminiPromptRendererForToolFormat(
  format: ToolCallFormat = resolveToolCallFormat()
): BasePromptRenderer {
  return isNativeToolFormat(format)
    ? new GeminiPromptRenderer()
    : new GeminiTextToolHistoryRenderer();
}

export function createOllamaPromptRendererForToolFormat(
  format: ToolCallFormat = resolveToolCallFormat()
): BasePromptRenderer {
  return isNativeToolFormat(format)
    ? new OllamaPromptRenderer()
    : new OllamaTextToolHistoryRenderer();
}

export function createAnthropicPromptRendererForToolFormat(
  format: ToolCallFormat = resolveToolCallFormat()
): BasePromptRenderer {
  return isNativeToolFormat(format)
    ? new AnthropicPromptRenderer()
    : new AnthropicTextToolHistoryRenderer();
}

export function createMistralPromptRendererForToolFormat(
  format: ToolCallFormat = resolveToolCallFormat()
): BasePromptRenderer {
  return isNativeToolFormat(format)
    ? new MistralPromptRenderer()
    : new MistralTextToolHistoryRenderer();
}

export function createOpenAIResponsesRendererForToolFormat(
  format: ToolCallFormat = resolveToolCallFormat()
): BasePromptRenderer {
  return isNativeToolFormat(format)
    ? new OpenAIResponsesRenderer()
    : new OpenAIResponsesTextToolHistoryRenderer();
}
