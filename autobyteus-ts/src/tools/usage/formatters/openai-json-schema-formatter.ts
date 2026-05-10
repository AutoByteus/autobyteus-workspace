import { UsageFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';
import {
  normalizeOpenAiToolParameters,
  type OpenAiToolSchemaOptions
} from './openai-tool-schema-normalizer.js';

export class OpenAiJsonSchemaFormatter implements UsageFormatter {
  constructor(private readonly options: OpenAiToolSchemaOptions = {}) {}

  provide(tool: ToolDefinition): Record<string, unknown> {
    const rawParameters = tool.argumentSchema
      ? tool.argumentSchema.toJsonSchema()
      : { type: "object", properties: {}, required: [] };
    const parameters = normalizeOpenAiToolParameters(rawParameters, this.options);

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters
      }
    };
  }
}
