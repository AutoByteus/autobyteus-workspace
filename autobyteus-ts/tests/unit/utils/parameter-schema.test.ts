import { describe, it, expect, beforeEach } from 'vitest';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';

describe('ParameterSchema', () => {
    let nestedObjectSchema: ParameterSchema;

    beforeEach(() => {
        nestedObjectSchema = new ParameterSchema();
        nestedObjectSchema.addParameter(new ParameterDefinition({
            name: "name",
            type: ParameterType.STRING,
            description: "The name of the person.",
            required: true
        }));
        nestedObjectSchema.addParameter(new ParameterDefinition({
            name: "age",
            type: ParameterType.INTEGER,
            description: "The age of the person.",
            required: false
        }));
    });

    it('test_define_nested_object', () => {
        const mainSchema = new ParameterSchema();
        mainSchema.addParameter(new ParameterDefinition({
            name: "user_profile",
            type: ParameterType.OBJECT,
            description: "The user's profile information.",
            objectSchema: nestedObjectSchema
        }));

        const param = mainSchema.getParameter("user_profile");
        expect(param).toBeDefined();
        expect(param?.type).toBe(ParameterType.OBJECT);
        expect(param?.objectSchema).toBeInstanceOf(ParameterSchema);
        expect(param?.objectSchema?.parameters.length).toBe(2);
        expect(param?.objectSchema?.getParameter("name")?.required).toBe(true);
    });

    it('test_to_json_schema_for_nested_object', () => {
        const mainSchema = new ParameterSchema();
        mainSchema.addParameter(new ParameterDefinition({
            name: "user_profile",
            type: ParameterType.OBJECT,
            description: "The user's profile.",
            required: true,
            objectSchema: nestedObjectSchema
        }));

        const jsonSchema = mainSchema.toJsonSchema();
        
        const expected = {
            type: "object",
            properties: {
                user_profile: {
                    type: "object",
                    description: "The user's profile.",
                    properties: {
                        name: { type: "string", description: "The name of the person." },
                        age: { type: "integer", description: "The age of the person." }
                    },
                    required: ["name"]
                }
            },
            required: ["user_profile"]
        };
        
        // Vitest deep equality checks structure
        expect(jsonSchema).toEqual(expected);
    });

    it('test_to_json_schema_for_array_of_objects_dict_schema', () => {
        const mainSchema = new ParameterSchema();
        mainSchema.addParameter(new ParameterDefinition({
            name: "users",
            type: ParameterType.ARRAY,
            description: "A list of user profiles.",
            arrayItemSchema: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the person." },
                    age: { type: "integer", description: "The age of the person." }
                },
                required: ["name"]
            }
        }));

        const jsonSchema = mainSchema.toJsonSchema();
        const expected = {
            type: "object",
            properties: {
                users: {
                    type: "array",
                    description: "A list of user profiles.",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "The name of the person." },
                            age: { type: "integer", description: "The age of the person." }
                        },
                        required: ["name"]
                    }
                }
            },
            required: []
        };

        expect(jsonSchema).toEqual(expected);
    });

    it('test_to_json_schema_for_array_of_objects_schema_instance', () => {
        const mainSchema = new ParameterSchema();
        mainSchema.addParameter(new ParameterDefinition({
            name: "users",
            type: ParameterType.ARRAY,
            description: "A list of user profiles.",
            arrayItemSchema: nestedObjectSchema
        }));

        const jsonSchema = mainSchema.toJsonSchema();
        const expected = {
            type: "object",
            properties: {
                users: {
                    type: "array",
                    description: "A list of user profiles.",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "The name of the person." },
                            age: { type: "integer", description: "The age of the person." }
                        },
                        required: ["name"]
                    }
                }
            },
            required: []
        };

        expect(jsonSchema).toEqual(expected);
    });

    it('test_serialization_deserialization_nested', () => {
        const originalSchema = new ParameterSchema();
        originalSchema.addParameter(new ParameterDefinition({
            name: "user_profile",
            type: ParameterType.OBJECT,
            description: "A user profile.",
            objectSchema: nestedObjectSchema
        }));

        const config = originalSchema.toConfig();
        const deserializedSchema = ParameterSchema.fromConfig(config);

        expect(deserializedSchema.parameters.length).toBe(1);
        const param = deserializedSchema.getParameter("user_profile");
        expect(param).toBeDefined();
        expect(param?.type).toBe(ParameterType.OBJECT);
        
        const objSchema = param?.objectSchema;
        expect(objSchema).toBeInstanceOf(ParameterSchema);
        expect(objSchema?.parameters.length).toBe(2);
        expect(objSchema?.getParameter("name")?.description).toBe("The name of the person.");
    });

    it('test_serialization_deserialization_array_of_objects', () => {
        const originalSchema = new ParameterSchema();
        originalSchema.addParameter(new ParameterDefinition({
            name: "users",
            type: ParameterType.ARRAY,
            description: "A list of user profiles.",
            arrayItemSchema: nestedObjectSchema
        }));

        const config = originalSchema.toConfig();
        const deserializedSchema = ParameterSchema.fromConfig(config);

        const param = deserializedSchema.getParameter("users");
        expect(param).toBeDefined();
        expect(param?.type).toBe(ParameterType.ARRAY);

        const itemSchema = param?.arrayItemSchema as ParameterSchema | undefined;
        expect(itemSchema).toBeInstanceOf(ParameterSchema);
        expect(itemSchema?.parameters.length).toBe(2);
        expect(itemSchema?.getParameter("name")?.description).toBe("The name of the person.");
    });

    it('test_validation_rejects_wrong_type', () => {
        expect(() => new ParameterDefinition({
            name: "profile",
            type: ParameterType.OBJECT,
            description: "A profile.",
            objectSchema: { key: "value" } as unknown as ParameterSchema
        })).toThrow(/objectSchema must be a ParameterSchema instance or schema config/);
    });
});
