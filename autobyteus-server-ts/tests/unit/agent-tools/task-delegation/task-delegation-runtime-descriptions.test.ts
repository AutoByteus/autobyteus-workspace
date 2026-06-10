import { describe, expect, it, vi } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildTaskDelegationDynamicToolRegistrations } from "../../../../src/agent-execution/backends/codex/task-delegation/build-task-delegation-dynamic-tool-registrations.js";
import { buildClaudeTaskDelegationToolDefinitions } from "../../../../src/agent-execution/backends/claude/task-delegation/build-claude-task-delegation-tool-definitions.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TASK_DELEGATION_TOOL_MANIFEST, getTaskDelegationToolManifestEntry } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildDelegateTasksParameterSchema,
  buildReviewTaskResultParameterSchema,
  buildSubmitTaskResultParameterSchema,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.js";

const findParameter = (schema: ParameterSchema, name: string) =>
  schema.parameters.find((parameter) => parameter.name === name);

const memberTeamContext = new MemberTeamContext({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  teamBackendKind: TeamBackendKind.MIXED,
  memberName: "coordinator",
  memberPath: ["coordinator"],
  memberRouteKey: "coordinator",
  memberRunId: "run-coordinator",
  members: [
    {
      memberKind: "agent",
      memberName: "coordinator",
      memberPath: ["coordinator"],
      memberRouteKey: "coordinator",
      memberRunId: "run-coordinator",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      role: null,
      description: null,
      address: { teamRunId: "team-run-1", memberPath: ["coordinator"], memberRouteKey: "coordinator" },
    },
  ],
});

describe("task delegation runtime descriptions", () => {
  it("exposes only delegate_tasks, submit_task_result, and review_task_result in the canonical manifest", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    expect(TASK_DELEGATION_TOOL_MANIFEST.map((entry) => entry.name)).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
  });

  it("describes the pure task result/review protocol without lifecycle chat fallback", () => {
    const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASKS_TOOL_NAME);
    expect(delegateEntry.description).toMatch(/ready-to-run task work packets/i);
    expect(delegateEntry.description).toContain("submit_task_result");
    expect(delegateEntry.description).toContain("review_task_result");
    expect(delegateEntry.description).not.toContain(["mark", "task", "completed"].join("_"));
    expect(delegateEntry.description).not.toContain(["accept", "task"].join("_"));

    const tasksParam = findParameter(buildDelegateTasksParameterSchema(), "tasks")!;
    expect(tasksParam.description).toContain("submit_task_result");
    const taskItemSchema = tasksParam.arrayItemSchema as ParameterSchema;
    expect(findParameter(taskItemSchema, "member_name")?.required).toBe(true);
    expect(findParameter(taskItemSchema, "description")?.description).toContain("do not encode dependencies");
  });

  it("describes submit_task_result as selector-free and review_task_result as accept-or-revise", () => {
    const submitEntry = getTaskDelegationToolManifestEntry(SUBMIT_TASK_RESULT_TOOL_NAME);
    expect(submitEntry.description).toContain("task-agent-only");
    expect(submitEntry.description).toContain("selector-free");
    expect(buildSubmitTaskResultParameterSchema().parameters.map((parameter) => parameter.name)).toEqual(["message", "reference_files"]);

    const reviewEntry = getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME);
    expect(reviewEntry.description).toContain("latest pending result submission");
    expect(reviewEntry.description).toContain("request_revision");
    const schema = buildReviewTaskResultParameterSchema();
    expect(schema.parameters.map((parameter) => parameter.name)).toEqual(["task_id", "decision", "message", "reference_files"]);
    expect(findParameter(schema, "decision")?.enumValues).toEqual(["accept", "request_revision"]);
  });

  it("projects pure task tools into Codex dynamic tool registration", () => {
    const registrations = buildTaskDelegationDynamicToolRegistrations({
      memberTeamContext,
      enabledToolNames: TASK_DELEGATION_TOOL_NAME_LIST,
    });

    expect(registrations?.map((registration) => registration.spec.name)).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    expect(JSON.stringify(registrations?.map((registration) => registration.spec))).not.toContain(["mark", "task", "completed"].join("_"));
    expect(JSON.stringify(registrations?.map((registration) => registration.spec))).not.toContain(["accept", "task"].join("_"));
    expect(registrations?.[1]?.spec.description).toContain("selector-free");
  });

  it("projects pure task tools into Claude tool definitions", async () => {
    const createToolDefinition = vi.fn(async (definition: Record<string, unknown>) => definition);
    const definitions = await buildClaudeTaskDelegationToolDefinitions({
      sdkClient: { createToolDefinition } as never,
      memberTeamContext,
      enabledToolNames: TASK_DELEGATION_TOOL_NAME_LIST,
    });

    expect(definitions?.map((definition) => definition.name)).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    expect(createToolDefinition).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(definitions)).not.toContain(["mark", "task", "failed"].join("_"));
    expect(JSON.stringify(definitions)).not.toContain(["accept", "task"].join("_"));
  });
});
