import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentConfig, LLMFactory } from "autobyteus-ts";
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
import { MemberTeamContext } from "../../../../../src/agent-team-execution/domain/member-team-context.js";
import type { TaskAgentInstanceIdentity } from "../../../../../src/agent-team-execution/domain/task-agent-instance.js";
import { TeamBackendKind } from "../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildTaskDelegationToolContextFromNativeContext } from "../../../../../src/agent-tools/task-delegation/task-delegation-autobyteus-context.js";
import { registerAgentCommunicationTools } from "../../../../../src/agent-tools/agent-communication/register-agent-communication-tools.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";

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

const createMemberTeamContext = (
  teamBackendKind: TeamBackendKind,
  deliverInterAgentMessage: ReturnType<typeof vi.fn> = vi
    .fn()
    .mockResolvedValue({ accepted: true }),
  taskAgentInstance: TaskAgentInstanceIdentity | null = null,
  sendMessageToEnabled = true,
  overrides: {
    communicationRecipients?: [];
    allowedRecipientNames?: string[];
  } = {},
) =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamBackendKind,
    memberName: "Professor",
    memberPath: ["professor"],
    memberRouteKey: "professor",
    memberRunId: taskAgentInstance?.taskAgentRunId ?? "run-professor",
    teamInstruction: "Coordinate as a team.",
    members: [
      {
        memberKind: "agent",
        memberName: "Professor",
        memberPath: ["professor"],
        memberRouteKey: "professor",
        memberRunId: "run-professor",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        role: "lead",
        description: "Leads the work.",
      },
      {
        memberKind: "agent",
        memberName: "Writer",
        memberPath: ["writer"],
        memberRouteKey: "writer",
        memberRunId: "run-writer",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        role: "writer",
        description: "Drafts the answer.",
      },
    ],
    communicationRecipients: overrides.communicationRecipients ?? [
      {
        recipientName: "Writer",
        scope: "local_agent",
        participant: {
          memberKind: "agent",
          memberName: "Writer",
          memberPath: ["writer"],
          memberRouteKey: "writer",
          memberRunId: "run-writer",
          address: {
            teamRunId: "team-1",
            memberPath: ["writer"],
            memberRouteKey: "writer",
          },
          platformRunId: null,
          teamDefinitionId: null,
          representedSubTeam: null,
        },
        delivery: {
          teamRunId: "team-1",
          selector: { kind: "route_key", memberRouteKey: "writer" },
        },
        role: "writer",
        description: "Drafts the answer.",
      },
    ],
    allowedRecipientNames: overrides.allowedRecipientNames ?? ["Writer"],
    sendMessageToEnabled,
    deliverInterAgentMessage,
    taskAgentInstance,
  });

describe("AutoByteusAgentRunBackendFactory", () => {
  const toolRegistrySnapshot = defaultToolRegistry.snapshot();

  beforeEach(() => {
    defaultToolRegistry.clear();
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

    await (factory as any).buildAgentConfig(
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
    const createLLM = vi.spyOn(LLMFactory, "createLLM").mockResolvedValue(llm);
    const factory = new AutoByteusAgentRunBackendFactory();

    await expect(
      (factory as any).createLLM("dummy-model", { temperature: 0.2 }),
    ).resolves.toBe(llm);
    expect(createLLM).toHaveBeenCalledWith(
      "dummy-model",
      { temperature: 0.2 },
      expect.objectContaining({
        getStatus: expect.any(Function),
        resolve: expect.any(Function),
      }),
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
      "send_message_to",
    ]);
    expect(built.agentConfig.systemPrompt).toContain("## Team Instruction");
    expect(built.agentConfig.systemPrompt).toContain("## Agent Instruction");
    expect(built.agentConfig.systemPrompt).toContain("## Runtime Instruction");
    expect(built.agentConfig.initialCustomData?.teamContext).toEqual(
      expect.objectContaining({
        teamRunId: "team-1",
        currentMemberName: "Professor",
        members: expect.arrayContaining([
          expect.objectContaining({ memberName: "Writer", memberRunId: "run-writer" }),
        ]),
      }),
    );
    const removedNativeCommunicationField = ["communication", "Context"].join("");
    expect(built.agentConfig.initialCustomData?.teamContext).not.toHaveProperty(removedNativeCommunicationField);
  });

  it("advertises mixed AutoByteus send_message_to when only exact-run targets are available", async () => {
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
          { communicationRecipients: [], allowedRecipientNames: [] },
        ),
      }),
      "run-professor",
    );

    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "send_message_to",
    ]);
    expect(built.agentConfig.systemPrompt).toContain(
      "No logical `recipient_name` roster recipients are currently listed for this run.",
    );
    expect(built.agentConfig.systemPrompt).toContain("Set `target_agent_run_id`");
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

    const sendMessageTool = built.agentConfig.tools[0] as BaseTool<unknown, Record<string, unknown>, string>;

    await expect(
      sendMessageTool.execute({}, {
        recipient_name: "Writer",
        content: "Please investigate.",
        message_type: "direct_message",
        reference_files: ["/tmp/server-reference.md"],
      }),
    ).resolves.toBe("Error: Writer is unavailable.");
    expect(deliverInterAgentMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: expect.objectContaining({
          participant: expect.objectContaining({
            memberName: "Professor",
            memberRunId: "run-professor",
          }),
        }),
        target: expect.objectContaining({
          kind: "recipient_name",
          recipientName: "Writer",
        }),
        content: "Please investigate.",
        messageType: "direct_message",
        referenceFiles: ["/tmp/server-reference.md"],
      }),
    );
  });

  it("advertises exact-run send_message_to while warning that recipient_name delivery is disabled", async () => {
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
          false,
        ),
      }),
      "run-professor",
    );

    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "send_message_to",
    ]);
    expect(built.agentConfig.systemPrompt).toContain(
      "Do not set `recipient_name` from this run; it requires an active team member context with Team Communication enabled.",
    );
    expect(built.agentConfig.systemPrompt).toContain("Set `target_agent_run_id`");
  });

  it("propagates mixed AutoByteus task-agent identity into managed custom data and task delegation context", async () => {
    const taskAgentInstance: TaskAgentInstanceIdentity = {
      taskAgentInstanceId: "task_agent_task_0007",
      taskAgentRunId: "team-1__professor__task_0007",
      teamRunId: "team-1",
      taskId: "task_0007",
      logicalMember: {
        memberName: "Professor",
        memberPath: ["professor"],
        memberRouteKey: "professor",
        templateMemberRunId: "run-professor",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      },
      createdAt: "2026-05-29T00:00:00.000Z",
    };
    const memberTeamContext = createMemberTeamContext(
      TeamBackendKind.MIXED,
      vi.fn().mockResolvedValue({ accepted: true }),
      taskAgentInstance,
    );
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
        memberTeamContext,
      }),
      "run-professor",
    );

    const managedTeamContext = built.agentConfig.initialCustomData?.teamContext as Record<string, unknown>;
    expect(managedTeamContext).toMatchObject({
      currentMemberName: "Professor",
      currentMemberRouteKey: "professor",
      currentMemberRunId: "team-1__professor__task_0007",
      taskAgentInstanceId: "task_agent_task_0007",
      taskAgentRunId: "team-1__professor__task_0007",
      taskId: "task_0007",
      logicalMemberRouteKey: "professor",
    });

    const delegationContext = buildTaskDelegationToolContextFromNativeContext({
      config: { name: "Professor" },
      customData: { teamContext: managedTeamContext },
    });

    expect(delegationContext.caller).toMatchObject({
      memberName: "Professor",
      memberRouteKey: "professor",
      memberRunId: "team-1__professor__task_0007",
      taskAgentInstanceId: "task_agent_task_0007",
      taskAgentRunId: "team-1__professor__task_0007",
      taskId: "task_0007",
      logicalMemberRouteKey: "professor",
    });
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
    expect(built.agentConfig.compactionAgentRunner).toBe(compactionRunner);
    expect(built.resolvedRunConfig.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
  });

});
