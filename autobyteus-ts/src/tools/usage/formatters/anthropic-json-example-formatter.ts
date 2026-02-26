import { BaseExampleFormatter } from './base-formatter.js';
import { DefaultXmlExampleFormatter } from './default-xml-example-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class AnthropicJsonExampleFormatter implements BaseExampleFormatter {
  provide(tool: ToolDefinition): string {
    return new DefaultXmlExampleFormatter().provide(tool);
  }
}
