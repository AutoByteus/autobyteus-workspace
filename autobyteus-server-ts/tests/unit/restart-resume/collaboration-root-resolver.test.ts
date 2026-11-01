/**
 * autobyteus-285 D5: one root resolution for remote messages and restart resume. `null` = no such root here (the
 * managers' not-found); any other failure is thrown as a restore failure (N-8: a Team restore failure is not "not here").
 */
import { describe, expect, it, vi } from "vitest";
import { createCollaborationRootResolver } from "../../../src/compositions/collaboration-root-resolver.js";
import { StandaloneRootUnavailableError } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

const managers = () => ({
  standaloneRoots: { resolveRoot: vi.fn() },
  teamRuns: { getManagedTeamRun: vi.fn().mockReturnValue(null), restoreTeamRun: vi.fn() },
  orgRuns: { getActive: vi.fn().mockReturnValue(null), restore: vi.fn() },
});

describe("createCollaborationRootResolver", () => {
  it("resolves each kind through its manager, restoring when it is not active", async () => {
    const m = managers();
    const standaloneRoot = { kind: "standalone-root" }, teamRoot = { kind: "team-root" }, orgRoot = { kind: "org-root" };
    m.standaloneRoots.resolveRoot.mockResolvedValue(standaloneRoot);
    m.teamRuns.restoreTeamRun.mockResolvedValue(teamRoot);
    m.orgRuns.restore.mockResolvedValue(orgRoot);
    const resolver = createCollaborationRootResolver(m as never);

    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent", rootRunId: "a" })).resolves.toEqual({ kind: "agent", root: standaloneRoot });
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_team", rootRunId: "t" })).resolves.toEqual({ kind: "agent_team", root: teamRoot });
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_org", rootRunId: "o" })).resolves.toEqual({ kind: "agent_org", root: orgRoot });
    expect(m.teamRuns.restoreTeamRun).toHaveBeenCalledWith("t");
    expect(m.orgRuns.restore).toHaveBeenCalledWith("o");
  });

  it("uses an active Team or Org without restoring", async () => {
    const m = managers();
    m.teamRuns.getManagedTeamRun.mockReturnValue({ live: "team" });
    m.orgRuns.getActive.mockReturnValue({ live: "org" });
    const resolver = createCollaborationRootResolver(m as never);
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_team", rootRunId: "t" })).resolves.toEqual({ kind: "agent_team", root: { live: "team" } });
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_org", rootRunId: "o" })).resolves.toEqual({ kind: "agent_org", root: { live: "org" } });
    expect(m.teamRuns.restoreTeamRun).not.toHaveBeenCalled();
    expect(m.orgRuns.restore).not.toHaveBeenCalled();
  });

  it("maps 'no such root' to null: a run that cannot host a root, a missing run, an uncataloged Team or Org", async () => {
    const m = managers();
    const resolver = createCollaborationRootResolver(m as never);
    m.standaloneRoots.resolveRoot.mockResolvedValueOnce(null);
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent", rootRunId: "app-owned" })).resolves.toBeNull();
    m.standaloneRoots.resolveRoot.mockRejectedValueOnce(new StandaloneRootUnavailableError("Agent run 'gone' was not found."));
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent", rootRunId: "gone" })).resolves.toBeNull();
    m.teamRuns.restoreTeamRun.mockRejectedValueOnce(new Error("TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED: TeamRun 't' is not an admitted current package."));
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_team", rootRunId: "t" })).resolves.toBeNull();
    m.orgRuns.restore.mockRejectedValueOnce(new Error("AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED: AgentOrg 'o' is not an admitted current package."));
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_org", rootRunId: "o" })).resolves.toBeNull();
  });

  it("throws any other failure as a restore failure (N-8)", async () => {
    const m = managers();
    const resolver = createCollaborationRootResolver(m as never);
    m.teamRuns.restoreTeamRun.mockRejectedValueOnce(new Error("TEAM_RUN_STATE_PACKAGE_INVALID: execution tree damaged"));
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_team", rootRunId: "t" })).rejects.toThrow("damaged");
    m.orgRuns.restore.mockRejectedValueOnce(new Error("disk full"));
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent_org", rootRunId: "o" })).rejects.toThrow("disk full");
    m.standaloneRoots.resolveRoot.mockRejectedValueOnce(new Error("package unreadable"));
    await expect(resolver.resolveOrRestore({ rootSubjectKind: "agent", rootRunId: "a" })).rejects.toThrow("package unreadable");
  });
});
