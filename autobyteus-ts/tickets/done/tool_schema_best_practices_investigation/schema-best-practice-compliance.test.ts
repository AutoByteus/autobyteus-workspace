import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerTools } from '../../src/tools/register-tools.js';
import { defaultToolRegistry } from '../../src/tools/registry/tool-registry.js';
import { ToolSchemaProvider } from '../../src/tools/usage/providers/tool-schema-provider.js';
import { LLMProvider } from '../../src/llm/providers.js';

type JsonObject = Record<string, any>;

type Issue = {
  tool: string;
  path: string;
  message: string;
  level: 'required' | 'best_practice' | 'strict_required';
};

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function schemaTypeIncludes(schema: JsonObject, typeName: string): boolean {
  const type = schema.type;
  return type === typeName || (Array.isArray(type) && type.includes(typeName));
}

function collectObjectSchemaIssues(schema: unknown, tool: string, path: string, issues: Issue[]): void {
  const obj = asObject(schema);
  if (!obj) return;

  if (schemaTypeIncludes(obj, 'object')) {
    if (obj.additionalProperties !== false) {
      issues.push({
        tool,
        path,
        level: 'best_practice',
        message: 'Object schema is not closed with additionalProperties:false.',
      });
    }

    const properties = asObject(obj.properties);
    if (properties) {
      for (const [propertyName, propertySchema] of Object.entries(properties)) {
        collectObjectSchemaIssues(propertySchema, tool, `${path}.properties.${propertyName}`, issues);
      }
    }
  }

  if (obj.items) {
    collectObjectSchemaIssues(obj.items, tool, `${path}.items`, issues);
  }

  for (const combinator of ['anyOf', 'oneOf', 'allOf'] as const) {
    const variants = obj[combinator];
    if (Array.isArray(variants)) {
      variants.forEach((variant, index) => collectObjectSchemaIssues(variant, tool, `${path}.${combinator}[${index}]`, issues));
    }
  }
}

function collectStrictRequiredFieldIssues(schema: unknown, tool: string, path: string, issues: Issue[]): void {
  const obj = asObject(schema);
  if (!obj) return;

  if (schemaTypeIncludes(obj, 'object')) {
    const properties = asObject(obj.properties) ?? {};
    const propertyNames = Object.keys(properties);
    const required = Array.isArray(obj.required) ? obj.required.filter((name: unknown): name is string => typeof name === 'string') : [];
    const missing = propertyNames.filter((name) => !required.includes(name));
    if (missing.length) {
      issues.push({
        tool,
        path,
        level: 'strict_required',
        message: `Strict OpenAI schemas require all object properties to be listed in required; missing: ${missing.join(', ')}. Optional fields need nullable types if strict mode is used.`,
      });
    }

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      collectStrictRequiredFieldIssues(propertySchema, tool, `${path}.properties.${propertyName}`, issues);
    }
  }

  if (obj.items) {
    collectStrictRequiredFieldIssues(obj.items, tool, `${path}.items`, issues);
  }

  for (const combinator of ['anyOf', 'oneOf', 'allOf'] as const) {
    const variants = obj[combinator];
    if (Array.isArray(variants)) {
      variants.forEach((variant, index) => collectStrictRequiredFieldIssues(variant, tool, `${path}.${combinator}[${index}]`, issues));
    }
  }
}

function buildComplianceReport() {
  registerTools();
  const toolNames = defaultToolRegistry.listToolNames().sort();
  const schemas = new ToolSchemaProvider().buildSchema(toolNames, LLMProvider.LMSTUDIO) as JsonObject[];

  const envelopeIssues: Issue[] = [];
  const closedObjectIssues: Issue[] = [];
  const strictEnabledIssues: Issue[] = [];
  const strictRequiredFieldIssues: Issue[] = [];

  const perTool: Record<string, any> = {};

  for (const schema of schemas) {
    const functionDef = asObject(schema.function);
    const toolName = functionDef?.name ?? '<missing-name>';
    const parameters = functionDef?.parameters;

    const toolEnvelopeIssues: Issue[] = [];
    if (schema.type !== 'function') {
      toolEnvelopeIssues.push({ tool: toolName, path: 'type', level: 'required', message: 'Top-level schema type is not function.' });
    }
    if (!functionDef) {
      toolEnvelopeIssues.push({ tool: toolName, path: 'function', level: 'required', message: 'Missing function definition object.' });
    }
    if (!functionDef?.name || typeof functionDef.name !== 'string') {
      toolEnvelopeIssues.push({ tool: toolName, path: 'function.name', level: 'required', message: 'Missing function name.' });
    }
    if (!functionDef?.description || typeof functionDef.description !== 'string') {
      toolEnvelopeIssues.push({ tool: toolName, path: 'function.description', level: 'required', message: 'Missing function description.' });
    }
    if (!schemaTypeIncludes(asObject(parameters) ?? {}, 'object')) {
      toolEnvelopeIssues.push({ tool: toolName, path: 'function.parameters', level: 'required', message: 'Function parameters is not an object schema.' });
    }
    envelopeIssues.push(...toolEnvelopeIssues);

    const toolClosedIssues: Issue[] = [];
    collectObjectSchemaIssues(parameters, toolName, 'function.parameters', toolClosedIssues);
    closedObjectIssues.push(...toolClosedIssues);

    const toolStrictRequiredIssues: Issue[] = [];
    collectStrictRequiredFieldIssues(parameters, toolName, 'function.parameters', toolStrictRequiredIssues);
    strictRequiredFieldIssues.push(...toolStrictRequiredIssues);

    if (functionDef?.strict !== true) {
      strictEnabledIssues.push({
        tool: toolName,
        path: 'function.strict',
        level: 'best_practice',
        message: 'OpenAI Structured Outputs strict mode is not enabled for this function tool.',
      });
    }

    perTool[toolName] = {
      openaiCompatibleEnvelope: toolEnvelopeIssues.length === 0,
      closedObjectSchemas: toolClosedIssues.length === 0,
      strictModeEnabled: functionDef?.strict === true,
      strictRequiredFieldReady: toolStrictRequiredIssues.length === 0,
      firstClosedObjectIssues: toolClosedIssues.slice(0, 3),
      firstStrictRequiredFieldIssues: toolStrictRequiredIssues.slice(0, 3),
      generatedSchema: toolName === 'run_bash' ? schema : undefined,
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    reportPurpose: 'current_state_regression_after_tool_schema_best_practices_fix',
    provider: LLMProvider.LMSTUDIO,
    toolCount: toolNames.length,
    criteria: {
      openaiCompatibleEnvelope: {
        level: 'required',
        passed: envelopeIssues.length === 0,
        issueCount: envelopeIssues.length,
        sampleIssues: envelopeIssues.slice(0, 10),
      },
      closedObjectSchemas: {
        level: 'best_practice_and_strict_required',
        passed: closedObjectIssues.length === 0,
        issueCount: closedObjectIssues.length,
        sampleIssues: closedObjectIssues.slice(0, 12),
      },
      strictModeEnabled: {
        level: 'best_practice',
        passed: strictEnabledIssues.length === 0,
        issueCount: strictEnabledIssues.length,
        sampleIssues: strictEnabledIssues.slice(0, 12),
      },
      strictRequiredFieldReady: {
        level: 'strict_required_if_strict_enabled',
        passed: strictRequiredFieldIssues.length === 0,
        issueCount: strictRequiredFieldIssues.length,
        sampleIssues: strictRequiredFieldIssues.slice(0, 12),
      },
    },
    runBash: perTool.run_bash,
    perToolSummary: Object.fromEntries(
      Object.entries(perTool).map(([name, value]) => [name, {
        openaiCompatibleEnvelope: value.openaiCompatibleEnvelope,
        closedObjectSchemas: value.closedObjectSchemas,
        strictModeEnabled: value.strictModeEnabled,
        strictRequiredFieldReady: value.strictRequiredFieldReady,
      }])
    ),
  };

  const reportPath = join(dirname(fileURLToPath(import.meta.url)), 'schema-best-practice-compliance-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return report;
}

const report = buildComplianceReport();
console.log('SCHEMA_BEST_PRACTICE_COMPLIANCE_REPORT=' + JSON.stringify(report.criteria, null, 2));
console.log('RUN_BASH_GENERATED_SCHEMA=' + JSON.stringify(report.runBash.generatedSchema, null, 2));

describe('generated tool schema best-practice compliance regression', () => {
  it('passes the minimum OpenAI-compatible function-tool envelope for generated default LM Studio schemas', () => {
    expect(report.criteria.openaiCompatibleEnvelope.passed).toBe(true);
  });

  it('passes closed-object best-practice criteria for generated default LM Studio schemas', () => {
    expect(report.criteria.closedObjectSchemas.passed).toBe(true);
    expect(report.criteria.closedObjectSchemas.issueCount).toBe(0);
    expect(report.runBash.closedObjectSchemas).toBe(true);
    expect(report.runBash.generatedSchema.function.parameters.additionalProperties).toBe(false);
  });

  it('documents that strict mode remains gated and current optional fields are not strict-ready', () => {
    expect(report.criteria.strictModeEnabled.passed).toBe(false);
    expect(report.criteria.strictRequiredFieldReady.passed).toBe(false);
    expect(report.runBash.strictModeEnabled).toBe(false);
    expect(report.runBash.strictRequiredFieldReady).toBe(false);
  });
});
