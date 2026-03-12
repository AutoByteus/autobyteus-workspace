import { describe, expect, it, vi } from "vitest";
import { TeamMemberRuntimeRelayService } from "../../../src/agent-team-execution/services/team-member-runtime-relay-service.js";

const createSubject = () => {
  const teamRuntimeBindingRegistry = {
    resolveByMemberRunId: vi.fn(),
    resolveMemberBinding: vi.fn(),
    isCoordinatorMemberRunId: vi.fn(),
  } as any;
  const teamRuntimeInterAgentMessageRelay = {
    deliverInterAgentMessage: vi.fn(),
  } as any;
  const externalCallbackPropagation = {
    getLatestSourceByDispatchTarget: vi.fn(),
    getSourceByAgentRunTurn: vi.fn(),
    bindAcceptedTurnToSource: vi.fn(),
  };

  const service = new TeamMemberRuntimeRelayService(
    teamRuntimeBindingRegistry,
    teamRuntimeInterAgentMessageRelay,
    externalCallbackPropagation,
  );

  return {
    service,
    mocks: {
      teamRuntimeBindingRegistry,
      teamRuntimeInterAgentMessageRelay,
      externalCallbackPropagation,
    },
  };
};

describe("TeamMemberRuntimeRelayService", () => {
  it("propagates externally bound sender turns onto accepted recipient turns", async () => {
    const { service, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "student-run-1",
        memberName: "Student",
        memberRouteKey: "student",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "professor-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
        runtimeKind: "codex_app_server",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: true,
      runtimeKind: "codex_app_server",
      turnId: "turn-professor-2",
    });
    mocks.teamRuntimeBindingRegistry.isCoordinatorMemberRunId.mockReturnValue(true);
    const source = {
      provider: "telegram",
      transport: "business_api",
      accountId: "autobyteus",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "update:1",
      receivedAt: new Date("2026-03-11T11:00:00.000Z"),
    };
    mocks.externalCallbackPropagation.getSourceByAgentRunTurn.mockResolvedValue(source);

    const result = await service.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "student-run-1",
      senderTurnId: "turn-student-1",
      recipientName: "Professor",
      content: "Here is my answer.",
      messageType: "agent_message",
    });

    expect(result).toEqual({ accepted: true });
    expect(mocks.externalCallbackPropagation.getSourceByAgentRunTurn).toHaveBeenCalledWith(
      "student-run-1",
      "turn-student-1",
    );
    expect(mocks.externalCallbackPropagation.bindAcceptedTurnToSource).toHaveBeenCalledWith({
      runId: "professor-run-1",
      runtimeKind: "codex_app_server",
      turnId: "turn-professor-2",
      teamRunId: "team-1",
      source,
    });
  });

  it("skips callback propagation when the sender turn has no external source", async () => {
    const { service, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "student-run-1",
        memberName: "Student",
        memberRouteKey: "student",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "professor-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
        runtimeKind: "claude_agent_sdk",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: true,
      runtimeKind: "claude_agent_sdk",
      turnId: "turn-professor-2",
    });
    mocks.teamRuntimeBindingRegistry.isCoordinatorMemberRunId.mockReturnValue(true);
    mocks.externalCallbackPropagation.getSourceByAgentRunTurn.mockResolvedValue(null);
    mocks.externalCallbackPropagation.getLatestSourceByDispatchTarget.mockResolvedValue(null);

    const result = await service.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "student-run-1",
      senderTurnId: "turn-student-1",
      recipientName: "Professor",
      content: "Here is my answer.",
    });

    expect(result).toEqual({ accepted: true });
    expect(mocks.externalCallbackPropagation.bindAcceptedTurnToSource).not.toHaveBeenCalled();
  });

  it("falls back to the latest team source when relaying back to the coordinator", async () => {
    const { service, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "student-run-1",
        memberName: "Student",
        memberRouteKey: "student",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "professor-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
        runtimeKind: "claude_agent_sdk",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeBindingRegistry.isCoordinatorMemberRunId.mockReturnValue(true);
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: true,
      runtimeKind: "claude_agent_sdk",
      turnId: "turn-professor-2",
    });
    const latestSource = {
      provider: "telegram",
      transport: "business_api",
      accountId: "autobyteus",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "update:1",
      receivedAt: new Date("2026-03-11T11:00:00.000Z"),
    };
    mocks.externalCallbackPropagation.getSourceByAgentRunTurn.mockResolvedValue(null);
    mocks.externalCallbackPropagation.getLatestSourceByDispatchTarget.mockResolvedValue(
      latestSource,
    );

    const result = await service.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "student-run-1",
      senderTurnId: "turn-student-1",
      recipientName: "Professor",
      content: "Here is my answer.",
    });

    expect(result).toEqual({ accepted: true });
    expect(mocks.externalCallbackPropagation.getSourceByAgentRunTurn).toHaveBeenCalledWith(
      "student-run-1",
      "turn-student-1",
    );
    expect(
      mocks.externalCallbackPropagation.getLatestSourceByDispatchTarget,
    ).toHaveBeenCalledWith({
      agentRunId: null,
      teamRunId: "team-1",
    });
    expect(mocks.externalCallbackPropagation.bindAcceptedTurnToSource).toHaveBeenCalledWith({
      runId: "professor-run-1",
      runtimeKind: "claude_agent_sdk",
      turnId: "turn-professor-2",
      teamRunId: "team-1",
      source: latestSource,
    });
  });

  it("does not propagate callback context onto delegated non-coordinator member turns", async () => {
    const { service, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "professor-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "student-run-1",
        memberName: "Student",
        memberRouteKey: "student",
        runtimeKind: "codex_app_server",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeBindingRegistry.isCoordinatorMemberRunId.mockReturnValue(false);
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: true,
      runtimeKind: "codex_app_server",
      turnId: "turn-student-2",
    });

    const result = await service.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "professor-run-1",
      senderTurnId: "turn-professor-1",
      recipientName: "Student",
      content: "Please solve this.",
    });

    expect(result).toEqual({ accepted: true });
    expect(mocks.externalCallbackPropagation.getSourceByAgentRunTurn).not.toHaveBeenCalled();
    expect(
      mocks.externalCallbackPropagation.getLatestSourceByDispatchTarget,
    ).not.toHaveBeenCalled();
    expect(mocks.externalCallbackPropagation.bindAcceptedTurnToSource).not.toHaveBeenCalled();
  });

  it("does not propagate callback context when relay delivery is rejected", async () => {
    const { service, mocks } = createSubject();
    mocks.teamRuntimeBindingRegistry.resolveByMemberRunId.mockReturnValue({
      teamRunId: "team-1",
      binding: {
        memberRunId: "student-run-1",
        memberName: "Student",
        memberRouteKey: "student",
      },
    });
    mocks.teamRuntimeBindingRegistry.resolveMemberBinding.mockReturnValue({
      binding: {
        memberRunId: "professor-run-1",
        memberName: "Professor",
        memberRouteKey: "professor",
        runtimeKind: "codex_app_server",
      },
      code: null,
      message: null,
    });
    mocks.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage.mockResolvedValue({
      accepted: false,
      code: "RECIPIENT_SESSION_UNAVAILABLE",
      message: "Recipient session is unavailable.",
      runtimeKind: "codex_app_server",
      turnId: "turn-professor-2",
    });

    const result = await service.relayInterAgentMessage({
      teamRunId: "team-1",
      senderMemberRunId: "student-run-1",
      senderTurnId: "turn-student-1",
      recipientName: "Professor",
      content: "Here is my answer.",
    });

    expect(result).toEqual({
      accepted: false,
      code: "RECIPIENT_SESSION_UNAVAILABLE",
      message: "Recipient session is unavailable.",
    });
    expect(mocks.externalCallbackPropagation.getSourceByAgentRunTurn).not.toHaveBeenCalled();
    expect(mocks.externalCallbackPropagation.bindAcceptedTurnToSource).not.toHaveBeenCalled();
  });
});
