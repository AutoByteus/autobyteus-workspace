import { describe, expect, it } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TASK_DELEGATION_TOOL_MANIFEST, getTaskDelegationToolManifestEntry } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildDelegateTaskParameterSchema,
  buildReviewTaskResultParameterSchema,
  buildSubmitTaskResultParameterSchema,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.js";
import { TaskDelegationToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js";

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
  it("exposes only delegate_task, submit_task_result, and review_task_result in the canonical manifest", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      DELEGATE_TASK_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    expect(TASK_DELEGATION_TOOL_MANIFEST.map((entry) => entry.name)).toEqual([
      DELEGATE_TASK_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
  });

  it("describes the pure task result/review protocol without lifecycle chat fallback", () => {
    const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
    expect(delegateEntry.description).toMatch(/Delegate one ready-to-run task/i);
    expect(delegateEntry.description).toContain("target");
    expect(delegateEntry.description).toContain("member");
    expect(delegateEntry.description).toContain("team");
    expect(delegateEntry.description).toContain("description");
    expect(delegateEntry.description).toContain("reference_files");
    expect(delegateEntry.description).toContain("absolute local file paths");
    expect(delegateEntry.description).toContain("submit_task_result");
    expect(delegateEntry.description).not.toContain(["mark", "task", "completed"].join("_"));
    expect(delegateEntry.description).not.toContain(["accept", "task"].join("_"));
    expect(delegateEntry.description).not.toContain("Do not pass");

    const delegateSchema = buildDelegateTaskParameterSchema();
    expect(delegateSchema.parameters.map((parameter) => parameter.name)).toEqual([
      "target",
      "description",
      "reference_files",
    ]);
    expect(findParameter(delegateSchema, "tasks")).toBeUndefined();
    expect(findParameter(delegateSchema, "target")?.required).toBe(true);
    const delegateDescription = findParameter(delegateSchema, "description")?.description ?? "";
    expect(delegateDescription).toContain("Complete task details");
    expect(delegateDescription).toContain("objective");
    expect(delegateDescription).toContain("done conditions");
    expect(delegateDescription).toContain("task itself");
    expect(delegateDescription).not.toMatch(/message to|send/i);
    const delegateReferenceDescription = findParameter(delegateSchema, "reference_files")?.description ?? "";
    expect(delegateReferenceDescription).toContain("absolute local file paths");
    expect(delegateReferenceDescription).toContain("realpath");
    expect(delegateReferenceDescription).toContain("relative paths and URLs are rejected");
    expect(JSON.stringify(delegateSchema)).not.toContain("Do not pass");
    expect(JSON.stringify(delegateSchema)).not.toContain("completion_criteria");
  });

  it("describes submit_task_result as context-bound and review_task_result as accept-or-revise", () => {
    const submitEntry = getTaskDelegationToolManifestEntry(SUBMIT_TASK_RESULT_TOOL_NAME);
    expect(submitEntry.description).toContain("bound to the current task-agent or task-team ingress context");
    expect(submitEntry.description).toContain("message");
    expect(submitEntry.description).toContain("reference_files");
    expect(submitEntry.description).toContain("absolute local file paths");
    expect(submitEntry.description).not.toContain("Do not pass");
    expect(buildSubmitTaskResultParameterSchema().parameters.map((parameter) => parameter.name)).toEqual(["message", "reference_files"]);
    expect(findParameter(buildSubmitTaskResultParameterSchema(), "reference_files")?.description).toContain("absolute local file paths");

    const reviewEntry = getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME);
    expect(reviewEntry.description).toContain("latest pending result submission");
    expect(reviewEntry.description).toContain("request_revision");
    expect(reviewEntry.description).toContain("task-result comment");
    expect(reviewEntry.description).toContain("absolute local file paths");
    expect(reviewEntry.description).not.toContain("non-empty message");
    const schema = buildReviewTaskResultParameterSchema();
    expect(schema.parameters.map((parameter) => parameter.name)).toEqual(["task_id", "decision", "comment", "reference_files"]);
    expect(findParameter(schema, "decision")?.enumValues).toEqual(["accept", "request_revision"]);
    const commentDescription = findParameter(schema, "comment")?.description ?? "";
    expect(commentDescription).toContain("Task-result review comment");
    expect(commentDescription).toContain("revision");
    expect(commentDescription).toContain("acceptance feedback");
    expect(commentDescription).not.toMatch(/message to|send/i);
    expect(findParameter(schema, "reference_files")?.description).toContain("absolute local file paths");
  });

  it("projects pure task tools through Agent Tools MCP adapter definitions", () => {
    const adapters = new TaskDelegationToolsMcpAdapterProvider().getAdapters();

    expect(adapters.map((adapter) => adapter.definition.name)).toEqual([
      DELEGATE_TASK_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    expect(JSON.stringify(adapters.map((adapter) => adapter.definition))).not.toContain(["mark", "task", "completed"].join("_"));
    expect(JSON.stringify(adapters.map((adapter) => adapter.definition))).not.toContain(["accept", "task"].join("_"));
    expect(adapters[1]?.definition.description).toContain("bound to the current task-agent or task-team ingress context");
    expect(adapters.every((adapter) => !adapter.isAvailable({
      runtimeExposure: { requestedToolNames: TASK_DELEGATION_TOOL_NAME_LIST } as never,
      sender: null,
      executionContext: {},
    }))).toBe(true);
    expect(adapters.every((adapter) => adapter.isAvailable({
      runtimeExposure: { requestedToolNames: TASK_DELEGATION_TOOL_NAME_LIST } as never,
      sender: {
        senderRunId: memberTeamContext.memberRunId,
        memberTeamContext,
      } as never,
      executionContext: {},
    }))).toBe(true);
  });
});
