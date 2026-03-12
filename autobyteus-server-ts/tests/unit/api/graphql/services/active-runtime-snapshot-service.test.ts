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
  it("returns one targeted active standalone agent snapshot without listing all active runs", async () => {
    const standaloneAgent = createStandaloneAgent("run-standalone-1");

    const service = new ActiveRuntimeSnapshotService(
      {
        listActiveRuns: () => [standaloneAgent.agentId],
        getAgentRun: (runId: string) => (runId === standaloneAgent.agentId ? standaloneAgent : null),
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
        resolveOwnership: vi.fn(async () => ({ kind: "missing", runId: standaloneAgent.agentId })),
      } as any,
    );

    await expect(service.getActiveAgentRun("run-standalone-1")).resolves.toMatchObject({
      id: "run-standalone-1",
      name: "Professor Agent",
      currentStatus: "ACTIVE",
    });
  });

  it("returns null for targeted agent snapshot requests when the run belongs to a team member", async () => {
    const teamMemberAgent = createTeamMemberAgent("professor_d1b2d7525aa08a86");

    const service = new ActiveRuntimeSnapshotService(
      {
        listActiveRuns: () => [teamMemberAgent.agentId],
        getAgentRun: () => teamMemberAgent,
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
        resolveOwnership: vi.fn(async () => ({
          kind: "team_member",
          runId: teamMemberAgent.agentId,
          teamRunId: "team-1",
          memberManifest: null,
          source: "agent_context",
        })),
      } as any,
    );

    await expect(service.getActiveAgentRun(teamMemberAgent.agentId)).resolves.toBeNull();
  });

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
      {
        getSnapshot: vi.fn((input: { teamRunId: string }) => ({
          teamRunId: input.teamRunId,
          currentStatus: "ACTIVE",
          members: [],
        })),
      } as any,
    );

    const activeTeams = await service.listActiveTeamRuns();

    expect(activeTeams).toEqual([
      {
        id: "team-native-1",
        name: "Professor Student Team",
        role: "coordinator",
        currentStatus: "ACTIVE",
        members: [],
      },
      {
        id: "team-member-runtime-1",
        name: "Professor Student Team",
        role: null,
        currentStatus: "ACTIVE",
        members: [],
      },
    ]);
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-member-runtime-1");
  });

  it("returns one targeted active member-runtime team snapshot without listing all active teams", async () => {
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
        listActiveRuns: () => [],
        getTeamRun: () => null,
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
      {
        getSnapshot: vi.fn(() => ({
          teamRunId: "team-member-runtime-1",
          currentStatus: "ACTIVE",
          members: [
            {
              memberRouteKey: "professor",
              memberName: "Professor",
              memberRunId: "professor-team-member-runtime-1",
              currentStatus: "IDLE",
            },
          ],
        })),
      } as any,
    );

    await expect(service.getActiveTeamRun("team-member-runtime-1")).resolves.toEqual({
      id: "team-member-runtime-1",
      name: "Professor Student Team",
      role: null,
      currentStatus: "ACTIVE",
      members: [
        {
          memberRouteKey: "professor",
          memberName: "Professor",
          memberRunId: "professor-team-member-runtime-1",
          currentStatus: "IDLE",
        },
      ],
    });
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-member-runtime-1");
  });
});
