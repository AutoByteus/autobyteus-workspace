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
  DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION,
  DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION,
} from "../../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

import { assertAgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { toTaskDelegationToolErrorPayload } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";

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

describe("delegate_task refuses an invalid address with a next step (SR-003 F-3b)", () => {
  it("converts the address validator's text at the tool boundary only", () => {
    let thrown: unknown;
    try { assertAgentTeamAddress("research_lead"); } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("AgentTeam address 'research_lead' is invalid: a canonical rooted value beginning with '/' is required");
    expect(toTaskDelegationToolErrorPayload(thrown)).toEqual({ error: {
      code: "COLLABORATION_ADDRESS_INVALID",
      message: "'research_lead' is not a valid address (a canonical rooted value beginning with '/' is required). An address is exact and begins with '/', for example /team/agent; if you have list_available_agents, it shows the addresses you can delegate to.",
    } });
  });
});

describe("task delegation runtime descriptions", () => {
  it("exposes only delegate_task in the canonical manifest (AC-002)", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([DELEGATE_TASK_TOOL_NAME]);
    expect(TASK_DELEGATION_TOOL_MANIFEST.map((entry) => entry.name)).toEqual([DELEGATE_TASK_TOOL_NAME]);
    expect(JSON.stringify(TASK_DELEGATION_TOOL_MANIFEST)).not.toMatch(/submit_task_result|review_task_result/);
  });

  it("describes delegate_task as a new task agent by address or an assignment to one of your task agents by its own ID (AC-015)", () => {
    const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
    expect(delegateEntry.description).toBe(DELEGATE_TASK_LLM_DESCRIPTION);
    expect(delegateEntry.description).toContain("creates a new task agent (or task agent team)");
    expect(delegateEntry.description).toContain("gives the saved Task to a run that already exists");
    expect(delegateEntry.description).toContain("It may be one of your task agents");
    // Adoption (link-existing-run-to-task, design SR-008): a run the user started, for a standalone agent run.
    expect(delegateEntry.description).toContain("an idle agent run or team run the user started in your own workspace");
    expect(delegateEntry.description).toContain("recipient_address");
    expect(delegateEntry.description).toContain("target_agent_run_id or target_team_run_id");
    expect(delegateEntry.description).toContain("If delegated is false, nothing was created");
    expect(delegateEntry.description).not.toMatch(/always spawns|target_agent_run_id is null/);
    expect(delegateEntry.description).not.toMatch(/submit_task_result|review_task_result|task lifecycle/i);
    expect(delegateEntry.description).not.toContain("./");
    expect(delegateEntry.description).not.toContain("direct child");
    expect(delegateEntry.description).not.toContain(["mark", "task", "completed"].join("_"));
    expect(delegateEntry.description).not.toContain(["accept", "task"].join("_"));
    expect(delegateEntry.description).not.toContain("Do not pass");

    const delegateSchema = buildDelegateTaskParameterSchema();
    expect(delegateSchema.parameters.map((parameter) => parameter.name)).toEqual([
      "recipient_address",
      "target_team_run_id",
      "target_agent_run_id",
      "task_id",
      "description",
      "reference_files",
    ]);
    expect(findParameter(delegateSchema, "tasks")).toBeUndefined();
    expect(findParameter(delegateSchema, "target")).toBeUndefined();
    // One mode needs no address (an existing copy by its own ID): no parameter is required by itself.
    expect(delegateSchema.parameters.every((parameter) => parameter.required === false)).toBe(true);
    expect(findParameter(delegateSchema, "recipient_address")?.description).toBe(
      EXPECTED_RECIPIENT_ADDRESS_DESCRIPTION,
    );
    expect(findParameter(delegateSchema, "target_team_run_id")?.description).toBe(DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION);
    expect(findParameter(delegateSchema, "target_agent_run_id")?.description).toBe(DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION);
    const delegateDescription = findParameter(delegateSchema, "description")?.description ?? "";
    expect(delegateDescription).toBe(DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION);
    expect(delegateDescription).toContain("complete, ready-to-work task description");
    expect(delegateDescription).toContain("objective");
    expect(delegateDescription).toContain("what done looks like");
    const delegateReferenceDescription = findParameter(delegateSchema, "reference_files")?.description ?? "";
    expect(delegateReferenceDescription.toLowerCase()).toContain("absolute local file paths");
    expect(delegateReferenceDescription).toBe(DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION);
    expect(delegateReferenceDescription).toContain("Relative paths and URLs are rejected");
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
      properties: {
        recipient_address: { type: "string", description: EXPECTED_RECIPIENT_ADDRESS_DESCRIPTION },
        target_team_run_id: { type: "string", description: DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION },
        target_agent_run_id: { type: "string", description: DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION },
      },
    });
    expect((mcpDefinition?.inputSchema as { required?: string[] }).required ?? []).toEqual([]);

    const publicCopy = JSON.stringify({
      native: nativeSchema.toJsonSchema(),
      mcp: mcpDefinition,
    });
    expect(publicCopy).not.toContain("./");
    expect(publicCopy).not.toContain("direct child");
    expect(publicCopy).toContain("target_agent_run_id");
  });

  it("publishes the delegate_task MCP output schema as the explicit-ID union; success may carry the created task_id and launch_notes (AC-001, REQ-001, REQ-008)", () => {
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
    expect(outputSchema.anyOf).toHaveLength(3);
    const [agentCopy, teamCopy, notDelegated] = outputSchema.anyOf;
    expect(agentCopy).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["delegated", "target_kind", "target_agent_run_id"],
      properties: { delegated: { const: true }, target_kind: { const: "agent" }, target_agent_run_id: { type: "string", minLength: 1 },
        task_id: { type: "string", minLength: 1 } },
    });
    expect(Object.keys(agentCopy!.properties as object)).toEqual(["delegated", "target_kind", "target_agent_run_id", "task_id", "launch_notes"]);
    // launch_notes: an optional, non-empty list of non-blank fallback notes.
    expect((agentCopy!.properties as Record<string, unknown>).launch_notes).toMatchObject({ type: "array", minItems: 1, items: { type: "string", minLength: 1 } });
    expect((agentCopy!.required as string[])).not.toContain("launch_notes");
    expect(Object.keys(teamCopy!.properties as object)).toContain("launch_notes");
    expect(teamCopy).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["delegated", "target_kind", "target_team_run_id", "target_team_coordinator_agent_run_id"],
      properties: { delegated: { const: true }, target_kind: { const: "team" }, target_team_run_id: { type: "string", minLength: 1 },
        target_team_coordinator_agent_run_id: { type: "string", minLength: 1 }, task_id: { type: "string", minLength: 1 } },
    });
    // DEC-008: a Team result carries no ambiguous target_agent_run_id.
    expect(Object.keys(teamCopy!.properties as object)).not.toContain("target_agent_run_id");
    expect(notDelegated).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["delegated", "message"],
      properties: { delegated: { const: false }, message: { type: "string", minLength: 1 } },
    });
    // task_id is only an optional success field; no Task status or failed-start Task identity.
    expect(JSON.stringify(notDelegated)).not.toMatch(/task_id|target_|launch_notes/);
    expect(JSON.stringify(outputSchema)).not.toMatch(/"status"/);
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
      delegated: true, target_kind: "agent", target_agent_run_id: "run-worker",
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
          delegated: true, target_kind: "agent", target_agent_run_id: "run-worker",
        },
      },
    });
    if (accepted.kind !== "mcp_tool_result") throw new Error("Expected MCP result.");
    expect(JSON.parse(String(accepted.result.content[0]?.text))).toEqual(
      accepted.result.structuredContent,
    );

    delegateTask.mockResolvedValueOnce({
      delegated: false,
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
          delegated: false,
          message: "Task activation failed.",
        },
      },
    });
    if (notStarted.kind !== "mcp_tool_result") throw new Error("Expected MCP result.");
    expect(JSON.parse(String(notStarted.result.content[0]?.text))).toEqual(
      notStarted.result.structuredContent,
    );
    expect(delegateTask).toHaveBeenCalledWith(taskDelegation, { subject: "new_copy", input: {
      recipient_address: "/worker",
      description: "Perform the bounded work.",
      reference_files: [],
    } });

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
