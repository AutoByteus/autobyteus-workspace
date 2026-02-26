import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema } from '../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';

vi.mock('../../../../src/tools/usage/formatters/default-json-schema-formatter.js', () => {
  return {
    DefaultJsonSchemaFormatter: class {
      provide = vi.fn().mockReturnValue({ mocked: 'json' });
    }
  };
});

vi.mock('../../../../src/tools/usage/formatters/default-xml-schema-formatter.js', () => {
  return {
    DefaultXmlSchemaFormatter: class {
      provide = vi.fn().mockReturnValue('<tool name="MyTestTool">...</tool>');
    }
  };
});

vi.mock('../../../../src/tools/usage/formatters/default-xml-example-formatter.js', () => {
  return {
    DefaultXmlExampleFormatter: class {
      provide = vi.fn().mockReturnValue('<tool name="MyTestTool">...</tool>');
    }
  };
});

vi.mock('../../../../src/tools/usage/formatters/default-json-example-formatter.js', () => {
  return {
    DefaultJsonExampleFormatter: class {
      provide = vi.fn().mockReturnValue({ tool: { function: 'MyTestTool' } });
    }
  };
});

class MockTool extends BaseTool {
  _execute() { return Promise.resolve(); }
  static getDescription() { return "desc"; }
  static getArgumentSchema() { return null; }
}

describe('ToolDefinition', () => {
    let mockSchemaProvider: any;
    let sampleToolDef: ToolDefinition;

    beforeEach(() => {
        const schema = new ParameterSchema();
        mockSchemaProvider = vi.fn().mockReturnValue(schema);
        
        sampleToolDef = new ToolDefinition(
            "MyTestTool",
            "A tool for testing.",
            ToolOrigin.LOCAL,
            "general",
            mockSchemaProvider,
            () => null,
            { toolClass: MockTool }
        );
    });

    it('test_schema_provider_is_called_once_and_cached', () => {
        // First access
        const schema1 = sampleToolDef.argumentSchema;
        expect(mockSchemaProvider).toHaveBeenCalledTimes(1);
        expect(schema1).toBeDefined();

        // Second access
        const schema2 = sampleToolDef.argumentSchema;
        // Call count should remain 1
        expect(mockSchemaProvider).toHaveBeenCalledTimes(1);
        expect(schema2).toBe(schema1);
    });

    it('test_reload_cached_schema_eagerly_regenerates', () => {
        void sampleToolDef.argumentSchema;
        expect(mockSchemaProvider).toHaveBeenCalledTimes(1);

        sampleToolDef.reloadCachedSchema();
        expect(mockSchemaProvider).toHaveBeenCalledTimes(2);

        void sampleToolDef.argumentSchema;
        expect(mockSchemaProvider).toHaveBeenCalledTimes(2);
    });

    it('test_reload_cached_schema_refreshes_description', () => {
        const schemaProvider = vi.fn().mockReturnValue(new ParameterSchema());
        const descriptionProvider = vi.fn().mockReturnValue('New description');

        const toolDef = new ToolDefinition(
            'DescReloadTool',
            'Old description',
            ToolOrigin.LOCAL,
            'general',
            schemaProvider,
            () => null,
            { toolClass: MockTool, descriptionProvider }
        );

        expect(toolDef.description).toBe('Old description');
        toolDef.reloadCachedSchema();
        expect(toolDef.description).toBe('New description');
        expect(descriptionProvider).toHaveBeenCalledTimes(1);
    });

    it('test_get_usage_xml', () => {
        const xml = sampleToolDef.getUsageXml();
        expect(xml).toBe('<tool name="MyTestTool">...</tool>');
    });

    it('test_get_usage_json', () => {
        const json = sampleToolDef.getUsageJson();
        expect(json).toEqual({ mocked: 'json' });
    });

    it('test_get_usage_xml_example', () => {
        const xml = sampleToolDef.getUsageXmlExample();
        expect(xml).toBe('<tool name="MyTestTool">...</tool>');
    });

    it('test_get_usage_json_example', () => {
        const json = sampleToolDef.getUsageJsonExample();
        expect(json).toEqual({ tool: { function: 'MyTestTool' } });
    });
});
