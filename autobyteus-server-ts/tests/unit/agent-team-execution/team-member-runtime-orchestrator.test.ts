import { describe, expect, it, vi } from "vitest";
import type { CodexInterAgentRelayRequest } from "../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import {
  bindTeamMemberRuntimeRelayHandler,
  TeamMemberRuntimeOrchestrator,
} from "../../../src/agent-team-execution/services/team-member-runtime-orchestrator.js";

const createSubject = () => {
  let relayHandler: ((request: CodexInterAgentRelayRequest) => Promise<{
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
  const teamRuntimeBindingRegistry = {
    getTeamMode: vi.fn(),
    removeTeam: vi.fn(),
    getTeamBindings: vi.fn().mockReturnValue([]),
    upsertTeamBindings: vi.fn(),
    resolveByMemberRunId: vi.fn(),
    resolveMemberBinding: vi.fn(),
  } as any;
  const teamCodexInterAgentMessageRelay = {
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
    teamRuntimeBindingRegistry,
    teamCodexInterAgentMessageRelay,
    workspaceManager,
    agentDefinitionService,
  });

  const codexRuntimeService = {
    setInterAgentRelayHandler: vi.fn((handler: typeof relayHandler) => {
      relayHandler = handler;
    }),
  } as any;
  const unbindRelayHandler = bindTeamMemberRuntimeRelayHandler({
    orchestrator,
    codexRuntimeService,
  });

  return {
    orchestrator,
    mocks: {
      runtimeCompositionService,
      teamRuntimeBindingRegistry,
      teamCodexInterAgentMessageRelay,
      workspaceManager,
      agentDefinitionService,
      codexRuntimeService,
    },
    unbindRelayHandler,
    invokeHandler: async (request: CodexInterAgentRelayRequest) => {
      if (!relayHandler) {
        throw new Error("Expected inter-agent relay handler to be registered.");
      }
      return relayHandler(request);
    },
  };
};

describe("TeamMemberRuntimeOrchestrator", () => {
  it("derives workspaceRootPath from workspaceId when creating codex member sessions", async () => {
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

    const bindings = await orchestrator.createCodexMemberSessions("team-1", [
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
      "external_member_runtime",
      expect.arrayContaining([
        expect.objectContaining({
          memberRunId: "member-run-1",
          workspaceRootPath: "/tmp/team-workspace",
        }),
      ]),
    );
    expect(mocks.workspaceManager.getOrCreateWorkspace).not.toHaveBeenCalled();
  });

  it("marks send_message_to capability as disabled when agent definition does not configure the tool", async () => {
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

    await orchestrator.createCodexMemberSessions("team-1", [
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
        runtimeKind: "codex_app_server",
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
        runtimeKind: "codex_app_server",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
        runtimeKind: "codex_app_server",
      },
      code: null,
      message: null,
    });
    mocks.teamCodexInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
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
    expect(mocks.teamCodexInterAgentMessageRelay.deliverInterAgentMessage).toHaveBeenCalledWith({
      teamRunId: "team-1",
      recipientMemberRunId: "recipient-run-1",
      senderAgentId: "sender-run-1",
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
        runtimeKind: "codex_app_server",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
        runtimeKind: "codex_app_server",
      },
      code: null,
      message: null,
    });
    mocks.teamCodexInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
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

  it("registers codex relay handler and routes send_message_to tool arguments", async () => {
    const { mocks, invokeHandler, unbindRelayHandler } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender Agent",
        memberRouteKey: "sender",
        runtimeKind: "codex_app_server",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
        runtimeKind: "codex_app_server",
      },
      code: null,
      message: null,
    });
    mocks.teamCodexInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
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

    expect(mocks.codexRuntimeService.setInterAgentRelayHandler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ accepted: true });
    expect(mocks.teamCodexInterAgentMessageRelay.deliverInterAgentMessage).toHaveBeenCalledTimes(1);

    unbindRelayHandler();
    expect(mocks.codexRuntimeService.setInterAgentRelayHandler).toHaveBeenLastCalledWith(null);
  });
});
