import { describe, expect, it, vi } from "vitest";
import { TeamMemberCommandRouter } from "../../../src/agent-team-execution/services/team-member-command-router.js";

const createSubject = () => {
  const agentRunManager = {
    getActiveRun: vi.fn(),
  } as any;
  const teamMemberManager = {
    getActiveMemberBindings: vi.fn(),
    refreshBindingRuntimeReference: vi.fn(),
    resolveMemberBinding: vi.fn(),
  } as any;

  const router = new TeamMemberCommandRouter({
    agentRunManager,
    teamMemberManager,
  });

  return {
    router,
    mocks: {
      agentRunManager,
      teamMemberManager,
    },
  };
};

describe("TeamMemberCommandRouter", () => {
  it("refreshes member runtime reference after successful send", async () => {
    const { router, mocks } = createSubject();
    mocks.teamMemberManager.resolveMemberBinding.mockReturnValue({
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
    const postUserMessage = vi.fn().mockResolvedValue({
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
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: "claude_agent_sdk",
      postUserMessage,
    });

    const result = await router.sendToMember(
      "team-1",
      "Professor",
      { text: "hello professor" } as any,
    );

    expect(result).toEqual({
      memberName: "Professor",
      memberRunId: "member-run-1",
      runtimeKind: "claude_agent_sdk",
      turnId: null,
    });
    expect(postUserMessage).toHaveBeenCalledWith({ text: "hello professor" });
    expect(mocks.teamMemberManager.refreshBindingRuntimeReference).toHaveBeenCalledWith(
      "team-1",
      "member-run-1",
      "claude_agent_sdk",
      {
        runtimeKind: "claude_agent_sdk",
        sessionId: "claude-session-1",
        threadId: "thread-1",
        metadata: {
          sdkSessionReady: true,
        },
      },
    );
  });

  it("refreshes member runtime reference after successful approval", async () => {
    const { router, mocks } = createSubject();
    mocks.teamMemberManager.resolveMemberBinding.mockReturnValue({
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
    const approveToolInvocation = vi.fn().mockResolvedValue({
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
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: "codex_app_server",
      approveToolInvocation,
    });

    await router.approveForMember("team-1", "Professor", "invoke-1", true, "approved");

    expect(approveToolInvocation).toHaveBeenCalledWith("invoke-1", true, "approved");
    expect(mocks.teamMemberManager.refreshBindingRuntimeReference).toHaveBeenCalledWith(
      "team-1",
      "member-run-1",
      "codex_app_server",
      {
        runtimeKind: "codex_app_server",
        sessionId: "member-run-1",
        threadId: "thread-new",
        metadata: {
          approvalObserved: true,
        },
      },
    );
  });

  it("interrupts all active member runs for a team", async () => {
    const { router, mocks } = createSubject();
    mocks.teamMemberManager.getActiveMemberBindings.mockReturnValue([
      { memberRunId: "member-a" },
      { memberRunId: "member-b" },
    ]);
    const interruptA = vi.fn().mockResolvedValue({ accepted: true });
    const interruptB = vi.fn().mockResolvedValue({ accepted: true });
    mocks.agentRunManager.getActiveRun
      .mockReturnValueOnce({ interrupt: interruptA })
      .mockReturnValueOnce({ interrupt: interruptB });

    const result = await router.interruptTeamRun("team-1");

    expect(result).toEqual({ accepted: true });
    expect(interruptA).toHaveBeenCalledWith(null);
    expect(interruptB).toHaveBeenCalledWith(null);
  });
});
