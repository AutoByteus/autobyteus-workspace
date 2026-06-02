import { describe, expect, it, vi } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildClaudeTaskDelegationToolDefinitions } from "../../../../src/agent-execution/backends/claude/task-delegation/build-claude-task-delegation-tool-definitions.js";
import { buildTaskDelegationDynamicToolRegistrations } from "../../../../src/agent-execution/backends/codex/task-delegation/build-task-delegation-dynamic-tool-registrations.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
  MARK_TASK_COMPLETED_TOOL_NAME,
  MARK_TASK_FAILED_TOOL_NAME,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildAcceptTaskParameterSchema,
  buildDelegateTasksParameterSchema,
  buildMarkTaskCompletedParameterSchema,
  buildMarkTaskFailedParameterSchema,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const expectReadyToRunGuidance = (value: string): void => {
  expect(value).toEqual(expect.stringMatching(/ready-to-run/i));
  expect(value).toEqual(expect.stringMatching(/do not encode dependencies/i));
  expect(value).toEqual(expect.stringMatching(/dependent follow-up work/i));
  expect(value).toEqual(expect.stringMatching(/terminal\/completion notification/i));
};

const expectDelegatorContextGuidance = (value: string): void => {
  expect(value).toEqual(expect.stringMatching(/framework derives .* delegator/i));
  expect(value).toEqual(expect.stringMatching(/do not pass (a )?delegator/i));
};

const getDescription = (schema: unknown): string => {
  const candidate = schema as { description?: unknown; _def?: { description?: unknown } };
  return String(candidate.description ?? candidate._def?.description ?? "");
};

const createMemberTeamContext = (): MemberTeamContext => new MemberTeamContext({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
  memberName: "Coordinator",
  memberPath: ["coordinator"],
  memberRouteKey: "coordinator",
  memberRunId: "run-coordinator",
  members: [
    {
      memberKind: "agent",
      memberName: "Coordinator",
      memberPath: ["coordinator"],
      memberRouteKey: "coordinator",
      memberRunId: "run-coordinator",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      role: "coordinates",
      description: "Coordinates delegated work.",
    },
    {
      memberKind: "agent",
      memberName: "Worker",
      memberPath: ["worker"],
      memberRouteKey: "worker",
      memberRunId: "run-worker",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      role: "worker",
      description: "Executes delegated work.",
    },
  ],
});

describe("task delegation runtime descriptions", () => {
  it("exposes ready-to-run and dependent-follow-up guidance in the canonical manifest and schema", () => {
    const entry = getTaskDelegationToolManifestEntry(DELEGATE_TASKS_TOOL_NAME);
    expectReadyToRunGuidance(entry.description);
    expectDelegatorContextGuidance(entry.description);

    const schema = buildDelegateTasksParameterSchema();
    expect(schema.parameters.map((parameter) => parameter.name)).toEqual(["tasks"]);
    const tasksParameter = schema.getParameter("tasks");
    expect(tasksParameter).toBeDefined();
    expectReadyToRunGuidance(tasksParameter!.description);
    expectDelegatorContextGuidance(tasksParameter!.description);

    const taskItemSchema = tasksParameter!.arrayItemSchema;
    expect(taskItemSchema).toBeInstanceOf(ParameterSchema);
    const taskItemParameters = (taskItemSchema as ParameterSchema).parameters;
    expect(taskItemParameters.map((parameter) => parameter.name)).toEqual([
      "member_name",
      "description",
      "reference_files",
    ]);
    expect(taskItemParameters.filter((parameter) => parameter.required).map((parameter) => parameter.name)).toEqual([
      "member_name",
      "description",
    ]);
    expectReadyToRunGuidance((taskItemSchema as ParameterSchema).getParameter("description")!.description);
  });

  it("projects the guidance and strict task shape into Codex dynamic tool registration", () => {
    const registrations = buildTaskDelegationDynamicToolRegistrations({
      memberTeamContext: createMemberTeamContext(),
      enabledToolNames: [DELEGATE_TASKS_TOOL_NAME],
    });

    expect(registrations).toHaveLength(1);
    const spec = registrations![0]!.spec as {
      description: string;
      inputSchema: {
        properties: Record<string, { description?: string; items?: { properties?: Record<string, unknown>; additionalProperties?: boolean } }>;
      };
    };
    expectReadyToRunGuidance(spec.description);
    expectDelegatorContextGuidance(spec.description);
    expectReadyToRunGuidance(spec.inputSchema.properties.tasks!.description ?? "");
    expectDelegatorContextGuidance(spec.inputSchema.properties.tasks!.description ?? "");
    const taskProperties = spec.inputSchema.properties.tasks!.items!.properties ?? {};
    expect(Object.keys(taskProperties)).toEqual([
      "member_name",
      "description",
      "reference_files",
    ]);
    expect(spec.inputSchema.properties.tasks!.items!.additionalProperties).toBe(false);
  });

  it("projects the guidance into Claude task delegation tool definition", async () => {
    const createToolDefinition = vi.fn(async (definition: Record<string, unknown>) => definition);

    const definitions = await buildClaudeTaskDelegationToolDefinitions({
      sdkClient: { createToolDefinition } as any,
      memberTeamContext: createMemberTeamContext(),
      enabledToolNames: [DELEGATE_TASKS_TOOL_NAME],
    });

    expect(definitions).toHaveLength(1);
    const definition = definitions![0] as Record<string, unknown>;
    expectReadyToRunGuidance(String(definition.description ?? ""));
    expectDelegatorContextGuidance(String(definition.description ?? ""));
    const inputSchema = definition.inputSchema as Record<string, unknown>;
    expectReadyToRunGuidance(getDescription(inputSchema.tasks));
  });

  it("exposes selector-free task-agent result tools with no generic status field", () => {
    const completedEntry = getTaskDelegationToolManifestEntry(MARK_TASK_COMPLETED_TOOL_NAME);
    expect(completedEntry.description).toContain("task-agent-only");
    expect(completedEntry.description).toContain("requires a result message");
    expect(completedEntry.description).toContain("must not pass status, task_id");

    const completedSchema = buildMarkTaskCompletedParameterSchema();
    expect(completedSchema.parameters.map((parameter) => parameter.name)).toEqual([
      "message",
      "reference_files",
    ]);
    expect(completedSchema.getParameter("message")!.required).toBe(true);
    expect(completedSchema.parameters.some((parameter) => parameter.name === "status")).toBe(false);
    expect(completedSchema.parameters.some((parameter) => parameter.name === "task_id")).toBe(false);

    const failedEntry = getTaskDelegationToolManifestEntry(MARK_TASK_FAILED_TOOL_NAME);
    expect(failedEntry.description).toContain("task-agent-only");
    expect(failedEntry.description).toContain("requires a failure message");
    expect(failedEntry.description).toContain("must not pass status, task_id");

    const failedSchema = buildMarkTaskFailedParameterSchema();
    expect(failedSchema.parameters.map((parameter) => parameter.name)).toEqual([
      "message",
      "reference_files",
    ]);
    expect(failedSchema.getParameter("message")!.required).toBe(true);
  });

  it("exposes original-delegator acceptance with generated task_id only", () => {
    const entry = getTaskDelegationToolManifestEntry(ACCEPT_TASK_TOOL_NAME);
    expect(entry.description).toContain("original delegator");
    expect(entry.description).toContain("framework-generated task_id");
    expect(entry.description).toContain("does not accept status, reference_files");

    const schema = buildAcceptTaskParameterSchema();
    expect(schema.parameters.map((parameter) => parameter.name)).toEqual([
      "task_id",
      "message",
    ]);
    expect(schema.getParameter("task_id")!.required).toBe(true);
    expect(schema.getParameter("task_id")!.description).toContain("original delegator");
    expect(schema.parameters.some((parameter) => parameter.name === "status")).toBe(false);
    expect(schema.parameters.some((parameter) => parameter.name === "reference_files")).toBe(false);
  });

  it("projects explicit task-delegation result and acceptance tools into runtime surfaces", async () => {
    const enabledToolNames = [
      MARK_TASK_COMPLETED_TOOL_NAME,
      MARK_TASK_FAILED_TOOL_NAME,
      ACCEPT_TASK_TOOL_NAME,
    ];
    const codexRegistrations = buildTaskDelegationDynamicToolRegistrations({
      memberTeamContext: createMemberTeamContext(),
      enabledToolNames,
    });
    expect(codexRegistrations?.map((registration) => registration.spec.name)).toEqual(enabledToolNames);

    const createToolDefinition = vi.fn(async (definition: Record<string, unknown>) => definition);
    const claudeDefinitions = await buildClaudeTaskDelegationToolDefinitions({
      sdkClient: { createToolDefinition } as any,
      memberTeamContext: createMemberTeamContext(),
      enabledToolNames,
    });
    expect(claudeDefinitions?.map((definition) => (definition as Record<string, unknown>).name)).toEqual(enabledToolNames);
  });
});
