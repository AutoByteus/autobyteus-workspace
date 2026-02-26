import { describe, expect, it } from "vitest";
import { TeamRunRepository, type TeamRunRecord } from "../../../src/distributed/team-run-orchestrator/team-run-repository.js";

describe("TeamRunRepository", () => {
  const buildRecord = (overrides: Partial<TeamRunRecord> = {}): TeamRunRecord => ({
    teamRunId: "run-1",
    teamDefinitionId: "def-1",
    coordinatorMemberName: "leader",
    runVersion: 1,
    hostNodeId: "node-host",
    placementByMember: {},
    status: "running",
    createdAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtIso: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("allocates monotonically increasing run versions per team definition", () => {
    const repository = new TeamRunRepository();

    expect(repository.allocateNextRunVersion("def-1")).toBe(1);
    expect(repository.allocateNextRunVersion("def-1")).toBe(2);
    expect(repository.allocateNextRunVersion("def-2")).toBe(1);
  });

  it("stores and retrieves active runs", () => {
    const repository = new TeamRunRepository();
    const record = buildRecord();
    repository.createRunRecord(record);

    expect(repository.getRunById("run-1")).toEqual(record);
    expect(repository.getActiveRunByDefinitionId("def-1")).toEqual(record);
    expect(repository.resolveCurrentRunVersion("run-1")).toBe(1);
  });

  it("marks status and cleans up run mappings on delete", () => {
    const repository = new TeamRunRepository();
    repository.createRunRecord(buildRecord());

    const updated = repository.updateRunStatus("run-1", "stopped");
    expect(updated?.status).toBe("stopped");
    expect(repository.getActiveRunByDefinitionId("def-1")).toBeNull();
    expect(repository.deleteRun("run-1")).toBe(true);
    expect(repository.getRunById("run-1")).toBeNull();
  });
});
