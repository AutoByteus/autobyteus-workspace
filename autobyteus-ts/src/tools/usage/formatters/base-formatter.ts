import { ToolDefinition } from '../../registry/tool-definition.js';

export interface BaseSchemaFormatter {
  provide(tool: ToolDefinition): Record<string, unknown>;
}
