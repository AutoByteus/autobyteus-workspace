import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
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

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const withNoAdditionalProperties = (schema: unknown): unknown => {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }
  const result: Record<string, unknown> = { ...(schema as Record<string, unknown>) };
  if (result.type === "object") {
    result.additionalProperties = false;
  }
  if (result.properties && typeof result.properties === "object" && !Array.isArray(result.properties)) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties as Record<string, unknown>)
        .map(([key, value]) => [key, withNoAdditionalProperties(value)]),
    );
  }
  if (result.items) {
    result.items = withNoAdditionalProperties(result.items);
  }
  return result;
};

const buildCodexInputSchema = (parameterSchema: ParameterSchema): JsonObject =>
  withNoAdditionalProperties(parameterSchema.toJsonSchema()) as JsonObject;

const runTaskDelegationOperation = async (
  operation: () => Promise<unknown>,
): Promise<CodexDynamicToolCallResult> => {
  try {
    return createCodexDynamicToolTextResult(
      toTaskDelegationJsonString(await operation()),
      true,
    );
  } catch (error) {
    return createCodexDynamicToolTextResult(
      toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(error)),
      false,
    );
  }
};

export const buildTaskDelegationDynamicToolRegistrations = (input: {
  memberTeamContext: MemberTeamContext | null;
  enabledToolNames?: Iterable<string> | null;
}): CodexDynamicToolRegistration[] | null => {
  if (!input.memberTeamContext) {
    return null;
  }
  const enabledToolNameSet = new Set(
    Array.from(input.enabledToolNames ?? [])
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
  const context = buildTaskDelegationToolContextFromMemberTeamContext(input.memberTeamContext);
  const service = getTaskDelegationToolService();
  return manifestEntries.map((entry) => ({
    spec: {
      name: entry.name,
      description: entry.description,
      inputSchema: buildCodexInputSchema(entry.parameterSchema),
    },
    handler: async ({ arguments: toolArguments }) =>
      runTaskDelegationOperation(async () =>
        entry.execute(service, context, entry.parseInput(asRawArguments(toolArguments))),
      ),
  }));
};
