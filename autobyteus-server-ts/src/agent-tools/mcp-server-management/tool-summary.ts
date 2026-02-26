import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

export function serializeToolSummary(toolDef: ToolDefinition): Record<string, unknown> {
  const argumentSchema = toolDef.argumentSchema?.toJsonSchemaDict?.() ?? {};

  return {
    name: toolDef.name,
    category: toolDef.category,
    description: toolDef.description,
    argument_schema: argumentSchema,
  };
}
