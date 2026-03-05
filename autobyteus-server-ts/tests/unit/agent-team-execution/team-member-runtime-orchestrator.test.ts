import { describe, expect, it, vi } from "vitest";
import type { CodexInterAgentRelayRequest } from "../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import type { ClaudeInterAgentRelayRequest } from "../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";
import {
  bindTeamMemberRuntimeRelayHandler,
  TeamMemberRuntimeOrchestrator,
} from "../../../src/agent-team-execution/services/team-member-runtime-orchestrator.js";

const createSubject = () => {
  let codexRelayHandler: ((request: CodexInterAgentRelayRequest) => Promise<{
    accepted: boolean;
    code?: string;
    message?: string;
  }>) | null = null;
  let claudeRelayHandler: ((request: ClaudeInterAgentRelayRequest) => Promise<{
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
    relayInterAgentMessage: vi.fn(),
  } as any;
  const teamRuntimeBindingRegistry = {
    getTeamMode: vi.fn(),
    removeTeam: vi.fn(),
    getTeamBindings: vi.fn().mockReturnValue([]),
    getTeamBindingState: vi.fn().mockReturnValue(null),
    upsertTeamBindings: vi.fn(),
    resolveByMemberRunId: vi.fn(),
    resolveMemberBinding: vi.fn(),
  } as any;
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn(),
    getWorkspaceById: vi.fn(),
    getOrCreateWorkspace: vi.fn(),
    getOrCreateTempWorkspace: vi.fn(),
  } as any;
  const claudeRuntimeReferenceService = {
    getRunRuntimeReference: vi.fn(),
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
    workspaceManager,
    agentDefinitionService,
    claudeRuntimeService: claudeRuntimeReferenceService,
  });

  const codexRuntimeService = {
    setInterAgentRelayHandler: vi.fn((handler: typeof codexRelayHandler) => {
      codexRelayHandler = handler;
    }),
  } as any;
  const claudeRelayRuntimeService = {
    setInterAgentRelayHandler: vi.fn((handler: typeof claudeRelayHandler) => {
      claudeRelayHandler = handler;
    }),
  } as any;
  const unbindRelayHandler = bindTeamMemberRuntimeRelayHandler({
    orchestrator,
    codexRuntimeService,
    claudeRuntimeService: claudeRelayRuntimeService,
  });

  return {
    orchestrator,
    mocks: {
      runtimeCompositionService,
      runtimeCommandIngressService,
      teamRuntimeBindingRegistry,
      workspaceManager,
      claudeRuntimeReferenceService,
      agentDefinitionService,
      codexRuntimeService,
      claudeRuntimeService: claudeRelayRuntimeService,
    },
    unbindRelayHandler,
    invokeCodexHandler: async (request: CodexInterAgentRelayRequest) => {
      if (!codexRelayHandler) {
        throw new Error("Expected codex inter-agent relay handler to be registered.");
      }
      return codexRelayHandler(request);
    },
    invokeClaudeHandler: async (request: ClaudeInterAgentRelayRequest) => {
      if (!claudeRelayHandler) {
        throw new Error("Expected Claude inter-agent relay handler to be registered.");
      }
      return claudeRelayHandler(request);
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

  it("enables send_message_to capability by default for team member sessions", async () => {
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
  });

  it("supports explicit runtime-metadata disable for send_message_to capability", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.agentDefinitionService.getAgentDefinitionById.mockResolvedValue({
      toolNames: ["send_message_to"],
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
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "member-run-1",
          threadId: "thread-1",
          metadata: {
            send_message_to_explicitly_disabled: true,
          },
        },
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

  it("delivers normalized inter-agent envelope through runtime ingress with deterministic defaults", async () => {
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
    mocks.runtimeCommandIngressService.relayInterAgentMessage.mockResolvedValue({
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
    expect(mocks.runtimeCommandIngressService.relayInterAgentMessage).toHaveBeenCalledWith({
      runId: "recipient-run-1",
      envelope: {
        senderAgentRunId: "sender-run-1",
        senderAgentName: "Sender Agent",
        recipientName: "Recipient Agent",
        messageType: "agent_message",
        content: "hello recipient",
        teamRunId: "team-1",
        metadata: {
          senderMemberRouteKey: "sender",
          recipientMemberRouteKey: "recipient",
        },
      },
    });
  });

  it("updates recipient runtime reference after successful inter-agent relay", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender Agent",
        memberRouteKey: "sender",
        runtimeKind: "claude_agent_sdk",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
        runtimeKind: "claude_agent_sdk",
        runtimeReference: {
          runtimeKind: "claude_agent_sdk",
          sessionId: "recipient-run-1",
          threadId: null,
          metadata: { teamRunId: "team-1" },
        },
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeBindingRegistry.getTeamBindingState.mockReturnValue({
      teamRunId: "team-1",
      mode: "external_member_runtime",
      memberBindings: [
        {
          memberRunId: "sender-run-1",
          memberName: "Sender Agent",
          memberRouteKey: "sender",
          runtimeKind: "claude_agent_sdk",
          runtimeReference: null,
        },
        {
          memberRunId: "recipient-run-1",
          memberName: "Recipient Agent",
          memberRouteKey: "recipient",
          runtimeKind: "claude_agent_sdk",
          runtimeReference: {
            runtimeKind: "claude_agent_sdk",
            sessionId: "recipient-run-1",
            threadId: null,
            metadata: { teamRunId: "team-1" },
          },
        },
      ],
    });
    mocks.runtimeCommandIngressService.relayInterAgentMessage.mockResolvedValue({
      accepted: true,
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "claude-session-recipient",
        threadId: "claude-session-recipient",
        metadata: { model: "claude-opus-4-1" },
      },
    });

    const result = await orchestrator.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "sender-run-1",
      recipientName: "Recipient Agent",
      content: "hello relay",
    });

    expect(result).toEqual({ accepted: true });
    expect(mocks.teamRuntimeBindingRegistry.upsertTeamBindings).toHaveBeenCalledWith(
      "team-1",
      "external_member_runtime",
      expect.arrayContaining([
        expect.objectContaining({
          memberRunId: "recipient-run-1",
          runtimeReference: expect.objectContaining({
            sessionId: "claude-session-recipient",
            threadId: "claude-session-recipient",
            metadata: expect.objectContaining({
              teamRunId: "team-1",
              model: "claude-opus-4-1",
            }),
          }),
        }),
      ]),
    );
  });

  it("returns binding snapshot on external termination and removes registry team state", async () => {
    const { orchestrator, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.getTeamBindings.mockReturnValue([
      {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
        runtimeKind: "claude_agent_sdk",
        runtimeReference: {
          runtimeKind: "claude_agent_sdk",
          sessionId: "recipient-run-1",
          threadId: null,
          metadata: { teamRunId: "team-1" },
        },
      },
    ]);
    mocks.teamRuntimeBindingRegistry.getTeamBindingState.mockReturnValue({
      teamRunId: "team-1",
      mode: "external_member_runtime",
      memberBindings: [
        {
          memberRunId: "recipient-run-1",
          memberName: "Recipient Agent",
          memberRouteKey: "recipient",
          runtimeKind: "claude_agent_sdk",
          runtimeReference: {
            runtimeKind: "claude_agent_sdk",
            sessionId: "recipient-run-1",
            threadId: null,
            metadata: { teamRunId: "team-1" },
          },
        },
      ],
    });
    mocks.claudeRuntimeReferenceService.getRunRuntimeReference.mockReturnValue({
      sessionId: "claude-session-final",
      metadata: { model: "claude-opus-4-1" },
    });
    mocks.runtimeCommandIngressService.terminateRun.mockResolvedValue({ accepted: true });

    const result = await orchestrator.terminateExternalTeamRunSessionsWithSnapshot("team-1");

    expect(result.terminated).toBe(true);
    expect(result.memberBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberRunId: "recipient-run-1",
          runtimeReference: expect.objectContaining({
            sessionId: "claude-session-final",
            metadata: expect.objectContaining({
              teamRunId: "team-1",
              model: "claude-opus-4-1",
            }),
          }),
        }),
      ]),
    );
    expect(mocks.teamRuntimeBindingRegistry.removeTeam).toHaveBeenCalledWith("team-1");
  });

  it("returns deterministic recipient unavailable failure when runtime ingress relay rejects", async () => {
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
    mocks.runtimeCommandIngressService.relayInterAgentMessage.mockResolvedValue({
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
    const { mocks, invokeCodexHandler, unbindRelayHandler } = createSubject();
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
    mocks.runtimeCommandIngressService.relayInterAgentMessage.mockResolvedValue({
      accepted: true,
    });

    const result = await invokeCodexHandler({
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
    expect(mocks.runtimeCommandIngressService.relayInterAgentMessage).toHaveBeenCalledTimes(1);

    unbindRelayHandler();
    expect(mocks.codexRuntimeService.setInterAgentRelayHandler).toHaveBeenLastCalledWith(null);
    expect(mocks.claudeRuntimeService.setInterAgentRelayHandler).toHaveBeenLastCalledWith(null);
  });

  it("registers Claude relay handler and routes send_message_to tool arguments", async () => {
    const { mocks, invokeClaudeHandler } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "sender-run-1",
        memberName: "Sender Agent",
        memberRouteKey: "sender",
        runtimeKind: "claude_agent_sdk",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "recipient-run-1",
        memberName: "Recipient Agent",
        memberRouteKey: "recipient",
        runtimeKind: "claude_agent_sdk",
      },
      code: null,
      message: null,
    });
    mocks.runtimeCommandIngressService.relayInterAgentMessage.mockResolvedValue({
      accepted: true,
    });

    const result = await invokeClaudeHandler({
      senderRunId: "sender-run-1",
      senderTeamRunId: "team-1",
      senderMemberName: "Sender Agent",
      toolArguments: {
        recipient_name: "Recipient Agent",
        content: "hello from Claude tool",
        message_type: "agent_message",
      },
    });

    expect(mocks.claudeRuntimeService.setInterAgentRelayHandler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ accepted: true });
    expect(mocks.runtimeCommandIngressService.relayInterAgentMessage).toHaveBeenCalledWith({
      runId: "recipient-run-1",
      envelope: expect.objectContaining({
        senderAgentRunId: "sender-run-1",
        senderAgentName: "Sender Agent",
        recipientName: "Recipient Agent",
        content: "hello from Claude tool",
      }),
    });
  });
});
