import { describe, expect, it, vi } from "vitest";
import { RunFileChangeProjectionService } from "../../../../src/run-history/services/run-file-change-projection-service.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const tree = testExecutionTree({
  rootTeamRunId: "team-1",
  coordinatorAddress: "/worker",
  children: [testAgentNode("/worker", { agentRunId: "worker-run", workspaceRootPath: "/ws/team" })],
});
const configured = tree.rootTeam.members[0] as Extract<typeof tree.rootTeam.members[number], { agentRunId: string }>;
const entry = { id: "change-1", runId: "run-1", path: "src/file.ts", type: "file" as const, status: "available" as const, sourceTool: "generated_output" as const, sourceInvocationId: null, content: null, createdAt: "2026-08-15T00:00:00.000Z", updatedAt: "2026-08-15T00:00:00.000Z" };
const projection = { version: 2 as const, entries: [entry] };

const harness = (input: { standalone?: boolean; storedStandalone?: boolean; team?: boolean; activeTeam?: boolean } = {}) => {
  const activeStandalone = input.standalone ? { runId: "run-1", config: { workspaceId: null } } : null;
  const root = input.activeTeam ? { teamRunId: "team-1" } : null;
  const agentRuns = { getActiveRun: vi.fn(() => activeStandalone) };
  const teamRuns = { getManagedTeamRun: vi.fn(() => root) };
  const metadata = { readMetadata: vi.fn(async () => input.storedStandalone ? ({ memoryDir: "/memory/agents/run-1", workspaceRootPath: "/ws/standalone" }) : null) };
  const projectionStore = { readProjection: vi.fn(async () => projection) };
  const changes = {
    getProjectionForRun: vi.fn(async () => projection),
    getProjectionForTeamMemberRun: vi.fn(async () => projection),
  };
  const teamLocations = { findAgent: vi.fn(async () => input.team ? ({
    rootTeamRunId: "team-1", containingTeamRunId: "team-1", ancestorTeamRunIds: [],
    agentRunId: "worker-run", memberAddress: "/worker", configuredPlacement: configured,
    memoryDir: "/memory/agent_teams/team-1/worker-run", tree, isActive: Boolean(root),
  }) : null) };
  const workspaces = { getWorkspaceById: vi.fn() };
  return {
    agentRuns, teamRuns, metadata, projectionStore, changes, teamLocations,
    service: new RunFileChangeProjectionService({
      agentRunManager: agentRuns as never,
      teamRunManager: teamRuns as never,
      metadataService: metadata as never,
      projectionStore: projectionStore as never,
      runFileChangeService: changes as never,
      teamLocations: teamLocations as never,
      workspaceManager: workspaces as never,
    }),
  };
};

describe("RunFileChangeProjectionService current run identity", () => {
  it("reads an active standalone run from the runtime owner", async () => {
    const { service, changes, projectionStore } = harness({ standalone: true });
    await expect(service.getProjection("run-1")).resolves.toEqual([entry]);
    expect(changes.getProjectionForRun).toHaveBeenCalledOnce();
    expect(projectionStore.readProjection).not.toHaveBeenCalled();
  });

  it("reads a stored standalone run from its exact metadata memory directory", async () => {
    const { service, projectionStore } = harness({ storedStandalone: true });
    await expect(service.getProjection("run-1")).resolves.toEqual([expect.objectContaining({
      id: "run-1:src/file.ts",
      runId: "run-1",
      path: "src/file.ts",
    })]);
    expect(projectionStore.readProjection).toHaveBeenCalledWith("/memory/agents/run-1");
  });

  it("reads an active Team Agent through exact AgentRun location and current root owner", async () => {
    const { service, changes, teamLocations } = harness({ team: true, activeTeam: true });
    await expect(service.getProjection("worker-run")).resolves.toEqual([entry]);
    expect(teamLocations.findAgent).toHaveBeenCalledWith({ agentRunId: "worker-run" });
    expect(changes.getProjectionForTeamMemberRun).toHaveBeenCalledWith(expect.objectContaining({ teamRunId: "team-1" }), "worker-run");
  });

  it("reads a historical Team Agent from the exact V1-derived AgentRun memory directory", async () => {
    const { service, projectionStore } = harness({ team: true });
    await expect(service.resolveEntry("worker-run", "src/file.ts")).resolves.toMatchObject({
      entry: expect.objectContaining({ id: "worker-run:src/file.ts", runId: "worker-run", path: "src/file.ts" }),
      absolutePath: "/ws/team/src/file.ts",
      isActiveRun: false,
    });
    expect(projectionStore.readProjection).toHaveBeenCalledWith("/memory/agent_teams/team-1/worker-run");
  });

  it("returns an empty projection when no standalone or Team AgentRun exists", async () => {
    await expect(harness().service.getProjection("missing")).resolves.toEqual([]);
  });
});
