import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../utils/parameter-schema.js';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export class DefaultXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(tool: ToolDefinition): string {
    const description = tool.description ? escapeXml(tool.description) : '';
    const xmlParts: string[] = [
      `<tool name="${tool.name}" description="${description}">`
    ];

    const schema = tool.argumentSchema;
    if (schema && schema.parameters.length > 0) {
      xmlParts.push('    <arguments>');
      xmlParts.push(...this.formatParamsRecursively(schema.parameters, 2));
      xmlParts.push('    </arguments>');
    } else {
      xmlParts.push('    <!-- This tool takes no arguments -->');
    }

    xmlParts.push('</tool>');
    return xmlParts.join('\n');
  }

  private formatParamsRecursively(params: ParameterDefinition[], indentLevel: number): string[] {
    const lines: string[] = [];
    const indent = '    '.repeat(indentLevel);

    for (const param of params) {
      const attrs: string[] = [
        `name="${param.name}"`,
        `type="${param.type}"`
      ];

      if (param.description) {
        attrs.push(`description="${escapeXml(param.description)}"`);
      }
      attrs.push(`required="${param.required ? 'true' : 'false'}"`);

      if (param.defaultValue !== undefined && param.defaultValue !== null) {
        const rawValue = param.defaultValue;
        const defaultValue = typeof rawValue === 'boolean' ? (rawValue ? 'True' : 'False') : String(rawValue);
        attrs.push(`default="${escapeXml(defaultValue)}"`);
      }

      if (param.type === ParameterType.ENUM && param.enumValues?.length) {
        attrs.push(`enum_values="${escapeXml(param.enumValues.join(','))}"`);
      }

      const isObject = param.type === ParameterType.OBJECT && param.objectSchema;
      const isArray = param.type === ParameterType.ARRAY && param.arrayItemSchema;

      if (isObject) {
        lines.push(`${indent}<arg ${attrs.join(' ')}>`);
        lines.push(...this.formatParamsRecursively(param.objectSchema!.parameters, indentLevel + 1));
        lines.push(`${indent}</arg>`);
        continue;
      }

      if (isArray) {
        lines.push(`${indent}<arg ${attrs.join(' ')}>`);
        const itemSchema = param.arrayItemSchema;
        if (itemSchema instanceof ParameterSchema) {
          lines.push(`${indent}    <items type="object">`);
          lines.push(...this.formatParamsRecursively(itemSchema.parameters, indentLevel + 2));
          lines.push(`${indent}    </items>`);
        } else if (Object.values(ParameterType).includes(itemSchema as ParameterType)) {
          const itemType = itemSchema === ParameterType.FLOAT ? 'number' : itemSchema;
          lines.push(`${indent}    <items type="${itemType}" />`);
        } else if (itemSchema && typeof itemSchema === 'object') {
          const itemType = (itemSchema as any).type || 'string';
          lines.push(`${indent}    <items type="${itemType}">`);
          if (itemType === 'object' && (itemSchema as any).properties) {
            const nested = this.jsonSchemaPropsToParamDefs(itemSchema as Record<string, unknown>);
            lines.push(...this.formatParamsRecursively(nested, indentLevel + 2));
          }
          lines.push(`${indent}    </items>`);
        }
        lines.push(`${indent}</arg>`);
        continue;
      }

      lines.push(`${indent}<arg ${attrs.join(' ')} />`);
    }

    return lines;
  }

  private jsonSchemaPropsToParamDefs(schemaDict: Record<string, unknown>): ParameterDefinition[] {
    const paramDefs: ParameterDefinition[] = [];
    const properties = (schemaDict as { properties?: Record<string, unknown> }).properties || {};
    const requiredRaw = (schemaDict as { required?: unknown }).required;
    const requiredFields: string[] = Array.isArray(requiredRaw) ? (requiredRaw as string[]) : [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      if (!propSchema || typeof propSchema !== 'object') {
        continue;
      }
      const typeString = String((propSchema as any).type || 'string').toUpperCase();
      const paramType = (ParameterType as any)[typeString] ?? ParameterType.STRING;
      const enumValues = (propSchema as any).enum;

      let objectSchema: ParameterSchema | undefined;
      if (paramType === ParameterType.OBJECT && (propSchema as any).properties) {
        const nested = this.jsonSchemaPropsToParamDefs(propSchema as Record<string, unknown>);
        objectSchema = new ParameterSchema(nested);
      }

      let arrayItemSchema: ParameterType | ParameterSchema | Record<string, unknown> | undefined;
      if (paramType === ParameterType.ARRAY && (propSchema as any).items) {
        const items = (propSchema as any).items;
        if (items instanceof ParameterSchema) {
          arrayItemSchema = items;
        } else if (typeof items === 'string' && Object.values(ParameterType).includes(items as ParameterType)) {
          arrayItemSchema = items as ParameterType;
        } else if (items && typeof items === 'object' && !Array.isArray(items)) {
          arrayItemSchema = items as Record<string, unknown>;
        }
      }

      paramDefs.push(
        new ParameterDefinition({
          name: propName,
          type: paramType,
          description: String((propSchema as any).description || ''),
          required: requiredFields.includes(propName),
          enumValues,
          objectSchema,
          arrayItemSchema
        })
      );
    }

    return paramDefs;
  }
}
