import { describe, expect, it, vi } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildClaudeTaskDelegationToolDefinitions } from "../../../../src/agent-execution/backends/claude/task-delegation/build-claude-task-delegation-tool-definitions.js";
import { buildTaskDelegationDynamicToolRegistrations } from "../../../../src/agent-execution/backends/codex/task-delegation/build-task-delegation-dynamic-tool-registrations.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  UPDATE_TASK_STATUS_TOOL_NAME,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildDelegateTasksParameterSchema,
  buildUpdateTaskStatusParameterSchema,
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

  it("exposes the two-mode update_task_status acceptance contract", () => {
    const entry = getTaskDelegationToolManifestEntry(UPDATE_TASK_STATUS_TOOL_NAME);
    expect(entry.description).toContain('status="accepted"');
    expect(entry.description).toContain("framework-generated task_id");
    expect(entry.description).toContain("Task-agent execution updates must not pass task selectors");

    const schema = buildUpdateTaskStatusParameterSchema();
    expect(schema.parameters.map((parameter) => parameter.name)).toEqual([
      "status",
      "task_id",
      "message",
      "reference_files",
    ]);
    expect(schema.getParameter("status")!.enumValues).toEqual([
      "in_progress",
      "completed",
      "failed",
      "accepted",
    ]);
    expect(schema.getParameter("task_id")!.description).toContain("status=accepted");
  });
});
