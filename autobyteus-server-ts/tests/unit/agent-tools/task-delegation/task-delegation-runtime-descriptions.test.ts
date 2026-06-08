import { describe, expect, it, vi } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildTaskDelegationDynamicToolRegistrations } from "../../../../src/agent-execution/backends/codex/task-delegation/build-task-delegation-dynamic-tool-registrations.js";
import { buildClaudeTaskDelegationToolDefinitions } from "../../../../src/agent-execution/backends/claude/task-delegation/build-claude-task-delegation-tool-definitions.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TASK_DELEGATION_TOOL_MANIFEST, getTaskDelegationToolManifestEntry } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildAcceptTaskParameterSchema,
  buildDelegateTasksParameterSchema,
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
  it("exposes only delegate_tasks and accept_task in the canonical manifest", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      ACCEPT_TASK_TOOL_NAME,
    ]);
    expect(TASK_DELEGATION_TOOL_MANIFEST.map((entry) => entry.name)).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      ACCEPT_TASK_TOOL_NAME,
    ]);
  });

  it("describes task-agent communication through send_message_to exact-run targets", () => {
    const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASKS_TOOL_NAME);
    expect(delegateEntry.description).toMatch(/ready-to-run task work packets/i);
    expect(delegateEntry.description).toContain("send_message_to");
    expect(delegateEntry.description).toContain("target_agent_run_id");
    expect(delegateEntry.description).not.toContain(["mark", "task", "completed"].join("_"));

    const tasksParam = findParameter(buildDelegateTasksParameterSchema(), "tasks")!;
    expect(tasksParam.description).toContain("Task-agent communication after activation uses send_message_to");
    const taskItemSchema = tasksParam.arrayItemSchema as ParameterSchema;
    expect(findParameter(taskItemSchema, "member_name")?.required).toBe(true);
    expect(findParameter(taskItemSchema, "description")?.description).toContain("progress, blockers, completion reports, and revision feedback use send_message_to");
  });

  it("describes accept_task as the only terminal task action", () => {
    const entry = getTaskDelegationToolManifestEntry(ACCEPT_TASK_TOOL_NAME);
    expect(entry.description).toContain("original delegator");
    expect(entry.description).toContain("only terminal task action");
    expect(entry.description).toContain("send_message_to report");

    const schema = buildAcceptTaskParameterSchema();
    expect(findParameter(schema, "task_id")?.required).toBe(true);
    expect(schema.parameters.map((parameter) => parameter.name)).toEqual(["task_id", "message"]);
  });

  it("projects simplified tools into Codex dynamic tool registration", () => {
    const registrations = buildTaskDelegationDynamicToolRegistrations({
      memberTeamContext,
      enabledToolNames: TASK_DELEGATION_TOOL_NAME_LIST,
    });

    expect(registrations?.map((registration) => registration.spec.name)).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      ACCEPT_TASK_TOOL_NAME,
    ]);
    expect(JSON.stringify(registrations?.map((registration) => registration.spec))).not.toContain(["mark", "task", "completed"].join("_"));
    expect(registrations?.[0]?.spec.description).toContain("target_agent_run_id");
  });

  it("projects simplified tools into Claude tool definitions", async () => {
    const createToolDefinition = vi.fn(async (definition: Record<string, unknown>) => definition);
    const definitions = await buildClaudeTaskDelegationToolDefinitions({
      sdkClient: { createToolDefinition } as never,
      memberTeamContext,
      enabledToolNames: TASK_DELEGATION_TOOL_NAME_LIST,
    });

    expect(definitions?.map((definition) => definition.name)).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      ACCEPT_TASK_TOOL_NAME,
    ]);
    expect(createToolDefinition).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(definitions)).not.toContain(["mark", "task", "failed"].join("_"));
  });
});
