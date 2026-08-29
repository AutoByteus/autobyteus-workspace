import { describe, expect, it, vi } from "vitest";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";

const location = {
  rootTeamRunId: "root-team-run",
  containingTeamRunId: "child-team-run",
  ancestorTeamRunIds: ["child-team-run"],
  agentRunId: "reviewer-run",
  memberAddress: "/ReviewSquad/reviewer",
  memoryDir: "/tmp/memory/agent_teams/root-team-run/child-team-run/reviewer-run",
} as never;

const createLocations = () => ({
  findAgent: vi.fn(async () => location),
  findAgentSync: vi.fn(() => location),
});

describe("ContextFileOwnerResolver", () => {
  it("returns a standalone Agent owner without consulting Team locations", async () => {
    const locations = createLocations();
    const resolver = new ContextFileOwnerResolver({ locations });
    const owner = { kind: "agent_final" as const, runId: "agent-run" };

    await expect(resolver.resolveFinalOwner(owner)).resolves.toBe(owner);
    expect(resolver.resolveFinalOwnerSync(owner)).toBe(owner);
    expect(locations.findAgent).not.toHaveBeenCalled();
    expect(locations.findAgentSync).not.toHaveBeenCalled();
  });

  it("projects a nested Team member from the required stored location reader", async () => {
    const locations = createLocations();
    const resolver = new ContextFileOwnerResolver({ locations });
    const owner = {
      kind: "team_member_final" as const,
      teamRunId: "root-team-run",
      memberAddress: "/ReviewSquad/reviewer" as const,
    };

    await expect(resolver.resolveFinalOwner(owner)).resolves.toEqual({
      ...owner,
      rootTeamRunId: "root-team-run",
      ancestorTeamRunIds: ["child-team-run"],
      agentRunId: "reviewer-run",
      memoryDir: location.memoryDir,
    });
    expect(resolver.resolveFinalOwnerSync(owner)).toEqual({
      ...owner,
      rootTeamRunId: "root-team-run",
      ancestorTeamRunIds: ["child-team-run"],
      agentRunId: "reviewer-run",
      memoryDir: location.memoryDir,
    });
    expect(locations.findAgent).toHaveBeenCalledWith({
      containingTeamRunId: "root-team-run",
      memberAddress: "/ReviewSquad/reviewer",
    });
    expect(locations.findAgentSync).toHaveBeenCalledWith({
      containingTeamRunId: "root-team-run",
      memberAddress: "/ReviewSquad/reviewer",
    });
  });

  it("fails when the required nested Team member is absent", async () => {
    const locations = { findAgent: vi.fn(async () => null), findAgentSync: vi.fn(() => null) };
    const resolver = new ContextFileOwnerResolver({ locations });
    const owner = {
      kind: "team_member_final" as const,
      teamRunId: "root-team-run",
      memberAddress: "/missing" as const,
    };

    await expect(resolver.resolveFinalOwner(owner)).rejects.toThrow("Unable to resolve");
    expect(() => resolver.resolveFinalOwnerSync(owner)).toThrow("Unable to resolve");
  });
});
