import { describe, expect, it, vi } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";
import { testMemberTaskRootResolver } from "../../../fixtures/current-team-run-fixtures.js";
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
import { DelegateTaskTool } from "../../../../src/agent-tools/task-delegation/delegate-task.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { TaskDelegationToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js";
import {
  DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
  DELEGATE_TASK_LLM_DESCRIPTION,
  DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
  DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
} from "../../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

const findParameter = (schema: ParameterSchema, name: string) =>
  schema.parameters.find((parameter) => parameter.name === name);

const EXPECTED_RECIPIENT_ADDRESS_DESCRIPTION =
  DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION;

const memberTeamContext = testMemberTeamContext({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  rootTeamRunId: "team-run-1",
  memberAddress: "/coordinator",
  agentRunId: "run-coordinator",
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
    expect(delegateEntry.description).toBe(DELEGATE_TASK_LLM_DESCRIPTION);
    expect(delegateEntry.description).toMatch(/Spawn one fresh, independently tracked task execution/i);
    expect(delegateEntry.description).toContain("recipient_address");
    expect(delegateEntry.description).toContain("one mounted Agent or");
    expect(delegateEntry.description).toContain("fresh task Team");
    expect(delegateEntry.description).toContain("do not resend the same work");
    expect(delegateEntry.description).toContain("target_agent_run_id");
    expect(delegateEntry.description).not.toContain("./");
    expect(delegateEntry.description).not.toContain("direct child");
    expect(delegateEntry.description).not.toContain(["mark", "task", "completed"].join("_"));
    expect(delegateEntry.description).not.toContain(["accept", "task"].join("_"));
    expect(delegateEntry.description).not.toContain("Do not pass");

    const delegateSchema = buildDelegateTaskParameterSchema();
    expect(delegateSchema.parameters.map((parameter) => parameter.name)).toEqual([
      "recipient_address",
      "description",
      "reference_files",
    ]);
    expect(findParameter(delegateSchema, "tasks")).toBeUndefined();
    expect(findParameter(delegateSchema, "target")).toBeUndefined();
    expect(findParameter(delegateSchema, "recipient_address")?.required).toBe(true);
    expect(findParameter(delegateSchema, "recipient_address")?.description).toBe(
      EXPECTED_RECIPIENT_ADDRESS_DESCRIPTION,
    );
    expect(findParameter(delegateSchema, "target_agent_run_id")).toBeUndefined();
    const delegateDescription = findParameter(delegateSchema, "description")?.description ?? "";
    expect(delegateDescription).toBe(DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION);
    expect(delegateDescription).toContain("Complete ready-to-run task packet");
    expect(delegateDescription).toContain("objective");
    expect(delegateDescription).toContain("done conditions");
    expect(delegateDescription).toContain("delegate_task itself delivers this packet");
    expect(delegateDescription).toContain("do not resend it with send_message_to");
    const delegateReferenceDescription = findParameter(delegateSchema, "reference_files")?.description ?? "";
    expect(delegateReferenceDescription).toContain("absolute local file paths");
    expect(delegateReferenceDescription).toBe(DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION);
    expect(delegateReferenceDescription).toContain("relative paths and URLs are rejected");
    expect(JSON.stringify(delegateSchema)).not.toContain("Do not pass");
    expect(JSON.stringify(delegateSchema)).not.toContain("completion_criteria");
  });

  it("publishes one canonical universal recipient field through native AutoByteus and shared MCP definitions", () => {
    const nativeSchema = DelegateTaskTool.getArgumentSchema();
    expect(findParameter(nativeSchema, "recipient_address")?.description).toBe(
      EXPECTED_RECIPIENT_ADDRESS_DESCRIPTION,
    );

    const provider = new TaskDelegationToolsMcpAdapterProvider({} as never);
    const delegateAdapter = provider.getAdapters().find(
      (adapter) => adapter.definition.name === DELEGATE_TASK_TOOL_NAME,
    );
    expect(delegateAdapter).toBeDefined();

    const catalog = new AgentToolMcpCatalog({ adapters: [delegateAdapter!] });
    const [mcpDefinition] = catalog.listMcpToolsForSession({
      enabledTools: [DELEGATE_TASK_TOOL_NAME],
      toolRoutes: {
        [DELEGATE_TASK_TOOL_NAME]: {
          kind: "static_adapter",
          toolName: DELEGATE_TASK_TOOL_NAME,
        },
      },
    } as never, "2025-03-26");
    expect(mcpDefinition?.name).toBe(DELEGATE_TASK_TOOL_NAME);
    expect(mcpDefinition?.inputSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["recipient_address", "description"],
      properties: {
        recipient_address: {
          type: "string",
          description: EXPECTED_RECIPIENT_ADDRESS_DESCRIPTION,
        },
      },
    });

    const publicCopy = JSON.stringify({
      native: nativeSchema.toJsonSchema(),
      mcp: mcpDefinition,
    });
    expect(publicCopy).not.toContain("./");
    expect(publicCopy).not.toContain("direct child");
    expect(publicCopy).toContain("target_agent_run_id");
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
    const adapters = new TaskDelegationToolsMcpAdapterProvider({} as never).getAdapters();

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
        senderRunId: memberTeamContext.agentRunId,
        memberTeamContext,
      } as never,
      executionContext: {},
    }))).toBe(true);
  });

  it("executes MCP task tools only from the authenticated Team-member capability", async () => {
    const delegateTask = vi.fn(async () => ({
      task_id: "task-2",
      status: "active" as const,
      target_agent_run_id: "run-worker",
    }));
    const provider = new TaskDelegationToolsMcpAdapterProvider({ delegateTask } as never);
    const adapter = provider.getAdapters().find(
      (candidate) => candidate.definition.name === DELEGATE_TASK_TOOL_NAME,
    )!;
    const rootResolver = testMemberTaskRootResolver();
    const taskDelegation = Object.freeze({
      identity: memberTeamContext.identity,
      rootResolver,
    });
    const publisher = { publishManyForRun: vi.fn(async () => []) };

    const accepted = await adapter.execute({
      session: {
        executionCapabilities: {
          kind: "team_member",
          publishedArtifactPublisher: publisher,
          applicationAgentTools: null,
          taskDelegation,
        },
      } as never,
      rawArguments: {
        recipient_address: "/worker",
        description: "Perform the bounded work.",
      },
    });
    expect(accepted).toMatchObject({
      kind: "mcp_tool_result",
      result: {
        content: [{ type: "text" }],
        structuredContent: {
          task_id: "task-2",
          status: "active",
          target_agent_run_id: "run-worker",
        },
      },
    });
    if (accepted.kind !== "mcp_tool_result") throw new Error("Expected MCP result.");
    expect(JSON.parse(String(accepted.result.content[0]?.text))).toEqual(
      accepted.result.structuredContent,
    );

    delegateTask.mockResolvedValueOnce({
      task_id: "task-3",
      status: "not_started" as const,
      message: "Task activation failed.",
    });
    const notStarted = await adapter.execute({
      session: {
        executionCapabilities: {
          kind: "team_member",
          publishedArtifactPublisher: publisher,
          applicationAgentTools: null,
          taskDelegation,
        },
      } as never,
      rawArguments: {
        recipient_address: "/worker",
        description: "Retry the bounded work.",
      },
    });
    expect(notStarted).toMatchObject({
      kind: "mcp_tool_result",
      result: {
        structuredContent: {
          task_id: "task-3",
          status: "not_started",
          message: "Task activation failed.",
        },
      },
    });
    if (notStarted.kind !== "mcp_tool_result") throw new Error("Expected MCP result.");
    expect(JSON.parse(String(notStarted.result.content[0]?.text))).toEqual(
      notStarted.result.structuredContent,
    );
    expect(delegateTask).toHaveBeenCalledWith(taskDelegation, {
      recipient_address: "/worker",
      description: "Perform the bounded work.",
      reference_files: [],
    });

    const rejected = await adapter.execute({
      session: {
        sender: { memberTeamContext },
        executionCapabilities: {
          kind: "agent",
          publishedArtifactPublisher: publisher,
          applicationAgentTools: null,
        },
      } as never,
      rawArguments: {
        recipient_address: "/worker",
        description: "Must not execute.",
      },
    });
    expect(rejected).toMatchObject({
      kind: "operation_result",
      result: { accepted: false, code: "task_delegation_context_required" },
    });
    expect(delegateTask).toHaveBeenCalledTimes(2);
  });
});
