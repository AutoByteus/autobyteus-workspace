import { LLMProvider } from '../../../llm/providers.js';
import { defaultToolRegistry, ToolRegistry } from '../../registry/tool-registry.js';
import { ToolDefinition } from '../../registry/tool-definition.js';
import { AnthropicJsonSchemaFormatter } from '../formatters/anthropic-json-schema-formatter.js';
import { GeminiJsonSchemaFormatter } from '../formatters/gemini-json-schema-formatter.js';
import { OpenAiJsonSchemaFormatter } from '../formatters/openai-json-schema-formatter.js';
import type { OpenAiToolSchemaOptions } from '../formatters/openai-tool-schema-normalizer.js';

export interface ToolSchemaProviderOptions {
  openAi?: OpenAiToolSchemaOptions;
}

export class ToolSchemaProvider {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry = defaultToolRegistry) {
    this.registry = registry;
  }

  buildSchema(
    toolNames: Iterable<string>,
    provider?: LLMProvider | null,
    options: ToolSchemaProviderOptions = {}
  ): Array<Record<string, unknown>> {
    const toolDefinitions: ToolDefinition[] = [];
    for (const name of toolNames) {
      const toolDef = this.registry.getToolDefinition(name);
      if (toolDef) {
        toolDefinitions.push(toolDef);
      } else {
        console.warn(`Tool '${name}' not found in registry.`);
      }
    }

    if (toolDefinitions.length === 0) {
      return [];
    }

    const formatter = this.selectFormatter(provider ?? null, options);
    return toolDefinitions.map((definition) => formatter.provide(definition));
  }

  private selectFormatter(provider: LLMProvider | null, options: ToolSchemaProviderOptions) {
    if (provider === LLMProvider.ANTHROPIC) {
      return new AnthropicJsonSchemaFormatter();
    }
    if (provider === LLMProvider.GEMINI) {
      return new GeminiJsonSchemaFormatter();
    }
    return new OpenAiJsonSchemaFormatter(options.openAi);
  }
}
