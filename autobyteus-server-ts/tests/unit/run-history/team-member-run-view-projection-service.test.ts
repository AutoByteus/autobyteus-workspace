import { describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { TeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";

vi.mock("../../../src/run-history/services/team-run-history-service.js", () => ({
  TeamRunHistoryService: class {},
  getTeamRunHistoryService: vi.fn(() => {
    throw new Error("getTeamRunHistoryService should not be used in this unit test");
  }),
}));

const buildAgentMember = (overrides: Record<string, unknown> = {}) => ({
  memberKind: "agent",
  memberRouteKey: "professor",
  memberPath: ["professor"],
  memberName: "Professor",
  memberRunId: "member-1",
  runtimeKind: "autobyteus",
  platformAgentRunId: null,
  agentDefinitionId: "agent-1",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  skillAccessMode: "PRELOADED_ONLY",
  llmConfig: null,
  workspaceRootPath: "/tmp/workspace",
  role: null,
  description: null,
  ...overrides,
});

const buildTeamMetadata = (memberTree: unknown[]) => ({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "professor",
  createdAt: "2026-03-04T12:00:00.000Z",
  updatedAt: "2026-03-04T12:05:00.000Z",
  archivedAt: null,
  memberTree,
});

describe("TeamMemberRunViewProjectionService", () => {
  const createAgentRunViewProjectionService = (result: unknown) => ({
    getProjectionFromMetadata: vi.fn().mockResolvedValue(result),
  });
  const getExpectedMemberMemoryDir = (teamRunId: string, memberRunId: string): string =>
    new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir()).getMemberDirPath(
      teamRunId,
      memberRunId,
    );

  it("resolves by memberRouteKey from recursive memberTree and delegates canonical projection", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([buildAgentMember()]),
    });
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService({
        runId: "member-1",
        summary: "hello",
        lastActivityAt: "2026-02-25T00:00:00.000Z",
        conversation: [{ role: "user", content: "hi" }],
        activities: [],
      }) as any,
    });

    const result = await service.getProjection("team-1", "professor");

    expect(result.agentRunId).toBe("member-1");
    expect(result.summary).toBe("hello");
    expect(result.conversation).toHaveLength(1);
    expect(result.activities).toEqual([]);
  });

  it("resolves nested leaf route keys from recursive memberTree", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([
        {
          memberKind: "agent_team",
          memberRouteKey: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberName: "BuildSquad",
          memberRunId: "build-squad-handle",
          role: null,
          description: null,
          teamDefinitionId: "build-team",
          teamRunId: "child-team-run",
          coordinatorMemberRouteKey: "review_lead",
          memberTree: [
            buildAgentMember({
              memberRouteKey: "BuildSquad/review_lead",
              memberPath: ["BuildSquad", "review_lead"],
              memberName: "review_lead",
              memberRunId: "review-lead-run",
              runtimeKind: "codex_app_server",
              platformAgentRunId: "thread-review-lead",
            }),
          ],
        },
      ]),
    });
    const getProjectionFromMetadata = vi.fn().mockResolvedValue({
      runId: "review-lead-run",
      summary: "nested summary",
      lastActivityAt: "2026-02-25T00:00:00.000Z",
      conversation: [{ role: "user", content: "nested hi" }],
      activities: [],
    });
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: { getProjectionFromMetadata } as any,
    });

    const result = await service.getProjection("team-1", "BuildSquad/review_lead");

    expect(getProjectionFromMetadata).toHaveBeenCalledWith({
      runId: "review-lead-run",
      metadata: expect.objectContaining({
        runId: "review-lead-run",
        runtimeKind: "codex_app_server",
        platformAgentRunId: "thread-review-lead",
        memoryDir: getExpectedMemberMemoryDir("team-1", "review-lead-run"),
      }),
    });
    expect(result.summary).toBe("nested summary");
  });

  it("rejects bare member names when duplicate nested leaves require route keys", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([
        {
          memberKind: "agent_team",
          memberRouteKey: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberName: "BuildSquad",
          memberRunId: "build-squad-handle",
          role: null,
          description: null,
          teamDefinitionId: "build-team",
          teamRunId: "child-team-run-1",
          coordinatorMemberRouteKey: "review_lead",
          memberTree: [
            buildAgentMember({
              memberRouteKey: "BuildSquad/review_lead",
              memberPath: ["BuildSquad", "review_lead"],
              memberName: "review_lead",
              memberRunId: "build-review-lead-run",
            }),
          ],
        },
        {
          memberKind: "agent_team",
          memberRouteKey: "AuditSquad",
          memberPath: ["AuditSquad"],
          memberName: "AuditSquad",
          memberRunId: "audit-squad-handle",
          role: null,
          description: null,
          teamDefinitionId: "audit-team",
          teamRunId: "child-team-run-2",
          coordinatorMemberRouteKey: "review_lead",
          memberTree: [
            buildAgentMember({
              memberRouteKey: "AuditSquad/review_lead",
              memberPath: ["AuditSquad", "review_lead"],
              memberName: "review_lead",
              memberRunId: "audit-review-lead-run",
            }),
          ],
        },
      ]),
    });
    const getProjectionFromMetadata = vi.fn();
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: { getProjectionFromMetadata } as any,
    });

    await expect(service.getProjection("team-1", "review_lead")).rejects.toThrow(
      "Member route key 'review_lead' not found for team run 'team-1'.",
    );
    expect(getProjectionFromMetadata).not.toHaveBeenCalled();
  });

  it("delegates member metadata through the unified local replay projection path", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([
        buildAgentMember({
          runtimeKind: "claude_agent_sdk",
          platformAgentRunId: "session-1",
          autoExecuteTools: true,
          llmConfig: { temperature: 0.2 },
        }),
      ]),
    });
    const getProjectionFromMetadata = vi.fn().mockResolvedValue({
      runId: "member-1",
      summary: "local-replay-summary",
      lastActivityAt: "2026-03-04T12:05:00.000Z",
      conversation: [
        { role: "user", content: "turn-1" },
        { role: "assistant", content: "reply-1" },
        { role: "user", content: "turn-2" },
        { role: "assistant", content: "reply-2" },
      ],
      activities: [{ invocationId: "runtime-1", toolName: "run_bash", type: "terminal_command", status: "success", contextText: "pwd" }],
    });
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: { getProjectionFromMetadata } as any,
    });

    const result = await service.getProjection("team-1", "professor");

    expect(getProjectionFromMetadata).toHaveBeenCalledWith({
      runId: "member-1",
      metadata: {
        runId: "member-1",
        agentDefinitionId: "agent-1",
        workspaceRootPath: "/tmp/workspace",
        memoryDir: getExpectedMemberMemoryDir("team-1", "member-1"),
        llmModelIdentifier: "model-1",
        llmConfig: { temperature: 0.2 },
        autoExecuteTools: true,
        skillAccessMode: "PRELOADED_ONLY",
        runtimeKind: "claude_agent_sdk",
        platformAgentRunId: "session-1",
        lastKnownStatus: "IDLE",
      },
    });
    expect(result.summary).toBe("local-replay-summary");
    expect(result.conversation).toHaveLength(4);
    expect(result.activities).toHaveLength(1);
    expect(String(result.conversation[3]?.content ?? "")).toContain("reply-2");
  });

  it("throws when member binding is missing", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([]),
    });

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService(null) as any,
    });

    await expect(service.getProjection("team-1", "missing")).rejects.toThrow(
      "Member route key 'missing' not found for team run 'team-1'.",
    );
  });

  it("returns delegated Codex local replay projection with member memory metadata", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([
        buildAgentMember({
          memberRouteKey: "pong",
          memberPath: ["pong"],
          memberName: "pong",
          memberRunId: "pong-run",
          runtimeKind: "codex_app_server",
          platformAgentRunId: "thread-1",
          agentDefinitionId: "agent-2",
          llmModelIdentifier: "model-2",
        }),
      ]),
    });
    const getProjectionFromMetadata = vi.fn().mockResolvedValue({
      runId: "pong-run",
      summary: "summary-from-local-replay",
      lastActivityAt: "2026-02-26T13:00:00.000Z",
      conversation: [{ role: "user", content: "PING-TO-PONG token" }],
      activities: [],
    });

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: { getProjectionFromMetadata } as any,
    });

    const result = await service.getProjection("team-1", "pong");

    expect(getProjectionFromMetadata).toHaveBeenCalledTimes(1);
    expect(getProjectionFromMetadata).toHaveBeenCalledWith({
      runId: "pong-run",
      metadata: expect.objectContaining({
        runId: "pong-run",
        runtimeKind: "codex_app_server",
        platformAgentRunId: "thread-1",
        memoryDir: getExpectedMemberMemoryDir("team-1", "pong-run"),
      }),
    });
    expect(result.agentRunId).toBe("pong-run");
    expect(result.summary).toBe("summary-from-local-replay");
    expect(result.conversation).toHaveLength(1);
  });

  it("returns an empty projection when delegated projection is empty", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: buildTeamMetadata([
        buildAgentMember({
          memberRouteKey: "student",
          memberPath: ["student"],
          memberName: "student",
          memberRunId: "student-run",
          runtimeKind: "codex_app_server",
          platformAgentRunId: "thread-student",
          agentDefinitionId: "agent-3",
          llmModelIdentifier: "model-3",
        }),
      ]),
    });
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService({
        runId: "student-run",
        summary: null,
        lastActivityAt: null,
        conversation: [],
        activities: [],
      }) as any,
    });

    const result = await service.getProjection("team-1", "student");

    expect(result.agentRunId).toBe("student-run");
    expect(result.summary).toBeNull();
    expect(result.lastActivityAt).toBeNull();
    expect(result.conversation).toEqual([]);
    expect(result.activities).toEqual([]);
  });
});
