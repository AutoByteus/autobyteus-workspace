import { describe, it, expect } from 'vitest';
import { DefaultXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/default-xml-schema-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

const normalizeXml = (xml: string): string =>
  xml
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

describe('DefaultXmlSchemaFormatter', () => {
  it('provide with complex flat schema', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'The path to the input file.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'mode',
      type: ParameterType.ENUM,
      description: 'Processing mode.',
      required: true,
      enumValues: ['read', 'write']
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'overwrite',
      type: ParameterType.BOOLEAN,
      description: 'Overwrite existing file.',
      required: false,
      defaultValue: false
    }));

    const toolDef = new ToolDefinition(
      'AdvancedFileProcessor',
      'Processes a file with advanced options.',
      ToolOrigin.LOCAL,
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="AdvancedFileProcessor" description="Processes a file with advanced options.">
        <arguments>
          <arg name="input_path" type="string" description="The path to the input file." required="true" />
          <arg name="mode" type="enum" description="Processing mode." required="true" enum_values="read,write" />
          <arg name="overwrite" type="boolean" description="Overwrite existing file." required="false" default="False" />
        </arguments>
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });

  it('provide with no args', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const toolDef = new ToolDefinition(
      'NoArgTool',
      'A tool with no arguments.',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: DummyTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="NoArgTool" description="A tool with no arguments.">
        <!-- This tool takes no arguments -->
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });

  it('provide with nested object', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const nestedSchema = new ParameterSchema();
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'name',
      type: ParameterType.STRING,
      description: 'The name of the person.',
      required: true
    }));
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'age',
      type: ParameterType.INTEGER,
      description: 'The age of the person.',
      required: false
    }));

    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'user_profile',
      type: ParameterType.OBJECT,
      description: "The user's profile.",
      objectSchema: nestedSchema
    }));

    const toolDef = new ToolDefinition(
      'UserProfileTool',
      'A tool for user profiles.',
      ToolOrigin.LOCAL,
      'test',
      () => mainSchema,
      () => null,
      { toolClass: DummyTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="UserProfileTool" description="A tool for user profiles.">
        <arguments>
          <arg name="user_profile" type="object" description="The user's profile." required="false">
            <arg name="name" type="string" description="The name of the person." required="true" />
            <arg name="age" type="integer" description="The age of the person." required="false" />
          </arg>
        </arguments>
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });

  it('provide with array of objects', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const nestedSchema = new ParameterSchema();
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'name',
      type: ParameterType.STRING,
      description: 'The name of the person.',
      required: true
    }));
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'age',
      type: ParameterType.INTEGER,
      description: 'The age of the person.',
      required: false
    }));

    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'users',
      type: ParameterType.ARRAY,
      description: 'A list of users.',
      arrayItemSchema: nestedSchema
    }));

    const toolDef = new ToolDefinition(
      'UserListTool',
      'A tool for user lists.',
      ToolOrigin.LOCAL,
      'test',
      () => mainSchema,
      () => null,
      { toolClass: DummyTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="UserListTool" description="A tool for user lists.">
        <arguments>
          <arg name="users" type="array" description="A list of users." required="false">
            <items type="object">
              <arg name="name" type="string" description="The name of the person." required="true" />
              <arg name="age" type="integer" description="The age of the person." required="false" />
            </items>
          </arg>
        </arguments>
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });

  it('provide with array of objects dict schema', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'users',
      type: ParameterType.ARRAY,
      description: 'A list of users.',
      arrayItemSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The name of the person.' },
          age: { type: 'integer', description: 'The age of the person.' }
        },
        required: ['name']
      }
    }));

    const toolDef = new ToolDefinition(
      'UserListTool',
      'A tool for user lists.',
      ToolOrigin.LOCAL,
      'test',
      () => mainSchema,
      () => null,
      { toolClass: DummyTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="UserListTool" description="A tool for user lists.">
        <arguments>
          <arg name="users" type="array" description="A list of users." required="false">
            <items type="object">
              <arg name="name" type="string" description="The name of the person." required="true" />
              <arg name="age" type="integer" description="The age of the person." required="false" />
            </items>
          </arg>
        </arguments>
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });

  it('provide with array of strings', () => {
    const formatter = new DefaultXmlSchemaFormatter();
    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'tags',
      type: ParameterType.ARRAY,
      description: 'A list of tags.',
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

    const xmlOutput = formatter.provide(toolDef);

    const expectedXml = `
      <tool name="TaggerTool" description="A tool for tagging.">
        <arguments>
          <arg name="tags" type="array" description="A list of tags." required="false">
            <items type="string" />
          </arg>
        </arguments>
      </tool>
    `;

    expect(normalizeXml(xmlOutput)).toBe(normalizeXml(expectedXml));
  });
});
