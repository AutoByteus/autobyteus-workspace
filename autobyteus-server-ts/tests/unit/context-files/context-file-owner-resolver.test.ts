import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContextFileOwnerResolver,
  TeamContextFileOwnerNotFoundError,
} from "../../../src/context-files/services/context-file-owner-resolver.js";

const admission = vi.hoisted(() => ({allowed: true}));
vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class {
    awaitReady = async () => undefined;
    isAdmitted = () => admission.allowed;
  },
}));
beforeEach(() => { admission.allowed = true; });
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
  it("returns an admitted standalone Agent owner without consulting Team locations", async () => {
    const locations = createLocations();
    const resolver = new ContextFileOwnerResolver({ memoryDir: "/unit-memory", locations });
    const owner = { kind: "agent_final" as const, runId: "agent-run" };

    await expect(resolver.resolveFinalOwner(owner)).resolves.toBe(owner);
    expect(resolver.resolveFinalOwnerSync(owner)).toBe(owner);
    expect(locations.findAgent).not.toHaveBeenCalled();
    expect(locations.findAgentSync).not.toHaveBeenCalled();
  });

  it("projects a nested Team member from the required stored location reader", async () => {
    const locations = createLocations();
    const resolver = new ContextFileOwnerResolver({ memoryDir: "/unit-memory", locations });
    const owner = {
      kind: "team_member_final" as const,
      teamRunId: "child-team-run",
      agentRunId: "reviewer-run" as const,
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
      containingTeamRunId: "child-team-run",
      agentRunId: "reviewer-run",
    });
    expect(locations.findAgentSync).toHaveBeenCalledWith({
      containingTeamRunId: "child-team-run",
      agentRunId: "reviewer-run",
    });
  });

  it("fails when the required nested Team member is absent", async () => {
    const locations = { findAgent: vi.fn(async () => null), findAgentSync: vi.fn(() => null) };
    const resolver = new ContextFileOwnerResolver({ memoryDir: "/unit-memory", locations });
    const owner = {
      kind: "team_member_final" as const,
      teamRunId: "root-team-run",
      agentRunId: "missing-run" as const,
    };

    await expect(resolver.resolveFinalOwner(owner)).rejects.toBeInstanceOf(TeamContextFileOwnerNotFoundError);
    expect(() => resolver.resolveFinalOwnerSync(owner)).toThrow(TeamContextFileOwnerNotFoundError);
  });

  it("rejects a mis-correlated Team location with the typed not-found result", async () => {
    const wrongLocation = { ...location, containingTeamRunId: "other-team-run" };
    const locations = { findAgent: vi.fn(async () => wrongLocation), findAgentSync: vi.fn(() => wrongLocation) };
    const resolver = new ContextFileOwnerResolver({ memoryDir: "/unit-memory", locations });
    const owner = {
      kind: "team_member_final" as const,
      teamRunId: "child-team-run",
      agentRunId: "reviewer-run" as const,
    };

    await expect(resolver.resolveFinalOwner(owner)).rejects.toBeInstanceOf(TeamContextFileOwnerNotFoundError);
    expect(() => resolver.resolveFinalOwnerSync(owner)).toThrow(TeamContextFileOwnerNotFoundError);
  });
  it.each([
    { agentRunId: "another-execution" },
    { rootSubjectKind: "agent_org", rootRunId: "org" },
  ])("rejects wrong exact execution or family in both readers: %j", async (overrides) => {
    const wrong = { ...location, ...overrides } as never;
    const resolver = new ContextFileOwnerResolver({ memoryDir: "/unit-memory", locations: { findAgent: async () => wrong, findAgentSync: () => wrong } });
    const owner = { kind: "team_member_final" as const, teamRunId: "child-team-run", agentRunId: "reviewer-run" };
    await expect(resolver.resolveFinalOwner(owner)).rejects.toThrow(TeamContextFileOwnerNotFoundError);
    expect(() => resolver.resolveFinalOwnerSync(owner)).toThrow(TeamContextFileOwnerNotFoundError);
  });

});

it("rejects unavailable standalone owners in both readers", async () => {
  admission.allowed = false;
  const resolver = new ContextFileOwnerResolver({memoryDir: "/unit-memory", locations: createLocations()});
  await expect(resolver.resolveFinalOwner({kind: "agent_final", runId: "excluded"})).rejects.toThrow("unavailable");
  expect(() => resolver.resolveFinalOwnerSync({kind: "agent_final", runId: "excluded"})).toThrow("unavailable");
});
