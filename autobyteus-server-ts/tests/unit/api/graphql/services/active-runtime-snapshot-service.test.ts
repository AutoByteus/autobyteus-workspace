import { describe, expect, it, vi } from "vitest";
import { ActiveRuntimeSnapshotService } from "../../../../../src/api/graphql/services/active-runtime-snapshot-service.js";

const createStandaloneAgent = (id: string) => ({
  agentId: id,
  currentStatus: "ACTIVE",
  context: {
    config: {
      name: "Professor Agent",
      role: "Professor",
    },
    customData: {
      agent_definition_id: "professor-agent",
    },
  },
});

const createTeamMemberAgent = (id: string) => ({
  agentId: id,
  currentStatus: "ACTIVE",
  context: {
    config: {
      name: "Professor",
      role: "Professor",
    },
    customData: {
      agent_definition_id: "professor-agent",
      member_route_key: "professor",
      member_run_id: id,
    },
  },
});

const createContextOnlyTeamMemberAgent = (id: string) => ({
  agentId: id,
  currentStatus: "ACTIVE",
  context: {
    config: {
      name: "Professor",
      role: "Professor",
    },
    customData: {
      teamContext: {
        teamId: "team-professor-student-1",
      },
    },
  },
});

describe("ActiveRuntimeSnapshotService", () => {
  it("filters team-member agent runs out of the standalone active-agent snapshot", async () => {
    const standaloneAgent = createStandaloneAgent("run-standalone-1");
    const teamMemberAgent = createTeamMemberAgent("professor_d1b2d7525aa08a86");

    const service = new ActiveRuntimeSnapshotService(
      {
        listActiveRuns: () => [standaloneAgent.agentId, teamMemberAgent.agentId],
        getAgentRun: (runId: string) =>
          runId === standaloneAgent.agentId ? standaloneAgent : teamMemberAgent,
      } as any,
      {
        listActiveRuns: () => [],
        getTeamRun: () => null,
      } as any,
      {
        listActiveTeamRunIds: () => [],
      } as any,
      {
        getTeamRunResumeConfig: vi.fn(),
      } as any,
      {
        resolveOwnership: vi.fn(async (runId: string) =>
          runId === teamMemberAgent.agentId
            ? { kind: "team_member", runId, teamRunId: "team-1", memberManifest: null, source: "agent_context" }
            : { kind: "missing", runId },
        ),
      } as any,
    );

    const activeRuns = await service.listActiveAgentRuns();

    expect(activeRuns).toHaveLength(1);
    expect(activeRuns[0]?.id).toBe("run-standalone-1");
  });

  it("filters team-member runs out of the standalone snapshot when only teamContext is present", async () => {
    const standaloneAgent = createStandaloneAgent("run-standalone-1");
    const teamMemberAgent = createContextOnlyTeamMemberAgent("professor_d1b2d7525aa08a86");

    const service = new ActiveRuntimeSnapshotService(
      {
        listActiveRuns: () => [standaloneAgent.agentId, teamMemberAgent.agentId],
        getAgentRun: (runId: string) =>
          runId === standaloneAgent.agentId ? standaloneAgent : teamMemberAgent,
      } as any,
      {
        listActiveRuns: () => [],
        getTeamRun: () => null,
      } as any,
      {
        listActiveTeamRunIds: () => [],
      } as any,
      {
        getTeamRunResumeConfig: vi.fn(),
      } as any,
      {
        resolveOwnership: vi.fn(async (_runId: string, options: { domainAgent?: any }) =>
          options.domainAgent === teamMemberAgent
            ? {
                kind: "team_member",
                runId: teamMemberAgent.agentId,
                teamRunId: "team-professor-student-1",
                memberManifest: null,
                source: "agent_context",
              }
            : { kind: "missing", runId: standaloneAgent.agentId },
        ),
      } as any,
    );

    const activeRuns = await service.listActiveAgentRuns();

    expect(activeRuns).toHaveLength(1);
    expect(activeRuns[0]?.id).toBe("run-standalone-1");
  });

  it("includes member-runtime teams in the active-team snapshot", async () => {
    const nativeTeam = {
      teamId: "team-native-1",
      name: "Professor Student Team",
      role: "coordinator",
      currentStatus: "ACTIVE",
    };

    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-member-runtime-1",
      isActive: true,
      manifest: {
        teamDefinitionName: "Professor Student Team",
      },
    });

    const service = new ActiveRuntimeSnapshotService(
      {
        listActiveRuns: () => [],
        getAgentRun: () => null,
      } as any,
      {
        listActiveRuns: () => [nativeTeam.teamId],
        getTeamRun: (teamRunId: string) => (teamRunId === nativeTeam.teamId ? nativeTeam : null),
      } as any,
      {
        listActiveTeamRunIds: () => ["team-member-runtime-1"],
      } as any,
      {
        getTeamRunResumeConfig,
      } as any,
      {
        resolveOwnership: vi.fn().mockResolvedValue({ kind: "missing", runId: "unused" }),
      } as any,
    );

    const activeTeams = await service.listActiveTeamRuns();

    expect(activeTeams).toEqual([
      {
        id: "team-native-1",
        name: "Professor Student Team",
        role: "coordinator",
        currentStatus: "ACTIVE",
      },
      {
        id: "team-member-runtime-1",
        name: "Professor Student Team",
        role: null,
        currentStatus: "ACTIVE",
      },
    ]);
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-member-runtime-1");
  });
});
