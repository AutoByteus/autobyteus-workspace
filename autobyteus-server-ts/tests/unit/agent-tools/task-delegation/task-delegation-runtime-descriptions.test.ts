import { describe, expect, it, vi } from "vitest";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TASK_DELEGATION_TOOL_MANIFEST, getTaskDelegationToolManifestEntry } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import { buildDelegateTaskParameterSchema } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.js";
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

const memberExecutionContext = testMemberExecutionContext({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  rootTeamRunId: "team-run-1",
  memberAddress: "/coordinator",
  agentRunId: "run-coordinator",
});

describe("task delegation runtime descriptions", () => {
  it("exposes only delegate_task in the canonical manifest (AC-002)", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([DELEGATE_TASK_TOOL_NAME]);
    expect(TASK_DELEGATION_TOOL_MANIFEST.map((entry) => entry.name)).toEqual([DELEGATE_TASK_TOOL_NAME]);
    expect(JSON.stringify(TASK_DELEGATION_TOOL_MANIFEST)).not.toMatch(/submit_task_result|review_task_result/);
  });

  it("describes delegate_task as a spawn followed by send_message_to (AC-016)", () => {
    const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
    expect(delegateEntry.description).toBe(DELEGATE_TASK_LLM_DESCRIPTION);
    expect(delegateEntry.description).toMatch(/Start one fresh instance of a mounted Agent or/);
    expect(delegateEntry.description).toContain("recipient_address");
    expect(delegateEntry.description).toContain("first message");
    expect(delegateEntry.description).toContain("target_agent_run_id is null");
    expect(delegateEntry.description).toContain("only through send_message_to");
    expect(delegateEntry.description).not.toMatch(/task_id|status|submit|review|task lifecycle/i);
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
    expect(delegateDescription).toContain("Complete ready-to-run work description");
    expect(delegateDescription).toContain("objective");
    expect(delegateDescription).toContain("done conditions");
    expect(delegateDescription).toContain("delegate_task itself delivers this as the new instance's first message");
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

  it("publishes the delegate_task MCP output schema as the spawn-result union with no task identity (AC-019)", () => {
    const provider = new TaskDelegationToolsMcpAdapterProvider({} as never);
    const catalog = new AgentToolMcpCatalog({ adapters: provider.getAdapters() });
    const [mcpDefinition] = catalog.listMcpToolsForSession({
      enabledTools: [DELEGATE_TASK_TOOL_NAME],
      toolRoutes: {
        [DELEGATE_TASK_TOOL_NAME]: { kind: "static_adapter", toolName: DELEGATE_TASK_TOOL_NAME },
      },
    } as never, "2025-06-18");
    const outputSchema = mcpDefinition?.outputSchema as { type: string; anyOf: Array<Record<string, unknown>> };
    expect(outputSchema.type).toBe("object");
    expect(outputSchema.anyOf).toHaveLength(2);
    const [success, notStarted] = outputSchema.anyOf;
    expect(success).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["target_agent_run_id"],
      properties: { target_agent_run_id: { type: "string", minLength: 1 } },
    });
    expect(Object.keys(success!.properties as object)).toEqual(["target_agent_run_id"]);
    expect(notStarted).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["target_agent_run_id", "message"],
      properties: { target_agent_run_id: { type: "null" }, message: { type: "string", minLength: 1 } },
    });
    expect(JSON.stringify(outputSchema)).not.toMatch(/task_id|"status"/);
  });

  it("projects pure task tools through Agent Tools MCP adapter definitions", () => {
    const adapters = new TaskDelegationToolsMcpAdapterProvider({} as never).getAdapters();

    expect(adapters.map((adapter) => adapter.definition.name)).toEqual([DELEGATE_TASK_TOOL_NAME]);
    expect(JSON.stringify(adapters.map((adapter) => adapter.definition))).not.toContain(["mark", "task", "completed"].join("_"));
    expect(JSON.stringify(adapters.map((adapter) => adapter.definition))).not.toContain(["accept", "task"].join("_"));
    expect(adapters.every((adapter) => !adapter.isAvailable({
      runtimeExposure: { requestedToolNames: TASK_DELEGATION_TOOL_NAME_LIST } as never,
      sender: null,
      executionContext: {},
    }))).toBe(true);
    expect(adapters.every((adapter) => adapter.isAvailable({
      runtimeExposure: { requestedToolNames: TASK_DELEGATION_TOOL_NAME_LIST } as never,
      sender: {
        senderRunId: memberExecutionContext.agentRunId,
        memberExecutionContext,
      } as never,
      executionContext: {},
    }))).toBe(true);
  });

  it("executes MCP task tools only from the authenticated Team-member capability", async () => {
    const delegateTask = vi.fn(async (): Promise<Record<string, unknown>> => ({
      target_agent_run_id: "run-worker",
    }));
    const provider = new TaskDelegationToolsMcpAdapterProvider({ delegateTask } as never);
    const adapter = provider.getAdapters().find(
      (candidate) => candidate.definition.name === DELEGATE_TASK_TOOL_NAME,
    )!;
    const taskDelegation = Object.freeze({
      identity: memberExecutionContext.identity,
      commands: memberExecutionContext.tasks,
    });
    const publisher = { publishManyForRun: vi.fn(async () => []) };

    const accepted = await adapter.execute({
      session: {
        executionCapabilities: {
          kind: "collaboration_member",
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
          target_agent_run_id: "run-worker",
        },
      },
    });
    if (accepted.kind !== "mcp_tool_result") throw new Error("Expected MCP result.");
    expect(JSON.parse(String(accepted.result.content[0]?.text))).toEqual(
      accepted.result.structuredContent,
    );

    delegateTask.mockResolvedValueOnce({
      target_agent_run_id: null,
      message: "Task activation failed.",
    });
    const notStarted = await adapter.execute({
      session: {
        executionCapabilities: {
          kind: "collaboration_member",
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
          target_agent_run_id: null,
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
        sender: { memberExecutionContext },
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
