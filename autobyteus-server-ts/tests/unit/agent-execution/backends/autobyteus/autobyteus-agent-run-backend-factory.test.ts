import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentConfig, CompactionPolicy, LLMFactory } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { Message } from "autobyteus-ts/llm/utils/messages.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AutoByteusAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { TeamBackendKind } from "../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "../../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { registerAgentCommunicationTools } from "../../../../../src/agent-tools/agent-communication/register-agent-communication-tools.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTeamContext } from "../../../../fixtures/current-team-run-fixtures.js";
import { registerTools } from "autobyteus-ts/tools/register-tools.js";
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../../src/built-in-agents/built-in-agent-registry.js";

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

class DummyTool extends BaseTool {
  static TOOL_NAME = "dummy";

  static getName(): string {
    return this.TOOL_NAME;
  }

  static getDescription(): string {
    return "dummy";
  }

  protected async _execute(): Promise<string> {
    return "ok";
  }
}


class AssignTaskTool extends DummyTool {
  static override TOOL_NAME = "assign_task_to";
}

const createToolDefinition = (toolClass: typeof DummyTool, category: ToolCategory) =>
  new ToolDefinition(toolClass.getName(), toolClass.getDescription(), ToolOrigin.LOCAL, category, () => null, () => null, {
    toolClass,
  });

type TaskAgentContextFacts = Readonly<{
  taskAgentRunId: string;
  taskId: string;
}>;

const createMemberTeamContext = (
  _teamBackendKind: TeamBackendKind,
  deliverInterAgentMessage: ReturnType<typeof vi.fn> = vi
    .fn()
    .mockResolvedValue({ accepted: true }),
  taskAgentContext: TaskAgentContextFacts | null = null,
  sendMessageToEnabled = true,
) => {
  const root = {
    delegateTask: vi.fn(async () => ({
      task_id: "task_0008",
      status: "active" as const,
      target_agent_run_id: "run-reviewer",
    })),
  };
  const taskRootResolver = Object.freeze({
    resolveActiveRoot: vi.fn(async () => root as any),
  });
  const context = testMemberTeamContext({
    rootTeamRunId: "team-1",
    memberAddress: "/professor",
    agentRunId: taskAgentContext?.taskAgentRunId ?? "run-professor",
    teamInstruction: "Coordinate as a team.",
    deliverInterAgentMessage: sendMessageToEnabled ? deliverInterAgentMessage : null,
    taskRootResolver,
  });
  return context;
};

describe("AutoByteusAgentRunBackendFactory", () => {
  const toolRegistrySnapshot = defaultToolRegistry.snapshot();

  beforeEach(() => {
    defaultToolRegistry.clear();
    registerTools();
    registerAgentCommunicationTools();
    defaultToolRegistry.registerTool(createToolDefinition(AssignTaskTool, ToolCategory.TASK_MANAGEMENT));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    defaultToolRegistry.restore(toolRegistrySnapshot);
  });

  it("passes raw run llmConfig to LLMFactory without wrapping it as extraParams", async () => {
    const createLLM = vi.fn(async () =>
      new DummyLLM(
        new LLMModel({
          name: "dummy-model",
          value: "dummy-model",
          canonicalName: "dummy-model",
          provider: LLMProvider.OPENAI,
        }),
        new LLMConfig(),
      ),
    );
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
          }),
        ),
      } as any,
      createLLM,
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });
    const rawLlmConfig = {
      temperature: 0.2,
      provider_specific_flag: "kept",
    };

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        llmConfig: rawLlmConfig,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      "run-professor",
    );

    expect(createLLM).toHaveBeenCalledWith("dummy-model", rawLlmConfig);
    expect(createLLM.mock.calls[0]?.[1]).toBe(rawLlmConfig);
    expect(createLLM.mock.calls[0]?.[1]).not.toBeInstanceOf(LLMConfig);
    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
    ]);
  });

  it("composes the selected application-owned tool through the real AutoByteus provider factory", async () => {
    const applicationToolName = "read_application_state";
    const route = Object.freeze({
      kind: "application_agent_tool" as const,
      identity: Object.freeze({
        applicationId: "app-a",
        bindingId: "binding-a",
        producer: Object.freeze({ kind: "agent" as const, agentRunId: "run-professor" }),
      }),
      declarationSnapshot: Object.freeze({
        declaration: Object.freeze({
          name: applicationToolName,
          description: "Read application state.",
          inputSchema: Object.freeze({
            type: "object" as const,
            properties: Object.freeze({}),
            required: Object.freeze([]),
          }),
        }),
        fingerprint: "application-tool-fingerprint",
      }),
    });
    const invoke = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "application-state" }],
    }));
    const resolveSelectedRoutes = vi.fn(() => new Map([[applicationToolName, route]]));
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () => new AgentDefinition({
          id: "agent-1",
          name: "Professor",
          description: "Reads application state.",
          toolNames: [applicationToolName],
        })),
      } as any,
      applicationAgentTools: {
        resolveSelectedRoutes,
        invoke,
        close: vi.fn(),
      },
      createLLM: vi.fn(async () => new DummyLLM(
        new LLMModel({
          name: "dummy-model",
          value: "dummy-model",
          canonicalName: "dummy-model",
          provider: LLMProvider.OPENAI,
        }),
        new LLMConfig(),
      )),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: { getSkill: () => null } as any,
    });
    const applicationExecutionContext = {
      applicationId: "app-a",
      bindingId: "binding-a",
      producer: { agentRunId: "run-professor", displayName: "Professor" },
    };

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        applicationExecutionContext,
      }),
      "run-professor",
    );

    expect(resolveSelectedRoutes).toHaveBeenCalledWith(expect.objectContaining({
      executionContext: applicationExecutionContext,
      requestedToolNames: expect.arrayContaining([applicationToolName]),
    }));
    expect(built.agentConfig.tools.map((tool: BaseTool) => (tool as any).getName())).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      applicationToolName,
    ]);
    const applicationTool = built.agentConfig.tools.at(-1) as BaseTool;
    await expect(applicationTool.execute({}, {})).resolves.toMatchObject({
      content: [{ type: "text", text: "application-state" }],
    });
    expect(invoke).toHaveBeenCalledWith({ route, arguments: {} });
  });

  it("wires one subject-scoped API-key resolver into the core factory", async () => {
    const llm = new DummyLLM(
      new LLMModel({
        name: "dummy-model",
        value: "dummy-model",
        canonicalName: "dummy-model",
        provider: LLMProvider.OPENAI,
      }),
      new LLMConfig(),
    );
    vi.spyOn(LLMFactory, "listAvailableModels").mockResolvedValue([
      { model_identifier: "dummy-model" },
    ] as any);
    vi.spyOn(LLMFactory, "requiresGeminiRuntimeResolver").mockResolvedValue(false);
    const createLLM = vi.spyOn(LLMFactory, "createLLM").mockResolvedValue(llm);
    const factory = new AutoByteusAgentRunBackendFactory();

    await expect(
      (factory as any).createLLM("dummy-model", { temperature: 0.2 }),
    ).resolves.toBe(llm);
    expect(createLLM).toHaveBeenCalledWith(
      "dummy-model",
      { temperature: 0.2 },
      expect.objectContaining({
        resolve: expect.any(Function),
      }),
      undefined,
    );
  });

  it("filters mixed task-management tools, composes server team prompts, and injects primitive team context", async () => {
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
            toolNames: ["send_message_to", "assign_task_to"],
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext: createMemberTeamContext(TeamBackendKind.MIXED),
      }),
      "run-professor",
    );

    expect(built.agentConfig).toBeInstanceOf(AgentConfig);
    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      "send_message_to",
      "get_handoff_rules",
      "delegate_task",
    ]);
    expect(built.agentConfig.systemPrompt).toContain("## Agent Identity");
    expect(built.agentConfig.systemPrompt).toContain("## Team Instruction");
    expect(built.agentConfig.systemPrompt).toContain("## AgentTeam Addressing");
    expect(built.agentConfig.systemPrompt).toContain("## AgentTeam Collaboration");
    expect(built.agentConfig.systemPrompt).not.toContain("## Team Runtime");
    expect(built.agentConfig.systemPrompt).toContain("## Working Environment");
    expect(built.agentConfig.initialCustomData?.teamContext).toEqual({
      rootTeamRunId: "team-1",
      memberAddress: "/professor",
      agentRunId: "run-professor",
    });
    expect(built.agentConfig.initialCustomData?.teamContext).not.toHaveProperty("members");
    const removedNativeCommunicationField = ["communication", "Context"].join("");
    expect(built.agentConfig.initialCustomData?.teamContext).not.toHaveProperty(removedNativeCommunicationField);
  });

  it("advertises the strict filesystem-like logical protocol without a flat roster", async () => {
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates exact run replies.",
            toolNames: ["send_message_to"],
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext: createMemberTeamContext(
          TeamBackendKind.MIXED,
          vi.fn().mockResolvedValue({ accepted: true }),
          null,
          true,
        ),
      }),
      "run-professor",
    );

    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      "send_message_to",
      "get_handoff_rules",
      "delegate_task",
    ]);
    expect(built.agentConfig.systemPrompt).toContain("filesystem-like logical addresses");
    expect(built.agentConfig.systemPrompt).toContain("\n/professor\n");
    expect(built.agentConfig.systemPrompt).toContain(
      "Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/`",
    );
    expect(built.agentConfig.systemPrompt).toContain(
      "Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.",
    );
    expect(built.agentConfig.systemPrompt).not.toContain("`./architecture_reviewer`");
    const sendMessageTool = built.agentConfig.tools.find(
      (tool: BaseTool) => tool.definition?.name === "send_message_to",
    );
    expect(JSON.stringify(sendMessageTool?.definition)).toContain("target_agent_run_id");
    expect(built.agentConfig.systemPrompt).not.toContain("roster recipients");
  });

  it("keeps task-management tools for standalone AutoByteus runs without member team context", async () => {
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
            toolNames: ["send_message_to", "assign_task_to"],
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      "run-professor",
    );

    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      "send_message_to",
      "assign_task_to",
    ]);
  });

  it("routes mixed AutoByteus send_message_to through server delivery and reports rejected delivery", async () => {
    const deliverInterAgentMessage = vi.fn().mockResolvedValue({
      accepted: false,
      code: "TARGET_MEMBER_NOT_FOUND",
      message: "Writer is unavailable.",
    });
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
            toolNames: ["send_message_to"],
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext: createMemberTeamContext(
          TeamBackendKind.MIXED,
          deliverInterAgentMessage,
        ),
      }),
      "run-professor",
    );

    const sendMessageTool = built.agentConfig.tools.find(
      (tool: BaseTool) => tool.definition?.name === "send_message_to",
    ) as BaseTool<unknown, Record<string, unknown>, string>;

    await expect(
      sendMessageTool.execute({}, {
        recipient_address: "/writer",
        content: "Please investigate.",
        message_type: "direct_message",
        reference_files: ["/tmp/server-reference.md"],
      }),
    ).resolves.toBe('{"accepted":false,"code":"TARGET_MEMBER_NOT_FOUND","message":"Writer is unavailable.","result":null}');
    expect(deliverInterAgentMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        rootTeamRunId: "team-1",
        sender: expect.objectContaining({
          participant: expect.objectContaining({
            kind: "agent",
            displayName: "professor",
            identity: {
              rootTeamRunId: "team-1",
              memberAddress: "/professor",
              agentRunId: "run-professor",
            },
          }),
        }),
        recipientAddress: "/writer",
        content: "Please investigate.",
        messageType: "direct_message",
        referenceFiles: ["/tmp/server-reference.md"],
      }),
    );
  });

  it("keeps the exact-run send_message_to selector on the canonical Team binding", async () => {
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
            toolNames: ["send_message_to"],
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext: createMemberTeamContext(
          TeamBackendKind.MIXED,
          vi.fn().mockResolvedValue({ accepted: true }),
          null,
          true,
        ),
      }),
      "run-professor",
    );

    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      "send_message_to",
      "get_handoff_rules",
      "delegate_task",
    ]);
    expect(built.agentConfig.systemPrompt).not.toContain("For logical Team recipients");
    const sendMessageTool = built.agentConfig.tools.find(
      (tool: BaseTool) => tool.definition?.name === "send_message_to",
    );
    expect(JSON.stringify(sendMessageTool?.definition)).toContain("target_agent_run_id");
  });

  it("binds the exact AutoByteus task Agent identity and root capability into the task tool", async () => {
    const taskAgentContext: TaskAgentContextFacts = {
      taskAgentRunId: "team-1__professor__task_0007",
      taskId: "task_0007",
    };
    const taskRoot = {
      delegateTask: vi.fn(async () => ({
        task_id: "task_0008",
        status: "active" as const,
        target_agent_run_id: "run-reviewer",
      })),
    };
    const taskRootResolver = Object.freeze({
      resolveActiveRoot: vi.fn(async () => taskRoot as any),
    });
    const memberTeamContext = testMemberTeamContext({
      rootTeamRunId: "team-1",
      memberAddress: "/professor",
      agentRunId: taskAgentContext.taskAgentRunId,
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
      taskRootResolver,
    });
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
            toolNames: [
              "send_message_to",
              "submit_task_result",
              "review_task_result",
            ],
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext,
      }),
      "run-professor",
    );

    const managedTeamContext = built.agentConfig.initialCustomData?.teamContext as Record<string, unknown>;
    expect(managedTeamContext).toEqual({
      rootTeamRunId: "team-1",
      memberAddress: "/professor",
      agentRunId: "team-1__professor__task_0007",
    });
    const delegateTask = built.agentConfig.tools.find(
      (tool: BaseTool) => tool.definition?.name === "delegate_task",
    );
    expect(built.agentConfig.tools
      .map((tool: BaseTool) => tool.definition?.name)
      .filter((name: string) => TASK_DELEGATION_TOOL_NAME_LIST.includes(name as never))
      .sort())
      .toEqual([...TASK_DELEGATION_TOOL_NAME_LIST].sort());
    for (const toolName of TASK_DELEGATION_TOOL_NAME_LIST) {
      expect(() => defaultToolRegistry.createTool(toolName)).toThrow(
        "bound taskDelegation ToolConfig",
      );
    }
    expect(delegateTask).toBeDefined();
    await delegateTask!.execute({}, {
      recipient_address: "/reviewer",
      description: "Review the exact task result.",
    });
    expect(taskRootResolver.resolveActiveRoot).toHaveBeenCalledTimes(1);
    expect(taskRoot.delegateTask).toHaveBeenCalledWith(
      {
        identity: {
          rootTeamRunId: "team-1",
          memberAddress: "/professor",
          agentRunId: "team-1__professor__task_0007",
        },
        rootResolver: taskRootResolver,
      },
      {
        recipient_address: "/reviewer",
        description: "Review the exact task result.",
        reference_files: [],
      },
    );
  });

  it("injects a server-backed compaction runner using the parent workspace context", async () => {
    const compactionRunner = { runCompactionTask: vi.fn() };
    const compactionAgentRunnerFactory = vi.fn(() => compactionRunner);
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () =>
          new AgentDefinition({
            id: "agent-1",
            name: "Professor",
            description: "Coordinates work.",
            instructions: "Coordinate.",
          }),
        ),
      } as any,
      createLLM: vi.fn(async () =>
          new DummyLLM(
            new LLMModel({
              name: "dummy-model",
              value: "dummy-model",
              canonicalName: "dummy-model",
              provider: LLMProvider.OPENAI,
            }),
            new LLMConfig(),
          ),
      ),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
      compactionAgentRunnerFactory,
    });

    const built = await (factory as any).buildAgentConfig(
      new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      "run-professor",
    );

    expect(compactionAgentRunnerFactory).toHaveBeenCalledWith({
      agentDefinitionId: "agent-1",
      workspaceRootPath: path.join("/tmp", "workspace-1"),
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "dummy-model",
    });
    expect(built.agentConfig.memoryCompaction).toMatchObject({
      kind: "enabled",
      policy: expect.any(CompactionPolicy),
      runner: compactionRunner,
    });
    expect(built.agentConfig).not.toHaveProperty("compactionAgentRunner");
    expect(built.resolvedRunConfig.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
  });

  it("provisions the canonical Memory Compactor as disabled without creating a runner", async () => {
    const compactionAgentRunnerFactory = vi.fn(() => ({ runCompactionTask: vi.fn() }));
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () => new AgentDefinition({
          id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
          name: "Memory Compactor",
          description: "Compacts one target-agent history.",
          toolNames: [],
        })),
      } as any,
      createLLM: vi.fn(async () => new DummyLLM(
        new LLMModel({
          name: "dummy-model", value: "dummy-model", canonicalName: "dummy-model",
          provider: LLMProvider.OPENAI,
        }),
        new LLMConfig(),
      )),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: { getSkill: () => null } as any,
      compactionAgentRunnerFactory,
    });

    const built = await (factory as any).buildAgentConfig(new AgentRunConfig({
      agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    }), "memory-compactor-run");

    expect(compactionAgentRunnerFactory).not.toHaveBeenCalled();
    expect(built.agentConfig.memoryCompaction).toEqual({ kind: "disabled" });
  });

  it.each([
    ["null result", vi.fn(() => null), /returned no runner/],
    ["thrown failure", vi.fn(() => { throw new Error("runner unavailable"); }), /runner creation failed.*runner unavailable/],
  ])("fails normal-agent composition on a %s without a disabled fallback", async (_label, runnerFactory, errorPattern) => {
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () => new AgentDefinition({
          id: "agent-1",
          name: "Professor",
          description: "Coordinates work.",
        })),
      } as any,
      createLLM: vi.fn(async () => new DummyLLM(
        new LLMModel({
          name: "dummy-model", value: "dummy-model", canonicalName: "dummy-model",
          provider: LLMProvider.OPENAI,
        }),
        new LLMConfig(),
      )),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-1",
          getName: () => "Workspace",
          getBasePath: () => path.join("/tmp", "workspace-1"),
        }),
      } as any,
      skillService: { getSkill: () => null } as any,
      compactionAgentRunnerFactory: runnerFactory,
    });

    await expect((factory as any).buildAgentConfig(new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    }), "normal-run")).rejects.toThrow(errorPattern);
    expect(runnerFactory).toHaveBeenCalledOnce();
  });

});
