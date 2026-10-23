import { describe, expect, it, vi } from "vitest";
import { TeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";
import { CollaborationMemberNotFoundError } from "../../../src/agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const executionTree = testExecutionTree({
  rootTeamRunId: "team-1",
  coordinatorAddress: "/professor",
  children: [testAgentNode("/professor", { agentRunId: "professor-run", workspaceRootPath: "/ws/class" })],
});
const configured = executionTree.rootTeam.members[0] as Extract<typeof executionTree.rootTeam.members[number], { agentRunId: string }>;
const location = {
  rootTeamRunId: "team-1",
  containingTeamRunId: "team-1",
  ancestorTeamRunIds: [],
  agentRunId: "professor-run",
  memberAddress: "/professor",
  configuredPlacement: configured,
  executionKind: "configured",
  memoryDir: "/memory/agent_teams/team-1/professor-run",
  tree: executionTree,
  isActive: false,
};
const projection = {
  runId: "professor-run",
  conversation: [{ id: "message-1" }],
  activities: [{ id: "activity-1" }],
  summary: "lesson",
  lastActivityAt: "2026-08-15T00:00:00.000Z",
  hasEarlierActiveTraceEvents: false,
};

const harness = (located: unknown = location) => {
  const locations = { findAgent: vi.fn(async () => located), readTree: vi.fn(async () => null) };
  const agentViews = {
    getProjectionFromMetadata: vi.fn(async () => projection),
    getActiveTracePageFromMetadata: vi.fn(async () => ({ events: [], nextCursor: null })),
  };
  const fileChanges = {
    getLocatedCollaborationMemberProjection: vi.fn(async () => [{ path: "src/a.ts" }]),
    resolveLocatedCollaborationMemberEntry: vi.fn(async () => ({ entry: { path: "src/a.ts" }, absolutePath: "/ws/class/src/a.ts", isActiveRun: false })),
  };
  return {
    locations,
    agentViews,
    fileChanges,
    service: new TeamMemberRunViewProjectionService({
      locations: locations as never,
      agentRunViewProjectionService: agentViews as never,
      runFileChangeProjectionService: fileChanges as never,
    }),
  };
};

const taskAgentTree = {
  ...executionTree,
  rootTeam: {
    ...executionTree.rootTeam,
    taskExecutions: [{
      address: "/reviewer", agentRunId: "reviewer-copy", platformAgentRunId: null, delegatorAgentRunId: "professor-run",
      startedAt: "2026-08-15T00:00:00.000Z",
      source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: { ...configured.launchConfiguration, workspaceRootPath: "/ws/review" } },
    }],
  },
};
const taskAgentLocation = {
  ...location, agentRunId: "reviewer-copy", memberAddress: "/reviewer", configuredPlacement: null, executionKind: "task",
  memoryDir: "/memory/agents/reviewer-copy", tree: taskAgentTree,
};
/** A copy of the configured member itself: same address, its own snapshot and its own runtime session. */
const copyOfMemberTree = {
  ...executionTree,
  rootTeam: {
    ...executionTree.rootTeam,
    members: [{ ...configured, platformAgentRunId: "slot-session" }],
    taskExecutions: [{
      address: "/professor", agentRunId: "professor-copy", platformAgentRunId: "copy-session", delegatorAgentRunId: "professor-run",
      startedAt: "2026-08-15T00:00:00.000Z",
      source: { kind: "agent", agentDefinitionId: "professor", launchConfiguration: { ...configured.launchConfiguration, llmModelIdentifier: "started-model" },
        launchSource: { origin: "configured", fallbacks: [] } },
    }],
  },
};
const copyOfMemberLocation = {
  ...location, agentRunId: "professor-copy", configuredPlacement: { ...configured, platformAgentRunId: "slot-session" }, executionKind: "task",
  memoryDir: "/memory/agents/professor-copy", tree: copyOfMemberTree,
};

describe("TeamMemberRunViewProjectionService exact AgentRun identity", () => {
  it("resolves and projects a member by root TeamRun plus concrete AgentRun ID", async () => {
    const { service, locations, agentViews } = harness();
    await expect(service.getProjection(" team-1 ", " professor-run ")).resolves.toEqual({
      agentRunId: "professor-run",
      conversation: projection.conversation,
      activities: projection.activities,
      summary: "lesson",
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: false,
    });
    expect(locations.findAgent).toHaveBeenCalledWith({ rootTeamRunId: "team-1", agentRunId: "professor-run" });
    expect(agentViews.getProjectionFromMetadata).toHaveBeenCalledWith(expect.objectContaining({
      runId: "professor-run",
      metadata: expect.objectContaining({ runId: "professor-run", memoryDir: location.memoryDir }),
    }));
  });

  it("uses a run-scoped canonical cursor subject for active trace pages", async () => {
    const { service, agentViews } = harness();
    await service.getActiveTracePage("team-1", "professor-run", "cursor-1");
    expect(agentViews.getActiveTracePageFromMetadata).toHaveBeenCalledWith(expect.objectContaining({
      runId: "professor-run",
      beforeCursor: "cursor-1",
      canonicalSubject: "team:team-1:agent:professor-run",
    }));
  });

  it("rejects foreign-root and missing AgentRun identities without address fallback", async () => {
    const { service } = harness({ ...location, rootTeamRunId: "other-root" });
    await expect(service.getProjection("team-1", "professor-run"))
      .rejects.toThrow(new CollaborationMemberNotFoundError("AgentRun 'professor-run' was not found in root TeamRun 'team-1'."));
    await expect(harness(null).service.getProjection("team-1", "missing"))
      .rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
    await expect(harness(null).service.getProjection("team-1", "missing"))
      .rejects.toThrow("AgentRun 'missing' was not found");
  });

  it("rejects executions that have neither a configured launch placement nor a recorded source", async () => {
    const { service } = harness({ ...location, configuredPlacement: null });
    await expect(service.getProjection("team-1", "professor-run"))
      .rejects.toThrow(new CollaborationMemberNotFoundError("AgentRun 'professor-run' has no configured launch placement or recorded source."));
  });

  it("projects a copy of a configured member with its own settings and runtime session, never the member's (AC-004)", async () => {
    const { service, agentViews } = harness(copyOfMemberLocation);
    await service.getProjection("team-1", "professor-copy");
    expect(agentViews.getProjectionFromMetadata).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ runId: "professor-copy", llmModelIdentifier: "started-model", platformAgentRunId: "copy-session" }),
    }));
  });

  it("projects a team task agent from its catalog source", async () => {
    const { service, agentViews } = harness(taskAgentLocation);
    await service.getProjection("team-1", "reviewer-copy");
    expect(agentViews.getProjectionFromMetadata).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ agentDefinitionId: "reviewer", workspaceRootPath: "/ws/review", memoryDir: "/memory/agents/reviewer-copy" }),
    }));
  });
});

describe("TeamMemberRunViewProjectionService file changes", () => {
  it("serves a member's file list and entry through the team-scoped, tagged location", async () => {
    const { service, locations, fileChanges } = harness(taskAgentLocation);
    await expect(service.getFileChanges("team-1", "reviewer-copy")).resolves.toEqual([{ path: "src/a.ts" }]);
    await expect(service.resolveFileChangeEntry("team-1", "reviewer-copy", "src/a.ts")).resolves.toMatchObject({ absolutePath: "/ws/class/src/a.ts" });
    expect(locations.findAgent).toHaveBeenCalledWith({ rootTeamRunId: "team-1", agentRunId: "reviewer-copy" });
    const tagged = expect.objectContaining({ rootSubjectKind: "agent_team", rootRunId: "team-1", agentRunId: "reviewer-copy" });
    expect(fileChanges.getLocatedCollaborationMemberProjection).toHaveBeenCalledWith(tagged);
    expect(fileChanges.resolveLocatedCollaborationMemberEntry).toHaveBeenCalledWith(tagged, "src/a.ts");
  });

  it("does not read file changes for an agent that is not in the named team", async () => {
    const { service, fileChanges } = harness(null);
    await expect(service.getFileChanges("team-1", "other-run")).rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
    await expect(service.resolveFileChangeEntry("team-1", "other-run", "src/a.ts")).rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
    expect(fileChanges.getLocatedCollaborationMemberProjection).not.toHaveBeenCalled();
    expect(fileChanges.resolveLocatedCollaborationMemberEntry).not.toHaveBeenCalled();
  });
});
