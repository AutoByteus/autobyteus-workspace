import { describe, expect, it, vi } from "vitest";
import { TeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";
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

const harness = (located: typeof location | null = location) => {
  const locations = { findAgent: vi.fn(async () => located) };
  const agentViews = {
    getProjectionFromMetadata: vi.fn(async () => projection),
    getActiveTracePageFromMetadata: vi.fn(async () => ({ events: [], nextCursor: null })),
  };
  return {
    locations,
    agentViews,
    service: new TeamMemberRunViewProjectionService({
      locations: locations as never,
      agentRunViewProjectionService: agentViews as never,
    }),
  };
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
    expect(locations.findAgent).toHaveBeenCalledWith({ agentRunId: "professor-run" });
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
      .rejects.toThrow("AgentRun 'professor-run' was not found in root TeamRun 'team-1'");
    await expect(harness(null).service.getProjection("team-1", "missing"))
      .rejects.toThrow("AgentRun 'missing' was not found");
  });

  it("rejects task executions that have no configured launch placement", async () => {
    const { service } = harness({ ...location, configuredPlacement: null });
    await expect(service.getProjection("team-1", "professor-run"))
      .rejects.toThrow("has no configured launch placement");
  });
});
