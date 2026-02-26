import { describe, it, expect } from 'vitest';
import { DefaultXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/default-xml-schema-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

const normalizeXml = (xml: string): string =>
  xml
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

class NoArgTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'No-arg tool'; }
  static getArgumentSchema() { return null; }
}

describe('DefaultXmlSchemaFormatter (integration)', () => {
  it('produces no-arg XML schema', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const toolDef = new ToolDefinition(
      'NoArgTool',
      'A tool with no arguments.',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: NoArgTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="NoArgTool" description="A tool with no arguments.">
        <!-- This tool takes no arguments -->
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });
});
