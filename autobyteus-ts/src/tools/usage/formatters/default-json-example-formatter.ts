import { UsageFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../utils/parameter-schema.js';

export class DefaultJsonExampleFormatter implements UsageFormatter {
  provide(tool: ToolDefinition): string {
    const basicExample = this.createExampleStructure(tool, 'basic');
    let output = '### Example 1: Basic Call (Required Arguments)\n';
    output += '```json\n';
    output += JSON.stringify(basicExample, null, 2);
    output += '\n```';

    if (!this.schemaHasAdvancedParams(tool.argumentSchema)) {
      return output;
    }

    const advancedExample = this.createExampleStructure(tool, 'advanced');
    output += '\n\n### Example 2: Advanced Call (With Optional Arguments)\n';
    output += '```json\n';
    output += JSON.stringify(advancedExample, null, 2);
    output += '\n```';

    return output;
  }

  private createExampleStructure(tool: ToolDefinition, mode: 'basic' | 'advanced'): Record<string, unknown> {
    const argumentsPayload: Record<string, unknown> = {};
    const schema = tool.argumentSchema;

    if (schema && schema.parameters.length > 0) {
      const paramsToRender = mode === 'basic'
        ? schema.parameters.filter((param) => param.required)
        : schema.parameters;

      for (const param of paramsToRender) {
        argumentsPayload[param.name] = this.generatePlaceholderValue(param, mode);
      }
    }

    return {
      tool: {
        function: tool.name,
        parameters: argumentsPayload
      }
    };
  }

  private schemaHasAdvancedParams(schema: ParameterSchema | null): boolean {
    if (!schema) {
      return false;
    }
    for (const param of schema.parameters) {
      if (!param.required) {
        return true;
      }
      if (param.objectSchema && this.schemaHasAdvancedParams(param.objectSchema)) {
        return true;
      }
      if (param.arrayItemSchema instanceof ParameterSchema && this.schemaHasAdvancedParams(param.arrayItemSchema)) {
        return true;
      }
    }
    return false;
  }

  private generatePlaceholderValue(param: ParameterDefinition, mode: 'basic' | 'advanced'): unknown {
    if (param.type === ParameterType.OBJECT && param.objectSchema) {
      return DefaultJsonExampleFormatter.generateExampleFromSchema(param.objectSchema, param.objectSchema, mode);
    }

    if (param.type === ParameterType.ARRAY && param.arrayItemSchema) {
      const exampleItem = DefaultJsonExampleFormatter.generateExampleFromSchema(param.arrayItemSchema, param.arrayItemSchema, mode);
      return [exampleItem];
    }

    if (param.defaultValue !== undefined && param.defaultValue !== null) {
      return param.defaultValue;
    }

    if (param.type === ParameterType.STRING) return `example_${param.name}`;
    if (param.type === ParameterType.INTEGER) return 123;
    if (param.type === ParameterType.FLOAT) return 123.45;
    if (param.type === ParameterType.BOOLEAN) return true;
    if (param.type === ParameterType.ENUM) return param.enumValues?.[0] ?? 'enum_val';
    if (param.type === ParameterType.OBJECT) return { key: 'value' };
    if (param.type === ParameterType.ARRAY) return ['item1', 'item2'];
    return 'placeholder';
  }

  static generateExampleFromSchema(
    subSchema: Record<string, unknown> | ParameterSchema | ParameterType,
    fullSchema: Record<string, unknown> | ParameterSchema | ParameterType,
    mode: 'basic' | 'advanced' = 'basic'
  ): unknown {
    if (typeof subSchema === 'string') {
      if (subSchema === ParameterType.STRING) return 'example_string';
      if (subSchema === ParameterType.INTEGER) return 1;
      if (subSchema === ParameterType.FLOAT) return 1.1;
      if (subSchema === ParameterType.BOOLEAN) return true;
      return 'unknown_primitive';
    }

    const normalizedSubSchema = subSchema instanceof ParameterSchema ? subSchema.toJsonSchema() : subSchema;
    const normalizedFullSchema = fullSchema instanceof ParameterSchema ? fullSchema.toJsonSchema() : fullSchema;

    if (normalizedSubSchema && typeof normalizedSubSchema === 'object' && '$ref' in normalizedSubSchema) {
      const refPath = String((normalizedSubSchema as any).$ref);
      const parts = refPath.replace(/^#\//, '').split('/');
      let resolved: unknown = normalizedFullSchema;
      for (const part of parts) {
        if (!resolved || typeof resolved !== 'object') {
          return { error: `Could not resolve schema reference: ${refPath}` };
        }
        resolved = (resolved as Record<string, unknown>)[part];
      }
      if (typeof resolved === 'string' || (resolved && typeof resolved === 'object')) {
        return DefaultJsonExampleFormatter.generateExampleFromSchema(
          resolved as Record<string, unknown> | ParameterSchema | ParameterType,
          normalizedFullSchema,
          mode
        );
      }
      return { error: `Could not resolve schema reference: ${refPath}` };
    }

    if (!normalizedSubSchema || typeof normalizedSubSchema !== 'object') {
      return 'unknown_type';
    }

    const schemaType = (normalizedSubSchema as any).type;

    if ('default' in normalizedSubSchema) {
      return (normalizedSubSchema as any).default;
    }

    if ((normalizedSubSchema as any).enum?.length) {
      return (normalizedSubSchema as any).enum[0];
    }

    if (schemaType === 'object') {
      const exampleObj: Record<string, unknown> = {};
      const properties = (normalizedSubSchema as any).properties || {};
      const requiredFields: string[] = (normalizedSubSchema as any).required || [];
      for (const [propName, propSchema] of Object.entries(properties)) {
        if (mode === 'advanced' || requiredFields.includes(propName)) {
          exampleObj[propName] = DefaultJsonExampleFormatter.generateExampleFromSchema(
            propSchema as Record<string, unknown>,
            normalizedFullSchema,
            mode
          );
        }
      }
      return exampleObj;
    }

    if (schemaType === 'array') {
      const itemsSchema = (normalizedSubSchema as any).items;
      if (itemsSchema && typeof itemsSchema === 'object') {
        return [DefaultJsonExampleFormatter.generateExampleFromSchema(itemsSchema, normalizedFullSchema, mode)];
      }
      return ['example_item_1'];
    }

    if (schemaType === 'string') {
      const description = String((normalizedSubSchema as any).description || '');
      const match = description.toLowerCase().includes('e.g.') ? description.split('e.g.')[1] : '';
      if (match) {
        return match.trim().replace(/^['"`]/, '').replace(/['"`]$/, '');
      }
      return 'example_string';
    }

    if (schemaType === 'integer') return 1;
    if (schemaType === 'number') return 1.1;
    if (schemaType === 'boolean') return true;
    if (schemaType === 'null') return null;

    return 'unknown_type';
  }
}
