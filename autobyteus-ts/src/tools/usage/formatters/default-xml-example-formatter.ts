import { UsageFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../utils/parameter-schema.js';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export class DefaultXmlExampleFormatter implements UsageFormatter {
  provide(tool: ToolDefinition): string {
    const examples: string[] = [this.generateBasicExample(tool)];
    const advancedExample = this.generateAdvancedExample(tool);
    if (advancedExample) {
      examples.push(advancedExample);
    }
    return examples.join('\n\n');
  }

  private generateBasicExample(tool: ToolDefinition): string {
    const schema = tool.argumentSchema;
    const lines: string[] = [
      '### Example 1: Basic Call (Required Arguments)',
      `<tool name="${tool.name}">`
    ];

    if (schema && schema.parameters.some((param) => param.required)) {
      lines.push('    <arguments>');
      lines.push(...this.generateArgumentsXml(schema.parameters, 2, 'basic'));
      lines.push('    </arguments>');
    } else {
      lines.push('    <!-- This tool has no required arguments. -->');
    }

    lines.push('</tool>');
    return lines.join('\n');
  }

  private generateAdvancedExample(tool: ToolDefinition): string | null {
    const schema = tool.argumentSchema;
    if (!this.schemaHasAdvancedParams(schema)) {
      return null;
    }

    const lines: string[] = [
      '### Example 2: Advanced Call (With Optional & Nested Arguments)',
      `<tool name="${tool.name}">`
    ];

    if (schema && schema.parameters.length > 0) {
      lines.push('    <arguments>');
      lines.push(...this.generateArgumentsXml(schema.parameters, 2, 'advanced'));
      lines.push('    </arguments>');
    } else {
      return null;
    }

    lines.push('</tool>');
    return lines.join('\n');
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

  private generateArgumentsXml(
    params: ParameterDefinition[],
    indentLevel: number,
    mode: 'basic' | 'advanced'
  ): string[] {
    const lines: string[] = [];
    const indent = '    '.repeat(indentLevel);
    const paramsToRender = mode === 'basic'
      ? params.filter((param) => param.required)
      : params;

    for (const param of paramsToRender) {
      if (param.type === ParameterType.OBJECT && param.objectSchema) {
        lines.push(`${indent}<arg name="${param.name}">`);
        lines.push(...this.generateArgumentsXml(param.objectSchema.parameters, indentLevel + 1, mode));
        lines.push(`${indent}</arg>`);
        continue;
      }

      if (param.type === ParameterType.ARRAY) {
        lines.push(`${indent}<arg name="${param.name}">`);
        if (param.arrayItemSchema instanceof ParameterSchema) {
          lines.push(`${indent}    <item>`);
          lines.push(...this.generateArgumentsXml(param.arrayItemSchema.parameters, indentLevel + 2, mode));
          lines.push(`${indent}    </item>`);
          lines.push(`${indent}    <!-- (more items as needed) -->`);
        } else {
          const placeholder1 = this.generatePlaceholderValue(
            new ParameterDefinition({
              name: `${param.name}_item_1`,
              type: ParameterType.STRING,
              description: 'An item from the list.',
              required: true
            })
          );
          const placeholder2 = this.generatePlaceholderValue(
            new ParameterDefinition({
              name: `${param.name}_item_2`,
              type: ParameterType.STRING,
              description: 'An item from the list.',
              required: true
            })
          );
          lines.push(`${indent}    <item>${escapeXml(String(placeholder1))}</item>`);
          lines.push(`${indent}    <item>${escapeXml(String(placeholder2))}</item>`);
        }
        lines.push(`${indent}</arg>`);
        continue;
      }

      const placeholderValue = this.generatePlaceholderValue(param);
      lines.push(`${indent}<arg name="${param.name}">${escapeXml(String(placeholderValue))}</arg>`);
    }

    return lines;
  }

  private generatePlaceholderValue(param: ParameterDefinition): unknown {
    if (param.defaultValue !== undefined && param.defaultValue !== null) {
      return param.defaultValue;
    }
    if (param.description) {
      const match = param.description.match(/e\.g\.,?\s*[`']([^`']+)[`']/);
      if (match) {
        return match[1];
      }
    }
    if (param.type === ParameterType.STRING) return `A valid string for '${param.name}'`;
    if (param.type === ParameterType.INTEGER) return 123;
    if (param.type === ParameterType.FLOAT) return 123.45;
    if (param.type === ParameterType.BOOLEAN) return true;
    if (param.type === ParameterType.ENUM) return param.enumValues?.[0] ?? 'enum_val';
    return 'placeholder';
  }
}
