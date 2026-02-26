import { UsageFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class DefaultJsonSchemaFormatter implements UsageFormatter {
  provide(tool: ToolDefinition): Record<string, unknown> {
    const schema = tool.argumentSchema
      ? tool.argumentSchema.toJsonSchema()
      : { type: "object", properties: {}, required: [] };

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: schema
    };
  }
}
