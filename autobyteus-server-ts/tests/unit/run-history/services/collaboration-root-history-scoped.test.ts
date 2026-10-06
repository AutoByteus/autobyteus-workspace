import { describe, expect, it, vi } from "vitest";
import { CollaborationRootHistoryService } from "../../../../src/run-history/services/collaboration-root-history-service.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../../fixtures/current-agent-org-run-fixtures.js";

const fixture = () => {
  const tree = testAgentOrgExecutionTree({ orgRunId: "org-one", members: [testOrgAgentNode("/worker", "worker-one")] });
  const row = { orgRunId: "org-one", createdAt: tree.createdAt, archivedAt: null, summary: "Server summary" } as never;
  const trees = { read: vi.fn(async () => tree) };
  const orgs = { listCatalogRows: vi.fn(async () => [row]), getCatalogRow: vi.fn(async (id: string) => id === "org-one" ? row : null) };
  const orgRuns = { getActive: vi.fn(() => null as any), closedTaskExecutionsFor: vi.fn(() => []) };
  const teams = { listTeamRunHistory: vi.fn(async () => []) };
  const service = new CollaborationRootHistoryService({ memoryDir: "/test-owned", orgs, orgRuns, teams, orgTrees: trees as never });
  return { tree, row, trees, orgs, orgRuns, teams, service };
};
describe("one authoritative admitted Org history subject", () => {
  it("matches list projection but neither enumerates nor reads unrelated subjects", async () => {
    const f = fixture(); const listed = await f.service.list(); f.trees.read.mockClear(); f.orgs.listCatalogRows.mockClear(); f.teams.listTeamRunHistory.mockClear();
    expect(await f.service.getAgentOrg(" org-one ")).toEqual(listed[0]);
    expect(f.orgs.getCatalogRow).toHaveBeenCalledWith("org-one");
    expect(f.trees.read).toHaveBeenCalledTimes(1); expect(f.trees.read).toHaveBeenCalledWith("/test-owned/agent_orgs/org-one", "org-one");
    expect(f.orgs.listCatalogRows).not.toHaveBeenCalled(); expect(f.teams.listTeamRunHistory).not.toHaveBeenCalled();
  });
  it("uses active snapshots, including archived active roots, and hides archived inactive roots", async () => {
    const f = fixture(); f.orgs.getCatalogRow.mockResolvedValue({ ...f.row as object, archivedAt: "2026-10-01" } as never);
    expect(await f.service.getAgentOrg("org-one")).toBeNull();
    f.trees.read.mockClear(); f.orgRuns.getActive.mockReturnValue({ getExecutionTreeSnapshot: () => f.tree });
    expect(await f.service.getAgentOrg("org-one")).toMatchObject({ is_active: true, archived_at: "2026-10-01", summary: "Server summary", org: f.tree });
    expect(f.trees.read).not.toHaveBeenCalled();
  });
  it("carries the Org's closed task executions, read through the Org manager against the same tree it projects", async () => {
    const f = fixture();
    f.orgRuns.closedTaskExecutionsFor.mockReturnValue([{ agentRunId: "closed-run" }] as never);
    expect(await f.service.getAgentOrg("org-one")).toMatchObject({ closed_task_executions: [{ agentRunId: "closed-run" }] });
    expect(f.orgRuns.closedTaskExecutionsFor).toHaveBeenLastCalledWith("org-one", f.tree);
    const active = structuredClone(f.tree);
    f.orgRuns.getActive.mockReturnValue({ getExecutionTreeSnapshot: () => active });
    await f.service.getAgentOrg("org-one");
    expect(f.orgRuns.closedTaskExecutionsFor.mock.calls.at(-1)![1]).toBe(active);
  });
  it("returns admitted absence without tree reads, and propagates tree failure/root mismatch", async () => {
    const f = fixture(); expect(await f.service.getAgentOrg("unknown")).toBeNull(); expect(f.trees.read).not.toHaveBeenCalled();
    f.trees.read.mockRejectedValueOnce(new Error("tree failed"));
    await expect(f.service.getAgentOrg("org-one")).rejects.toThrow("tree failed");
    f.orgRuns.getActive.mockReturnValue({ getExecutionTreeSnapshot: () => ({ ...f.tree, rootOrg: { ...f.tree.rootOrg, orgRunId: "other" } }) });
    await expect(f.service.getAgentOrg("org-one")).rejects.toThrow("root mismatch");
    await expect(f.service.getAgentOrg(" ")).rejects.toThrow("orgRunId is required");
  });
});
