import { describe, expect, it, vi } from "vitest";
import type { RuntimeInterAgentRelayRequest } from "../../../src/runtime-execution/runtime-adapter-port.js";
import {
  bindTeamMemberRuntimeRelayHandler,
  TeamMemberRuntimeOrchestrator,
} from "../../../src/agent-team-execution/services/team-member-runtime-orchestrator.js";

const createSubject = () => {
  let relayHandler: ((request: RuntimeInterAgentRelayRequest) => Promise<{
    accepted: boolean;
    code?: string;
    message?: string;
  }>) | null = null;

  const runtimeCompositionService = {
    restoreAgentRun: vi.fn(),
  } as any;
  const runtimeCommandIngressService = {
    sendTurn: vi.fn(),
    approveTool: vi.fn(),
    terminateRun: vi.fn(),
  } as any;
  const relayAdapterUnbind = vi.fn();
  const relayAdapter = {
    bindInterAgentRelayHandler: vi.fn((handler: typeof relayHandler) => {
      relayHandler = handler;
      return relayAdapterUnbind;
    }),
  } as any;
  const runtimeAdapterRegistry = {
    listRuntimeKinds: vi.fn().mockReturnValue(["codex_app_server"]),
    resolveAdapter: vi.fn().mockReturnValue(relayAdapter),
  } as any;
  const teamRuntimeBindingRegistry = {
    getTeamMode: vi.fn(),
    removeTeam: vi.fn(),
    getTeamBindings: vi.fn().mockReturnValue([]),
    getTeamBindingState: vi.fn(),
    upsertTeamBindings: vi.fn(),
    resolveByMemberRunId: vi.fn(),
    resolveMemberBinding: vi.fn(),
  } as any;
  const teamRuntimeInterAgentMessageRelay = {
    deliverInterAgentMessage: vi.fn(),
  } as any;
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn(),
    getWorkspaceById: vi.fn(),
    getOrCreateWorkspace: vi.fn(),
    getOrCreateTempWorkspace: vi.fn(),
  } as any;
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn().mockResolvedValue({
      toolNames: ["send_message_to"],
    }),
  } as any;

  const orchestrator = new TeamMemberRuntimeOrchestrator({
    runtimeCompositionService,
    runtimeCommandIngressService,
    runtimeAdapterRegistry,
    teamRuntimeBindingRegistry,
    teamRuntimeInterAgentMessageRelay,
    workspaceManager,
    agentDefinitionService,
  });

  const unbindRelayHandler = bindTeamMemberRuntimeRelayHandler({
    orchestrator,
    runtimeAdapterRegistry,
  });

  return {
    orchestrator,
    mocks: {
      runtimeCompositionService,
      runtimeCommandIngressService,
      runtimeAdapterRegistry,
      relayAdapter,
      relayAdapterUnbind,
      teamRuntimeBindingRegistry,
      teamRuntimeInterAgentMessageRelay,
      workspaceManager,
      agentDefinitionService,
    },
    unbindRelayHandler,
    invokeHandler: async (request: RuntimeInterAgentRelayRequest) => {
      if (!relayHandler) {
        throw new Error("Expected inter-agent relay handler to be registered.");
      }
      return relayHandler(request);
    },
  };
};

describe("TeamMemberRuntimeOrchestrator", () => {
  it("derives workspaceRootPath from workspaceId when creating member runtime sessions", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.workspaceManager.getWorkspaceById.mockReturnValue({
      getBasePath: () => "/tmp/team-workspace",
    });
    mocks.runtimeCompositionService.restoreAgentRun.mockResolvedValue({
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "member-run-1",
        threadId: "thread-1",
        metadata: null,
      },
    });

    const bindings = await orchestrator.createMemberRuntimeSessions("team-1", [
      {
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "member-run-1",
        runtimeKind: "codex_app_server",
        runtimeReference: null,
        agentDefinitionId: "agent-professor",
        llmModelIdentifier: "gpt-5",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        workspaceRootPath: null,
        llmConfig: null,
      },
    ]);

    expect(mocks.runtimeCompositionService.restoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "member-run-1",
        workspaceId: "workspace-1",
        runtimeReference: expect.objectContaining({
          metadata: expect.objectContaining({
            sendMessageToEnabled: true,
            teamMemberManifest: [
              {
                memberName: "Professor",
                role: null,
                description: null,
              },
            ],
          }),
        }),
      }),
    );
    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.workspaceRootPath).toBe("/tmp/team-workspace");
    expect(mocks.teamRuntimeBindingRegistry.upsertTeamBindings).toHaveBeenCalledWith(
      "team-1",
      "member_runtime",
      expect.arrayContaining([
        expect.objectContaining({
          memberRunId: "member-run-1",
          workspaceRootPath: "/tmp/team-workspace",
        }),
      ]),
    );
    expect(mocks.workspaceManager.getOrCreateWorkspace).not.toHaveBeenCalled();
  });

  it("defaults send_message_to capability to enabled when agent definition has no explicit tool list", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.agentDefinitionService.getAgentDefinitionById.mockResolvedValue({
      toolNames: [],
    });
    mocks.workspaceManager.getWorkspaceById.mockReturnValue({
      getBasePath: () => "/tmp/team-workspace",
    });
    mocks.runtimeCompositionService.restoreAgentRun.mockResolvedValue({
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "member-run-1",
        threadId: "thread-1",
        metadata: null,
      },
    });

    await orchestrator.createMemberRuntimeSessions("team-1", [
      {
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "member-run-1",
        runtimeKind: "codex_app_server",
        runtimeReference: null,
        agentDefinitionId: "agent-professor",
        llmModelIdentifier: "gpt-5",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        workspaceRootPath: null,
        llmConfig: null,
      },
    ]);

    expect(mocks.runtimeCompositionService.restoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeReference: expect.objectContaining({
          metadata: expect.objectContaining({
            sendMessageToEnabled: true,
          }),
        }),
      }),
    );
  });

  it("marks send_message_to capability as disabled when explicit tool allowlist excludes the tool", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.agentDefinitionService.getAgentDefinitionById.mockResolvedValue({
      toolNames: ["run_bash"],
    });
    mocks.workspaceManager.getWorkspaceById.mockReturnValue({
      getBasePath: () => "/tmp/team-workspace",
    });
    mocks.runtimeCompositionService.restoreAgentRun.mockResolvedValue({
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "member-run-1",
        threadId: "thread-1",
        metadata: null,
      },
    });

    await orchestrator.createMemberRuntimeSessions("team-1", [
      {
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "member-run-1",
        runtimeKind: "codex_app_server",
        runtimeReference: null,
        agentDefinitionId: "agent-professor",
        llmModelIdentifier: "gpt-5",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        workspaceRootPath: null,
        llmConfig: null,
      },
    ]);

    expect(mocks.runtimeCompositionService.restoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeReference: expect.objectContaining({
          metadata: expect.objectContaining({
            sendMessageToEnabled: false,
            teamMemberManifest: [
              {
                memberName: "Professor",
                role: null,
                description: null,
              },
            ],
          }),
        }),
      }),
    );
  });

  it("enables send_message_to capability for namespaced tool names in explicit allowlist", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.agentDefinitionService.getAgentDefinitionById.mockResolvedValue({
      toolNames: ["mcp__autobyteus_team__send_message_to"],
    });
    mocks.workspaceManager.getWorkspaceById.mockReturnValue({
      getBasePath: () => "/tmp/team-workspace",
    });
    mocks.runtimeCompositionService.restoreAgentRun.mockResolvedValue({
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "member-run-1",
        threadId: "thread-1",
        metadata: null,
      },
    });

    await orchestrator.createMemberRuntimeSessions("team-1", [
      {
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "member-run-1",
        runtimeKind: "claude_agent_sdk",
        runtimeReference: null,
        agentDefinitionId: "agent-professor",
        llmModelIdentifier: "claude-sonnet-4-5",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        workspaceRootPath: null,
        llmConfig: null,
      },
    ]);

    expect(mocks.runtimeCompositionService.restoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeReference: expect.objectContaining({
          metadata: expect.objectContaining({
            sendMessageToEnabled: true,
          }),
        }),
      }),
    );
  });

  it("returns deterministic error when sender member is not bound", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue(null);

    const result = await orchestrator.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "sender-run-1",
      recipientName: "recipient",
      content: "hello",
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("SENDER_MEMBER_NOT_FOUND");
  });

  it("returns deterministic error when recipient resolution fails", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender",
        memberRouteKey: "sender",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: null,
      code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
      message: "Recipient member was not found.",
    });

    const result = await orchestrator.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "sender-run-1",
      recipientName: "unknown",
      content: "hello",
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RECIPIENT_NOT_FOUND_OR_AMBIGUOUS");
    expect(result.message).toBe("Recipient member was not found.");
  });

  it("delivers normalized inter-agent envelope with deterministic defaults", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender Agent",
        memberRouteKey: "sender",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: true,
    });

    const result = await orchestrator.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "sender-run-1",
      recipientName: "Recipient Agent",
      content: "  hello recipient  ",
      messageType: null,
      senderAgentName: "   ",
    });

    expect(result).toEqual({ accepted: true });
    expect(mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage).toHaveBeenCalledWith({
      teamRunId: "team-1",
      recipientMemberRunId: "recipient-run-1",
      senderAgentRunId: "sender-run-1",
      senderAgentName: "Sender Agent",
      recipientName: "Recipient Agent",
      messageType: "agent_message",
      content: "hello recipient",
      metadata: {
        senderMemberRouteKey: "sender",
        recipientMemberRouteKey: "recipient",
      },
    });
  });

  it("returns deterministic recipient unavailable failure when delivery rejects", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender Agent",
        memberRouteKey: "sender",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: false,
      code: "RECIPIENT_SESSION_UNAVAILABLE",
      message: "Recipient session is unavailable.",
    });

    const result = await orchestrator.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "sender-run-1",
      recipientName: "Recipient Agent",
      content: "hello",
      messageType: "handoff",
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RECIPIENT_SESSION_UNAVAILABLE");
    expect(result.message).toBe("Recipient session is unavailable.");
  });

  it("refreshes member runtime reference after successful send", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "member-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
        runtimeKind: "claude_agent_sdk",
        runtimeReference: {
          runtimeKind: "claude_agent_sdk",
          sessionId: "placeholder-session",
          threadId: null,
          metadata: {
            teamRunId: "team-1",
            memberRouteKey: "professor",
            sendMessageToEnabled: true,
          },
        },
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeBindingRegistry.getTeamBindingState.mockReturnValue({
      teamRunId: "team-1",
      mode: "member_runtime",
      memberBindings: [
        {
          memberRunId: "member-run-1",
          memberName: "Professor",
          memberRouteKey: "professor",
          runtimeKind: "claude_agent_sdk",
          runtimeReference: {
            runtimeKind: "claude_agent_sdk",
            sessionId: "placeholder-session",
            threadId: null,
            metadata: {
              teamRunId: "team-1",
              memberRouteKey: "professor",
              sendMessageToEnabled: true,
            },
          },
          agentDefinitionId: "agent-professor",
          llmModelIdentifier: "claude-sonnet-4-5",
          autoExecuteTools: true,
          llmConfig: null,
          workspaceRootPath: "/tmp/team-workspace",
        },
      ],
    });
    mocks.runtimeCommandIngressService.sendTurn.mockResolvedValue({
      accepted: true,
      runtimeKind: "claude_agent_sdk",
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "claude-session-1",
        threadId: "thread-1",
        metadata: {
          sdkSessionReady: true,
        },
      },
    });

    await orchestrator.sendToMember("team-1", "Professor", { text: "hello professor" } as any);

    expect(mocks.teamRuntimeBindingRegistry.upsertTeamBindings).toHaveBeenCalledWith(
      "team-1",
      "member_runtime",
      [
        expect.objectContaining({
          memberRunId: "member-run-1",
          runtimeReference: {
            runtimeKind: "claude_agent_sdk",
            sessionId: "claude-session-1",
            threadId: "thread-1",
            metadata: {
              teamRunId: "team-1",
              memberRouteKey: "professor",
              sendMessageToEnabled: true,
              sdkSessionReady: true,
            },
          },
        }),
      ],
    );
  });

  it("refreshes member runtime reference after successful approval", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "member-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
        runtimeKind: "codex_app_server",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "member-run-1",
          threadId: "thread-old",
          metadata: {
            teamRunId: "team-1",
          },
        },
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeBindingRegistry.getTeamBindingState.mockReturnValue({
      teamRunId: "team-1",
      mode: "member_runtime",
      memberBindings: [
        {
          memberRunId: "member-run-1",
          memberName: "Professor",
          memberRouteKey: "professor",
          runtimeKind: "codex_app_server",
          runtimeReference: {
            runtimeKind: "codex_app_server",
            sessionId: "member-run-1",
            threadId: "thread-old",
            metadata: {
              teamRunId: "team-1",
            },
          },
          agentDefinitionId: "agent-professor",
          llmModelIdentifier: "gpt-5",
          autoExecuteTools: true,
          llmConfig: null,
          workspaceRootPath: "/tmp/team-workspace",
        },
      ],
    });
    mocks.runtimeCommandIngressService.approveTool.mockResolvedValue({
      accepted: true,
      runtimeKind: "codex_app_server",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "member-run-1",
        threadId: "thread-new",
        metadata: {
          approvalObserved: true,
        },
      },
    });

    await orchestrator.approveForMember("team-1", "Professor", "invoke-1", true, "approved");

    expect(mocks.teamRuntimeBindingRegistry.upsertTeamBindings).toHaveBeenCalledWith(
      "team-1",
      "member_runtime",
      [
        expect.objectContaining({
          memberRunId: "member-run-1",
          runtimeReference: {
            runtimeKind: "codex_app_server",
            sessionId: "member-run-1",
            threadId: "thread-new",
            metadata: {
              teamRunId: "team-1",
              approvalObserved: true,
            },
          },
        }),
      ],
    );
  });

  it("registers runtime relay handler and routes send_message_to tool arguments", async () => {
    const { mocks, invokeHandler, unbindRelayHandler } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender Agent",
        memberRouteKey: "sender",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: true,
    });

    const result = await invokeHandler({
      senderRunId: "sender-run-1",
      senderTeamRunId: null,
      senderMemberName: "Sender Agent",
      toolArguments: {
        recipient_name: "Recipient Agent",
        content: "hello from tool",
      },
    });

    expect(mocks.relayAdapter.bindInterAgentRelayHandler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ accepted: true });
    expect(mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage).toHaveBeenCalledTimes(1);

    unbindRelayHandler();
    expect(mocks.relayAdapterUnbind).toHaveBeenCalledTimes(1);
  });
});
