import { describe, expect, it, vi } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { TeamRunLocator } from "../../../src/distributed/ingress/team-run-locator.js";

const buildDefinition = () =>
  new AgentTeamDefinition({
    id: "def-1",
    name: "Team One",
    description: "desc",
    coordinatorMemberName: "coordinator",
    nodes: [
      new TeamMember({
        memberName: "coordinator",
        referenceId: "agent-1",
        referenceType: NodeType.AGENT,
      }),
      new TeamMember({
        memberName: "helper",
        referenceId: "agent-2",
        referenceType: NodeType.AGENT,
      }),
    ],
  });

describe("TeamRunLocator", () => {
  it("creates and caches run mapping for a team", async () => {
    const startRunIfMissing = vi.fn(() => ({
      teamRunId: "run-1",
      teamDefinitionId: "def-1",
      runVersion: 3,
      hostNodeId: "node-host",
      placementByMember: {},
      status: "running",
      createdAtIso: "2026-02-12T00:00:00.000Z",
      updatedAtIso: "2026-02-12T00:00:00.000Z",
    }));
    const getRunRecord = vi.fn(() => ({
      teamRunId: "run-1",
      teamDefinitionId: "def-1",
      runVersion: 3,
      hostNodeId: "node-host",
      placementByMember: {},
      status: "running",
      createdAtIso: "2026-02-12T00:00:00.000Z",
      updatedAtIso: "2026-02-12T00:00:00.000Z",
    }));
    const locator = new TeamRunLocator({
      hostNodeId: "node-host",
      defaultNodeId: "node-host",
      nodeSnapshotProvider: () => [{ nodeId: "node-host", isHealthy: true }],
      teamRunOrchestrator: {
        startRunIfMissing,
        getRunRecord,
      } as any,
      teamDefinitionService: {
        getDefinitionById: vi.fn(async () => buildDefinition()),
      } as any,
      teamRunManager: {
        getTeamRun: vi.fn(() => ({ teamId: "team-1" })),
        getTeamDefinitionId: vi.fn(() => "def-1"),
        getTeamMemberNames: vi.fn(() => ["coordinator", "helper"]),
      } as any,
    });

    const first = await locator.resolveOrCreateRun("team-1");
    const second = await locator.resolveOrCreateRun("team-1");

    expect(first.teamRunId).toBe("run-1");
    expect(first.coordinatorMemberName).toBe("coordinator");
    expect(second.teamRunId).toBe("run-1");
    expect(startRunIfMissing).toHaveBeenCalledTimes(1);
  });

  it("returns null from resolveActiveRun when run is no longer active", async () => {
    const startRunIfMissing = vi.fn(() => ({
      teamRunId: "run-1",
      teamDefinitionId: "def-1",
      runVersion: 1,
      hostNodeId: "node-host",
      placementByMember: {},
      status: "running",
      createdAtIso: "2026-02-12T00:00:00.000Z",
      updatedAtIso: "2026-02-12T00:00:00.000Z",
    }));
    const getRunRecord = vi
      .fn()
      .mockReturnValueOnce({
        teamRunId: "run-1",
        teamDefinitionId: "def-1",
        runVersion: 1,
        hostNodeId: "node-host",
        placementByMember: {},
        status: "running",
        createdAtIso: "2026-02-12T00:00:00.000Z",
        updatedAtIso: "2026-02-12T00:00:00.000Z",
      })
      .mockReturnValueOnce(null);
    const locator = new TeamRunLocator({
      hostNodeId: "node-host",
      defaultNodeId: "node-host",
      nodeSnapshotProvider: () => [{ nodeId: "node-host", isHealthy: true }],
      teamRunOrchestrator: {
        startRunIfMissing,
        getRunRecord,
      } as any,
      teamDefinitionService: {
        getDefinitionById: vi.fn(async () => buildDefinition()),
      } as any,
      teamRunManager: {
        getTeamRun: vi.fn(() => ({ teamId: "team-1" })),
        getTeamDefinitionId: vi.fn(() => "def-1"),
        getTeamMemberNames: vi.fn(() => ["coordinator", "helper"]),
      } as any,
    });

    await locator.resolveOrCreateRun("team-1");
    expect(locator.resolveActiveRun("team-1")).not.toBeNull();
    expect(locator.resolveActiveRun("team-1")).toBeNull();
  });

  it("invokes onRunResolved for both newly created and cached active runs", async () => {
    const startRunIfMissing = vi.fn(() => ({
      teamRunId: "run-1",
      teamDefinitionId: "def-1",
      runVersion: 1,
      hostNodeId: "node-host",
      placementByMember: {},
      status: "running",
      createdAtIso: "2026-02-12T00:00:00.000Z",
      updatedAtIso: "2026-02-12T00:00:00.000Z",
    }));
    const getRunRecord = vi.fn(() => ({
      teamRunId: "run-1",
      teamDefinitionId: "def-1",
      runVersion: 1,
      hostNodeId: "node-host",
      placementByMember: {},
      status: "running",
      createdAtIso: "2026-02-12T00:00:00.000Z",
      updatedAtIso: "2026-02-12T00:00:00.000Z",
    }));
    const onRunResolved = vi.fn(async () => undefined);
    const locator = new TeamRunLocator({
      hostNodeId: "node-host",
      defaultNodeId: "node-host",
      nodeSnapshotProvider: () => [{ nodeId: "node-host", isHealthy: true }],
      teamRunOrchestrator: {
        startRunIfMissing,
        getRunRecord,
      } as any,
      teamDefinitionService: {
        getDefinitionById: vi.fn(async () => buildDefinition()),
      } as any,
      teamRunManager: {
        getTeamRun: vi.fn(() => ({ teamId: "team-1" })),
        getTeamDefinitionId: vi.fn(() => "def-1"),
        getTeamMemberNames: vi.fn(() => ["coordinator", "helper"]),
      } as any,
      onRunResolved,
    });

    await locator.resolveOrCreateRun("team-1");
    await locator.resolveOrCreateRun("team-1");

    expect(onRunResolved).toHaveBeenCalledTimes(2);
    expect(onRunResolved.mock.calls[0][0].teamRunId).toBe("run-1");
    expect(onRunResolved.mock.calls[1][0].teamRunId).toBe("run-1");
  });
});
