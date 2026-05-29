import { z } from "zod";
import {
  ParameterSchema,
  ParameterType,
  type ParameterDefinition,
} from "autobyteus-ts/utils/parameter-schema.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import { TASK_DELEGATION_TOOL_MANIFEST } from "../../../../agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  toTaskDelegationJsonString,
  toTaskDelegationToolErrorPayload,
} from "../../../../agent-tools/task-delegation/task-delegation-tool-serialization.js";
import {
  buildTaskDelegationToolContextFromMemberTeamContext,
  getTaskDelegationToolService,
} from "../../../../agent-tools/task-delegation/task-delegation-tool-service.js";

const createToolResult = (value: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: toTaskDelegationJsonString(value) }],
});

const createToolErrorResult = (error: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(error)) }],
  isError: true,
});

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildClaudeSchemaFromParameterSchema = (
  parameterSchema: ParameterSchema,
): Record<string, z.ZodTypeAny> => {
  const inputSchema: Record<string, z.ZodTypeAny> = {};
  for (const parameter of parameterSchema.parameters) {
    inputSchema[parameter.name] = buildClaudeParameterSchema(parameter);
  }
  return inputSchema;
};

const buildArrayItemSchema = (
  itemSchema: ParameterDefinition["arrayItemSchema"],
): z.ZodTypeAny => {
  if (itemSchema instanceof ParameterSchema) {
    return z.object(buildClaudeSchemaFromParameterSchema(itemSchema));
  }
  if (typeof itemSchema === "string") {
    return buildPrimitiveZodType(itemSchema as ParameterType);
  }
  return z.unknown();
};

const buildPrimitiveZodType = (type: ParameterType): z.ZodTypeAny => {
  switch (type) {
    case ParameterType.INTEGER:
      return z.number().int();
    case ParameterType.FLOAT:
      return z.number();
    case ParameterType.BOOLEAN:
      return z.boolean();
    case ParameterType.OBJECT:
      return z.record(z.string(), z.unknown());
    case ParameterType.ARRAY:
      return z.array(z.unknown());
    case ParameterType.STRING:
    case ParameterType.ENUM:
    default:
      return z.string();
  }
};

const buildClaudeParameterSchema = (
  parameter: ParameterDefinition,
): z.ZodTypeAny => {
  let schema: z.ZodTypeAny;
  switch (parameter.type) {
    case ParameterType.STRING:
      schema = z.string();
      break;
    case ParameterType.INTEGER:
      schema = z.number().int();
      break;
    case ParameterType.FLOAT:
      schema = z.number();
      break;
    case ParameterType.BOOLEAN:
      schema = z.boolean();
      break;
    case ParameterType.ENUM:
      schema = parameter.enumValues?.length
        ? z.enum(parameter.enumValues as [string, ...string[]])
        : z.string();
      break;
    case ParameterType.OBJECT:
      schema = parameter.objectSchema
        ? z.object(buildClaudeSchemaFromParameterSchema(parameter.objectSchema))
        : z.record(z.string(), z.unknown());
      break;
    case ParameterType.ARRAY:
      schema = z.array(buildArrayItemSchema(parameter.arrayItemSchema));
      break;
  }
  if (!parameter.required) {
    schema = schema.optional();
  }
  return schema.describe(parameter.description);
};

export const buildClaudeTaskDelegationToolDefinitions = async (options: {
  sdkClient: ClaudeSdkClient;
  memberTeamContext: MemberTeamContext | null;
  enabledToolNames?: Iterable<string> | null;
}): Promise<Record<string, unknown>[] | null> => {
  if (!options.memberTeamContext) {
    return null;
  }
  const enabledToolNameSet = new Set(
    Array.from(options.enabledToolNames ?? [])
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const manifestEntries = TASK_DELEGATION_TOOL_MANIFEST.filter((entry) =>
    enabledToolNameSet.has(entry.name),
  );
  if (manifestEntries.length === 0) {
    return null;
  }
  const context = buildTaskDelegationToolContextFromMemberTeamContext(options.memberTeamContext);
  const service = getTaskDelegationToolService();
  return Promise.all(
    manifestEntries.map((entry) =>
      options.sdkClient.createToolDefinition({
        name: entry.name,
        description: entry.description,
        inputSchema: buildClaudeSchemaFromParameterSchema(entry.parameterSchema),
        handler: async (rawArguments: unknown) => {
          try {
            return createToolResult(
              await entry.execute(service, context, entry.parseInput(asRawArguments(rawArguments))),
            );
          } catch (error) {
            return createToolErrorResult(error);
          }
        },
      }),
    ),
  );
};
