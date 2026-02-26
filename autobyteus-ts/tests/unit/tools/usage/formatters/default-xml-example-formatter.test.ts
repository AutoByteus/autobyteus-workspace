import { describe, it, expect } from 'vitest';
import { DefaultXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/default-xml-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  static getName() {
    return 'dummy_tool';
  }

  static getDescription() {
    return 'Dummy tool for tests.';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(): Promise<any> {
    return null;
  }
}

const normalizeXml = (xml: string): string =>
  xml
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

describe('DefaultXmlExampleFormatter', () => {
  it('simple tool only generates basic example', () => {
    const formatter = new DefaultXmlExampleFormatter();
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'Input path.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'output_path',
      type: ParameterType.STRING,
      description: 'Output path.',
      required: true
    }));

    const toolDef = new ToolDefinition(
      'SimpleCopyTool',
      'A simple tool.',
      ToolOrigin.LOCAL,
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).not.toContain('### Example 2: Advanced Call');

    const expectedBasic = `
      <tool name="SimpleCopyTool">
        <arguments>
          <arg name="input_path">A valid string for 'input_path'</arg>
          <arg name="output_path">A valid string for 'output_path'</arg>
        </arguments>
      </tool>
    `;
    expect(normalizeXml(output)).toContain(normalizeXml(expectedBasic));
  });

  it('complex tool generates basic and advanced examples', () => {
    const formatter = new DefaultXmlExampleFormatter();
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'Input path.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'output_path',
      type: ParameterType.STRING,
      description: 'Optional output path.',
      required: false
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'retries',
      type: ParameterType.INTEGER,
      description: 'Number of retries.',
      required: false,
      defaultValue: 3
    }));

    const toolDef = new ToolDefinition(
      'ComplexTool',
      'A complex tool.',
      ToolOrigin.LOCAL,
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).toContain('### Example 2: Advanced Call (With Optional & Nested Arguments)');

    const expectedBasic = `
      <tool name="ComplexTool">
        <arguments>
          <arg name="input_path">A valid string for 'input_path'</arg>
        </arguments>
      </tool>
    `;
    const expectedAdvanced = `
      <tool name="ComplexTool">
        <arguments>
          <arg name="input_path">A valid string for 'input_path'</arg>
          <arg name="output_path">A valid string for 'output_path'</arg>
          <arg name="retries">3</arg>
        </arguments>
      </tool>
    `;

    const normalized = normalizeXml(output);
    expect(normalized).toContain(normalizeXml(expectedBasic));
    expect(normalized).toContain(normalizeXml(expectedAdvanced));
  });

  it('nested object tool generates correct examples', () => {
    const formatter = new DefaultXmlExampleFormatter();
    const nestedSchema = new ParameterSchema();
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'street',
      type: ParameterType.STRING,
      description: 'Street.',
      required: true
    }));
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'city',
      type: ParameterType.STRING,
      description: 'City.',
      required: true
    }));
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'zip',
      type: ParameterType.STRING,
      description: 'Zip code.',
      required: false
    }));

    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'address',
      type: ParameterType.OBJECT,
      description: 'An address.',
      required: true,
      objectSchema: nestedSchema
    }));

    const toolDef = new ToolDefinition(
      'AddressTool',
      'A tool for addresses.',
      ToolOrigin.LOCAL,
      'test',
      () => mainSchema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).toContain('### Example 2: Advanced Call (With Optional & Nested Arguments)');

    const expectedBasic = `
      <tool name="AddressTool">
        <arguments>
          <arg name="address">
            <arg name="street">A valid string for 'street'</arg>
            <arg name="city">A valid string for 'city'</arg>
          </arg>
        </arguments>
      </tool>
    `;
    const expectedAdvanced = `
      <tool name="AddressTool">
        <arguments>
          <arg name="address">
            <arg name="street">A valid string for 'street'</arg>
            <arg name="city">A valid string for 'city'</arg>
            <arg name="zip">A valid string for 'zip'</arg>
          </arg>
        </arguments>
      </tool>
    `;

    const normalized = normalizeXml(output);
    expect(normalized).toContain(normalizeXml(expectedBasic));
    expect(normalized).toContain(normalizeXml(expectedAdvanced));
  });

  it('array tool shows array in advanced example', () => {
    const formatter = new DefaultXmlExampleFormatter();
    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'filename',
      type: ParameterType.STRING,
      description: 'Filename.',
      required: true
    }));
    mainSchema.addParameter(new ParameterDefinition({
      name: 'tags',
      type: ParameterType.ARRAY,
      description: 'An optional list of tags.',
      required: false,
      arrayItemSchema: ParameterType.STRING
    }));

    const toolDef = new ToolDefinition(
      'TaggerTool',
      'A tool for tagging.',
      ToolOrigin.LOCAL,
      'test',
      () => mainSchema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).toContain('### Example 2: Advanced Call (With Optional & Nested Arguments)');

    const expectedBasic = `
      <tool name="TaggerTool">
        <arguments>
          <arg name="filename">A valid string for 'filename'</arg>
        </arguments>
      </tool>
    `;
    const expectedAdvanced = `
      <tool name="TaggerTool">
        <arguments>
          <arg name="filename">A valid string for 'filename'</arg>
          <arg name="tags">
            <item>A valid string for 'tags_item_1'</item>
            <item>A valid string for 'tags_item_2'</item>
          </arg>
        </arguments>
      </tool>
    `;

    const normalized = normalizeXml(output);
    expect(normalized).toContain(normalizeXml(expectedBasic));
    expect(normalized).toContain(normalizeXml(expectedAdvanced));
  });
});
