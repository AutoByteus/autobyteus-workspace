import { describe, it, expect } from 'vitest';
import { DefaultJsonSchemaFormatter } from '../../../../../src/tools/usage/formatters/default-json-schema-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

describe('DefaultJsonSchemaFormatter', () => {
  it('provides default JSON format for complex tool', () => {
    const formatter = new DefaultJsonSchemaFormatter();

    const metadataSchema = new ParameterSchema();
    metadataSchema.addParameter(new ParameterDefinition({
      name: 'author',
      type: ParameterType.STRING,
      description: 'The author of the file.'
    }));
    metadataSchema.addParameter(new ParameterDefinition({
      name: 'version',
      type: ParameterType.FLOAT,
      description: 'The file version.',
      required: true
    }));

    const revisionSchema = new ParameterSchema();
    revisionSchema.addParameter(new ParameterDefinition({
      name: 'revision_id',
      type: ParameterType.INTEGER,
      description: 'The revision number.'
    }));
    revisionSchema.addParameter(new ParameterDefinition({
      name: 'comment',
      type: ParameterType.STRING,
      description: 'A comment for the revision.',
      required: true
    }));

    const mainSchema = new ParameterSchema();
    mainSchema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'The path to the input file.',
      required: true
    }));
    mainSchema.addParameter(new ParameterDefinition({
      name: 'overwrite',
      type: ParameterType.BOOLEAN,
      description: 'Overwrite existing file.',
      required: false,
      defaultValue: false
    }));
    mainSchema.addParameter(new ParameterDefinition({
      name: 'tags',
      type: ParameterType.ARRAY,
      description: 'An array of primitive string tags.',
      required: false,
      arrayItemSchema: ParameterType.STRING
    }));
    mainSchema.addParameter(new ParameterDefinition({
      name: 'metadata',
      type: ParameterType.OBJECT,
      description: 'A nested object with file metadata.',
      required: false,
      objectSchema: metadataSchema
    }));
    mainSchema.addParameter(new ParameterDefinition({
      name: 'revisions',
      type: ParameterType.ARRAY,
      description: 'An array of objects representing revisions.',
      required: false,
      arrayItemSchema: revisionSchema
    }));

    const toolDef = new ToolDefinition(
      'AdvancedFileProcessor',
      'Processes a file with advanced options.',
      ToolOrigin.LOCAL,
      'general',
      () => mainSchema,
      () => null,
      { toolClass: DummyTool }
    );

    const jsonOutput = formatter.provide(toolDef);

    expect(jsonOutput.name).toBe('AdvancedFileProcessor');
    expect(jsonOutput.description).toBe('Processes a file with advanced options.');

    const inputSchema = jsonOutput.inputSchema;
    expect(inputSchema.type).toBe('object');
    expect(inputSchema.required).toEqual(['input_path']);

    const properties = inputSchema.properties;
    expect(Object.keys(properties)).toHaveLength(5);

    expect(properties.input_path.type).toBe('string');
    expect(properties.overwrite.type).toBe('boolean');
    expect(properties.overwrite.default).toBe(false);

    const tagsSchema = properties.tags;
    expect(tagsSchema.type).toBe('array');
    expect(tagsSchema.items.type).toBe('string');
    expect(tagsSchema.description).toBe('An array of primitive string tags.');

    const metadataSchemaJson = properties.metadata;
    expect(metadataSchemaJson.type).toBe('object');
    expect(metadataSchemaJson.description).toBe('A nested object with file metadata.');
    expect(metadataSchemaJson.properties.author.type).toBe('string');
    expect(metadataSchemaJson.properties.version.type).toBe('number');
    expect(metadataSchemaJson.required).toEqual(['version']);

    const revisionsSchema = properties.revisions;
    expect(revisionsSchema.type).toBe('array');
    expect(revisionsSchema.description).toBe('An array of objects representing revisions.');
    const revisionItemSchema = revisionsSchema.items;
    expect(revisionItemSchema.type).toBe('object');
    expect(revisionItemSchema.properties.revision_id.type).toBe('integer');
    expect(revisionItemSchema.properties.comment.type).toBe('string');
    expect(revisionItemSchema.required).toEqual(['comment']);
  });
});
