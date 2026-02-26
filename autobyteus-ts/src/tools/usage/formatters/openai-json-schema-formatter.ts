import { UsageFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class OpenAiJsonSchemaFormatter implements UsageFormatter {
  provide(tool: ToolDefinition): Record<string, unknown> {
    const parameters = tool.argumentSchema
      ? tool.argumentSchema.toJsonSchema()
      : { type: "object", properties: {}, required: [] };

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
