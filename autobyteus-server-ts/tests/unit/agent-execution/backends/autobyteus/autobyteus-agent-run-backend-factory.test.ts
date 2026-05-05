import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentConfig } from "autobyteus-ts";
import { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamManifestInjectorProcessor } from "autobyteus-ts/agent-team/system-prompt-processor/team-manifest-injector-processor.js";
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
import { TeamBackendKind } from "../../../../../src/agent-team-execution/domain/team-backend-kind.js";
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

class SendMessageTool extends DummyTool {
  static override TOOL_NAME = "send_message_to";
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
) =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamBackendKind,
    memberName: "Professor",
    memberRouteKey: "professor",
    memberRunId: "run-professor",
    members: [
      {
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "run-professor",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        role: "lead",
        description: "Leads the work.",
      },
      {
        memberName: "Writer",
        memberRouteKey: "writer",
        memberRunId: "run-writer",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        role: "writer",
        description: "Drafts the answer.",
      },
    ],
    allowedRecipientNames: ["Writer"],
    sendMessageToEnabled: true,
    deliverInterAgentMessage,
  });

describe("AutoByteusAgentRunBackendFactory", () => {
  const toolRegistrySnapshot = defaultToolRegistry.snapshot();

  beforeEach(() => {
    defaultToolRegistry.clear();
    defaultToolRegistry.registerTool(createToolDefinition(SendMessageTool, ToolCategory.AGENT_COMMUNICATION));
    defaultToolRegistry.registerTool(createToolDefinition(AssignTaskTool, ToolCategory.TASK_MANAGEMENT));
  });

  afterEach(() => {
    defaultToolRegistry.restore(toolRegistrySnapshot);
  });

  it("filters mixed task-management tools, injects communication context, and ensures team manifest injection", async () => {
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
      llmFactory: {
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
      } as any,
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
    );

    expect(built.agentConfig).toBeInstanceOf(AgentConfig);
    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "send_message_to",
    ]);
    expect(
      built.agentConfig.systemPromptProcessors.some(
        (processor: unknown) => processor instanceof TeamManifestInjectorProcessor,
      ),
    ).toBe(true);
    expect(built.agentConfig.initialCustomData?.teamContext).toEqual(
      expect.objectContaining({
        teamRunId: "team-1",
        currentMemberName: "Professor",
        communicationContext: expect.objectContaining({
          members: expect.arrayContaining([
            expect.objectContaining({ memberName: "Professor", agentId: "run-professor" }),
            expect.objectContaining({ memberName: "Writer", agentId: "run-writer" }),
          ]),
        }),
      }),
    );
  });

  it("keeps task-management tools for non-mixed standalone team contexts", async () => {
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
      llmFactory: {
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
      } as any,
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
        memberTeamContext: createMemberTeamContext(TeamBackendKind.AUTOBYTEUS),
      }),
    );

    expect(built.agentConfig.tools.map((tool: BaseTool) => tool.definition?.name)).toEqual([
      "send_message_to",
      "assign_task_to",
    ]);
  });

  it("rejects mixed standalone send_message_to dispatch when delivery is rejected", async () => {
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
      llmFactory: {
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
      } as any,
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
    );

    const teamContext = built.agentConfig.initialCustomData?.teamContext as {
      communicationContext: {
        dispatchInterAgentMessageRequest: (event: InterAgentMessageRequestEvent) => Promise<void>;
      };
    };

    await expect(
      teamContext.communicationContext.dispatchInterAgentMessageRequest(
        new InterAgentMessageRequestEvent(
          "run-professor",
          "Writer",
          "Please investigate.",
          "direct_message",
          ["/tmp/native-reference.md"],
        ),
      ),
    ).rejects.toThrow("Writer is unavailable.");
    expect(deliverInterAgentMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        senderRunId: "run-professor",
        senderMemberName: "Professor",
        recipientMemberName: "Writer",
        content: "Please investigate.",
        messageType: "direct_message",
        referenceFiles: ["/tmp/native-reference.md"],
      }),
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
      llmFactory: {
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
      } as any,
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
    );

    expect(compactionAgentRunnerFactory).toHaveBeenCalledWith({
      agentDefinitionId: "agent-1",
      workspaceRootPath: path.join("/tmp", "workspace-1"),
    });
    expect(built.agentConfig.compactionAgentRunner).toBe(compactionRunner);
  });

});
