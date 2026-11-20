import { RunViewStreams } from "../../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { MessageViewScope } from "../../../../../src/agent-collaboration/delegation/message-view-scope.js";
import { createTeamRootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  history: {},
  getProjection: vi.fn(),
  getFileChanges: vi.fn(),
  getActiveTeamRun: vi.fn(),
  getTeamRunResumeConfig: vi.fn(),
  projectExecutionTree: vi.fn((tree: unknown) => tree),
  viewStreams: null as unknown,
}));

vi.mock(
  "../../../../../src/services/agent-streaming/team-execution-view-projector.js",
  () => ({ projectExecutionTree: mocks.projectExecutionTree }),
);
vi.mock(
  "../../../../../src/api/graphql/studio-application-api-services.js",
  () => ({ getStudioRunModelConfigService: () => ({
    getTeamRunResumeConfig: mocks.getTeamRunResumeConfig,
  }),
  getStudioRunViewStreams: () => mocks.viewStreams }),
);
vi.mock(
  "../../../../../src/run-history/services/team-run-history-service.js",
  () => ({ getTeamRunHistoryService: () => mocks.history }),
);
vi.mock(
  "../../../../../src/run-history/services/team-member-run-view-projection-service.js",
  () => ({ getTeamMemberRunViewProjectionService: () => ({ getProjection: mocks.getProjection, getFileChanges: mocks.getFileChanges }) }),
);
vi.mock(
  "../../../../../src/agent-team-execution/services/agent-team-run-manager.js",
  () => ({ getAgentTeamRunManager: () => ({ getActiveTeamRun: mocks.getActiveTeamRun }) }),
);

import { TeamRunHistoryResolver } from "../../../../../src/api/graphql/types/team-run-history.js";

describe("TeamRunHistoryResolver execution checkpoint", () => {
  beforeEach(() => {
    mocks.getActiveTeamRun.mockReset();
    mocks.getProjection.mockReset();
    mocks.getTeamRunResumeConfig.mockReset();
    mocks.projectExecutionTree.mockClear();
  });

  it("routes the resume-config query through the owner-aware Studio service", async () => {
    mocks.getTeamRunResumeConfig.mockResolvedValue({
      teamRunId: "team-run-1",
      isActive: true,
      executionTree: { rootTeam: { address: "/", members: [] } },
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
      liveSequenceId: "live-team-1",
      baseChangeSequence: 12,
      lastMessageChangeSequence: 9,
    });

    await expect(new TeamRunHistoryResolver().getTeamRunResumeConfig("team-run-1"))
      .resolves.toMatchObject({
        teamRunId: "team-run-1",
        isActive: true,
        modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
        liveSequenceId: "live-team-1",
        baseChangeSequence: 12,
        lastMessageChangeSequence: 9,
      });
    expect(mocks.getTeamRunResumeConfig).toHaveBeenCalledWith("team-run-1");
    expect(mocks.projectExecutionTree).toHaveBeenCalledTimes(1);
  });

  it("its runs delegated, local or on another node, are not in it: they are its tree's rows (`runTree`, autobyteus-461 SR-084)", async () => {
    mocks.getTeamRunResumeConfig.mockResolvedValue({
      teamRunId: "team-run-1",
      isActive: false,
      executionTree: { rootTeam: { address: "/", teamRunId: "team-run-1", members: [] } },
      modelConfigEditability: { editable: true, reason: null },
    });
    const config = await new TeamRunHistoryResolver().getTeamRunResumeConfig("team-run-1");
    expect(config).not.toHaveProperty("remoteTaskExecutions");
    expect(config).not.toHaveProperty("closedTaskExecutions");
  });

  it("reads a team member's file changes through the team-scoped member view", async () => {
    const entries = [{ id: "agent-1:docs/a.md", path: "docs/a.md" }];
    mocks.getFileChanges.mockResolvedValue(entries);
    await expect(new TeamRunHistoryResolver().getTeamMemberFileChanges("team-run-1", "agent-1")).resolves.toBe(entries);
    expect(mocks.getFileChanges).toHaveBeenCalledExactlyOnceWith("team-run-1", "agent-1");
  });

  it("exposes one exact RootTeamRun-owned checkpoint", () => {
    const checkpoint = Object.freeze({
      rootTeamRunId: "team-run-1",
      changeSequence: 7,
      hasOpenExecutionWork: false,
    });
    const getExecutionCheckpoint = vi.fn(() => checkpoint);
    mocks.getActiveTeamRun.mockReturnValue({ getExecutionCheckpoint });

    expect(new TeamRunHistoryResolver().getTeamRunExecutionCheckpoint("team-run-1")).toBe(checkpoint);
    expect(mocks.getActiveTeamRun).toHaveBeenCalledWith("team-run-1");
    expect(getExecutionCheckpoint).toHaveBeenCalledTimes(1);
  });

  it("a stopped run's checkpoint is its view's sequence, with no open work of its own (autobyteus-461 SR-045, SR-062)", async () => {
    mocks.getActiveTeamRun.mockReturnValue(null);
    const streams = new RunViewStreams({ agent: () => false, agent_team: () => false, agent_org: () => false }, { tree: { chainOf: (run) => [run] }, scope: new MessageViewScope({ tree: { collaborationTreeOf: () => ({ rows: () => [] }) as never } }), events: { agent: (message) => message, agent_team: (message) => message, agent_org: (message) => message } });
    streams.streamOf(createTeamRootExecutionIdentity("team-run-1")).publish({ kind: "a row event" });
    mocks.viewStreams = streams;
    expect(new TeamRunHistoryResolver().getTeamRunExecutionCheckpoint("team-run-1"))
      .toEqual({ rootTeamRunId: "team-run-1", changeSequence: 1, hasOpenExecutionWork: false });
  });

  it("preserves the existing non-null empty Team member projection payload", async () => {
    const emptyProjection = Object.freeze({
      agentRunId: "agent-run-1",
      conversation: Object.freeze([]),
      activities: Object.freeze([]),
      summary: null,
      lastActivityAt: null,
      hasEarlierActiveTraceEvents: false,
    });
    mocks.getProjection.mockResolvedValue(emptyProjection);

    await expect(new TeamRunHistoryResolver().getTeamMemberRunProjection(
      "team-run-1",
      "agent-run-1",
    )).resolves.toEqual(emptyProjection);
    expect(mocks.getProjection).toHaveBeenCalledWith("team-run-1", "agent-run-1");
  });
});
