import { LLMProvider } from '../../../llm/providers.js';
import { ToolFormattingRegistry } from '../registries/tool-formatting-registry.js';
import { BaseXmlSchemaFormatter } from '../formatters/base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class ToolManifestProvider {
  static XML_SCHEMA_HEADER = '## Tool Definition:';
  static XML_EXAMPLE_HEADER = '## Tool Usage Examples and Guidelines:';
  static XML_GENERAL_GUIDELINES =
    'To use this tool, you must construct an XML block exactly like the examples below. ' +
    'Ensure all tags are correctly named and nested. Pay close attention to how arguments, ' +
    'especially complex ones like lists and objects, are formatted.';
  static XML_ARRAY_GUIDELINES =
    'Formatting Lists/Arrays: For any argument that is a list (an array), you MUST wrap each ' +
    'individual value in its own `<item>` tag. Do not use comma-separated strings or JSON-style `[...]` arrays within a single tag.\n\n' +
    'Correct:\n' +
    '<arg name="dependencies">\n' +
    '    <item>task_1</item>\n' +
    '    <item>task_2</item>\n' +
    '</arg>\n\n' +
    'Incorrect:\n' +
    '<arg name="dependencies">[task_1, task_2]</arg>\n' +
    '<arg name="dependencies">task_1, task_2</arg>';

  static JSON_SCHEMA_HEADER = '## Tool Definition:';
  static JSON_EXAMPLE_HEADER = 'Example: To use this tool, you could provide the following JSON object as a tool call:';

  private readonly formattingRegistry: ToolFormattingRegistry;

  constructor() {
    this.formattingRegistry = new ToolFormattingRegistry();
  }

  provide(toolDefinitions: ToolDefinition[], provider?: LLMProvider | null): string {
    const toolBlocks: string[] = [];
    let lastFormatWasXml = false;

    for (const toolDef of toolDefinitions) {
      try {
        const formatterPair = this.formattingRegistry.getFormatterPairForTool(toolDef.name, provider ?? null);
        const schemaFormatter = formatterPair.schemaFormatter;
        const exampleFormatter = formatterPair.exampleFormatter;
        const isXmlFormat = schemaFormatter instanceof BaseXmlSchemaFormatter;
        lastFormatWasXml = isXmlFormat;

        const schema = schemaFormatter.provide(toolDef);
        const example = exampleFormatter.provide(toolDef);

        if (!schema || !example) {
          continue;
        }

        if (isXmlFormat) {
          toolBlocks.push(
            `${ToolManifestProvider.XML_SCHEMA_HEADER}\n${schema}\n\n${ToolManifestProvider.XML_EXAMPLE_HEADER}\n${example}`
          );
        } else {
          const schemaStr = JSON.stringify(schema, null, 2);
          toolBlocks.push(
            `${ToolManifestProvider.JSON_SCHEMA_HEADER}\n${schemaStr}\n\n${ToolManifestProvider.JSON_EXAMPLE_HEADER}\n${example}`
          );
        }
      } catch {
        continue;
      }
    }

    const manifestContent = toolBlocks.join('\n\n---\n\n');

    if (lastFormatWasXml && manifestContent) {
      return `${ToolManifestProvider.XML_GENERAL_GUIDELINES}\n\n${ToolManifestProvider.XML_ARRAY_GUIDELINES}\n\n---\n\n${manifestContent}`;
    }

    return manifestContent;
  }
}
