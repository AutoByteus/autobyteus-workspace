import { BaseTool, type ToolClass } from './base-tool.js';
import { ToolDefinition } from './registry/tool-definition.js';
import { ToolOrigin } from './tool-origin.js';
import { ToolCategory } from './tool-category.js';
import { DefaultXmlSchemaFormatter } from './usage/formatters/default-xml-schema-formatter.js';

export function formatToolUsageInfo(tools: BaseTool[]): string {
  const formatter = new DefaultXmlSchemaFormatter();
  const sections: string[] = [];

  tools.forEach((tool, index) => {
    let usage = '';
    if (tool.definition && typeof tool.definition.getUsageXml === 'function') {
      usage = tool.definition.getUsageXml();
    } else {
      const toolClass = tool.constructor as ToolClass;
      const category =
        (toolClass as { CATEGORY?: ToolCategory }).CATEGORY ?? ToolCategory.GENERAL;
      try {
        const definition = new ToolDefinition(
          toolClass.getName(),
          toolClass.getDescription(),
          ToolOrigin.LOCAL,
          category,
          () => toolClass.getArgumentSchema(),
          () => toolClass.getConfigSchema(),
          { toolClass }
        );
        usage = formatter.provide(definition);
      } catch {
        usage = '';
      }
    }

    sections.push(`  ${index + 1} ${usage}`.trimEnd());
  });

  return sections.join('\n\n').trim();
}
