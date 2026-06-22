import { describe, it, expect } from 'vitest';
import { McpSchemaMapper } from '../../../../src/tools/mcp/schema-mapper.js';
import { ParameterSchema, ParameterType } from '../../../../src/utils/parameter-schema.js';

const schemaMapper = new McpSchemaMapper();

describe('McpSchemaMapper', () => {
  it('maps basic object schema', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'User name' },
        age: { type: 'integer', description: 'User age', default: 30 },
        is_member: { type: 'boolean', description: 'Membership status' }
      },
      required: ['name']
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    expect(paramSchema.parameters).toHaveLength(3);

    const nameParam = paramSchema.getParameter('name');
    expect(nameParam).toBeDefined();
    expect(nameParam?.type).toBe(ParameterType.STRING);
    expect(nameParam?.description).toBe('User name');
    expect(nameParam?.required).toBe(true);

    const ageParam = paramSchema.getParameter('age');
    expect(ageParam).toBeDefined();
    expect(ageParam?.type).toBe(ParameterType.INTEGER);
    expect(ageParam?.defaultValue).toBe(30);
    expect(ageParam?.required).toBe(false);

    const memberParam = paramSchema.getParameter('is_member');
    expect(memberParam).toBeDefined();
    expect(memberParam?.type).toBe(ParameterType.BOOLEAN);
    expect(memberParam?.required).toBe(false);
  });

  it('maps enum types', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'Color choice', enum: ['red', 'green', 'blue'] }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const colorParam = paramSchema.getParameter('color');
    expect(colorParam).toBeDefined();
    expect(colorParam?.type).toBe(ParameterType.ENUM);
    expect(colorParam?.enumValues).toEqual(['red', 'green', 'blue']);
  });

  it('maps arrays of primitives', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', description: 'List of tags', items: { type: 'string' } }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const tagsParam = paramSchema.getParameter('tags');
    expect(tagsParam).toBeDefined();
    expect(tagsParam?.type).toBe(ParameterType.ARRAY);
    expect(tagsParam?.arrayItemSchema).toEqual({ type: 'string' });
  });

  it('maps nullable anyOf arrays to arrays while preserving outer metadata', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        input_images: {
          anyOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'null' }
          ],
          default: null,
          description: 'Optional image references as URLs, data URIs, or safe local paths.'
        }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const inputImagesParam = paramSchema.getParameter('input_images');
    expect(inputImagesParam).toBeDefined();
    expect(inputImagesParam?.type).toBe(ParameterType.ARRAY);
    expect(inputImagesParam?.defaultValue).toBeNull();
    expect(inputImagesParam?.arrayItemSchema).toEqual({ type: 'string' });

    const jsonSchema = paramSchema.toJsonSchema();
    const inputImagesProperty = (jsonSchema.properties as Record<string, Record<string, unknown>>).input_images;
    expect(inputImagesProperty).toMatchObject({
      type: 'array',
      default: null,
      description: 'Optional image references as URLs, data URIs, or safe local paths.',
      items: { type: 'string' }
    });
  });

  it('maps nullable anyOf objects to objects instead of strings', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        generation_config: {
          anyOf: [
            { type: 'object', additionalProperties: true },
            { type: 'null' }
          ],
          default: null,
          description: 'Optional model-specific video generation settings.'
        }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const generationConfigParam = paramSchema.getParameter('generation_config');
    expect(generationConfigParam).toBeDefined();
    expect(generationConfigParam?.type).toBe(ParameterType.OBJECT);
    expect(generationConfigParam?.defaultValue).toBeNull();

    const jsonSchema = paramSchema.toJsonSchema();
    const generationConfigProperty = (jsonSchema.properties as Record<string, Record<string, unknown>>).generation_config;
    expect(generationConfigProperty).toMatchObject({
      type: 'object',
      default: null,
      description: 'Optional model-specific video generation settings.'
    });
    expect(generationConfigProperty.type).not.toBe('string');
  });

  it('maps nullable type-array shorthand to the single non-null type', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        input_images: {
          type: ['array', 'null'],
          items: { type: 'string' },
          default: null,
          description: 'Optional image references.'
        }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const inputImagesParam = paramSchema.getParameter('input_images');
    expect(inputImagesParam?.type).toBe(ParameterType.ARRAY);
    expect(inputImagesParam?.arrayItemSchema).toEqual({ type: 'string' });

    const jsonSchema = paramSchema.toJsonSchema();
    const inputImagesProperty = (jsonSchema.properties as Record<string, Record<string, unknown>>).input_images;
    expect(inputImagesProperty).toMatchObject({
      type: 'array',
      items: { type: 'string' },
      default: null
    });
  });

  it('does not guess an arbitrary branch for complex multi-type unions', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        value: {
          anyOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string' },
            { type: 'null' }
          ],
          description: 'A true multi-type union.'
        }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const valueParam = paramSchema.getParameter('value');
    expect(valueParam?.type).toBe(ParameterType.STRING);
    expect(valueParam?.arrayItemSchema).toBeUndefined();
  });

  it('maps nested objects recursively', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'User details',
          properties: {
            name: { type: 'string', description: "User's name" }
          },
          required: ['name']
        }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const userParam = paramSchema.getParameter('user');

    expect(userParam).toBeDefined();
    expect(userParam?.type).toBe(ParameterType.OBJECT);
    expect(userParam?.objectSchema).toBeInstanceOf(ParameterSchema);

    const nestedSchema = userParam?.objectSchema as ParameterSchema;
    expect(nestedSchema.parameters).toHaveLength(1);
    const nestedNameParam = nestedSchema.getParameter('name');
    expect(nestedNameParam).toBeDefined();
    expect(nestedNameParam?.type).toBe(ParameterType.STRING);
    expect(nestedNameParam?.required).toBe(true);
  });

  it('maps deeply nested objects', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          description: 'First level',
          properties: {
            level2: {
              type: 'object',
              description: 'Second level',
              properties: {
                name: { type: 'string', description: 'Deepest name' }
              }
            }
          }
        }
      }
    };

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    const level1Param = paramSchema.getParameter('level1');
    expect(level1Param?.objectSchema).toBeInstanceOf(ParameterSchema);

    const level2Param = (level1Param?.objectSchema as ParameterSchema).getParameter('level2');
    expect(level2Param?.objectSchema).toBeInstanceOf(ParameterSchema);

    const nameParam = (level2Param?.objectSchema as ParameterSchema).getParameter('name');
    expect(nameParam?.type).toBe(ParameterType.STRING);
    expect(nameParam?.description).toBe('Deepest name');
  });

  it('rejects unsupported root schema types', () => {
    const stringRoot = { type: 'string', description: 'Root is string' };
    expect(() => schemaMapper.mapToAutobyteusSchema(stringRoot)).toThrowError(
      /MCP JSON schema root 'type' must be 'object'/
    );

    const customRoot = { type: 'custom_unknown', description: 'Unknown type' };
    expect(() => schemaMapper.mapToAutobyteusSchema(customRoot)).toThrowError(
      /MCP JSON schema root 'type' must be 'object'/
    );
  });

  it('maps real-world nested MCP schemas', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation to update.' },
        requests: {
          type: 'array',
          description: 'A list of update requests.',
          items: { type: 'object' }
        },
        writeControl: {
          type: 'object',
          description: 'Control over write requests.',
          properties: {
            requiredRevisionId: { type: 'string', description: 'Required revision ID.' },
            targetRevisionId: { type: 'string', description: 'Target revision ID.' }
          }
        }
      },
      required: ['presentationId', 'requests']
    };

    const expectedDetails = [
      {
        name: 'presentationId',
        type: ParameterType.STRING,
        description: 'The ID of the presentation to update.',
        required: true
      },
      {
        name: 'requests',
        type: ParameterType.ARRAY,
        description: 'A list of update requests.',
        required: true
      },
      {
        name: 'writeControl',
        type: ParameterType.OBJECT,
        description: 'Control over write requests.',
        required: false,
        nested_schema: [
          {
            name: 'requiredRevisionId',
            type: ParameterType.STRING,
            description: 'Required revision ID.',
            required: false
          },
          {
            name: 'targetRevisionId',
            type: ParameterType.STRING,
            description: 'Target revision ID.',
            required: false
          }
        ]
      }
    ];

    const paramSchema = schemaMapper.mapToAutobyteusSchema(mcpSchema);
    validateSchemaRecursively(paramSchema, expectedDetails, 'batch_update_presentation');
  });
});

type ExpectedParamDetail = {
  name: string;
  type: ParameterType;
  description: string;
  required?: boolean;
  nested_schema?: ExpectedParamDetail[];
};

function validateSchemaRecursively(
  paramSchema: ParameterSchema,
  expectedDetails: ExpectedParamDetail[],
  path: string
): void {
  expect(paramSchema.parameters).toHaveLength(expectedDetails.length);

  for (const expected of expectedDetails) {
    const paramName = expected.name;
    const currentPath = `${path}.${paramName}`;
    const actual = paramSchema.getParameter(paramName);

    expect(actual, `${currentPath}: Expected parameter not found.`).toBeDefined();
    expect(actual?.type, `${currentPath}: Type mismatch.`).toBe(expected.type);
    expect(actual?.description, `${currentPath}: Description mismatch.`).toBe(expected.description);
    expect(actual?.required ?? false, `${currentPath}: Required status mismatch.`).toBe(
      expected.required ?? false
    );

    if (expected.nested_schema) {
      expect(actual?.objectSchema, `${currentPath}: Expected a nested ParameterSchema.`).toBeInstanceOf(
        ParameterSchema
      );
      validateSchemaRecursively(
        actual?.objectSchema as ParameterSchema,
        expected.nested_schema,
        currentPath
      );
    }
  }
}
