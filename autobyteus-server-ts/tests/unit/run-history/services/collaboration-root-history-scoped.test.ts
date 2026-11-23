import { noDelegations } from "../../../helpers/no-delegations.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollaborationRootHistoryService } from "../../../../src/run-history/services/collaboration-root-history-service.js";
import { AgentOrgContainerStore } from "../../../../src/run-history/store/agent-org-container-store.js";
import { readStoredOrgTree } from "../../../../src/agent-org-execution/container/stored-org-tree.js";
import { writeStoredOrgContainer } from "../../../helpers/stored-org-container.js";

/** A stopped Org is a stored container (org-teams-follow-definition): its tree is composed from its units' files. */
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const fixture = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-history-scoped-"));
  roots.push(memoryDir);
  await writeStoredOrgContainer(memoryDir, { orgRunId: "org-one", units: [{ kind: "agent", address: "/worker", runId: "worker-one" }] });
  const tree = (await readStoredOrgTree(memoryDir, "org-one"))!;
  const row = { orgRunId: "org-one", createdAt: tree.createdAt, archivedAt: null, summary: "Server summary" } as never;
  const trees = { read: vi.spyOn(AgentOrgContainerStore.prototype, "readIfContainer") };
  const orgs = { listCatalogRows: vi.fn(async () => [row]), getCatalogRow: vi.fn(async (id: string) => id === "org-one" ? row : null) };
  const orgRuns = { getActive: vi.fn(() => null as any) };
  const teams = { listTeamRunHistory: vi.fn(async () => []) };
  const service = new CollaborationRootHistoryService({ tree: noDelegations(), memoryDir, orgs, orgRuns, teams, lastActivity: { forOrgRun: async () => null } as never });
  return { memoryDir, tree, row, trees, orgs, orgRuns, teams, service };
};
describe("one authoritative admitted Org history subject", () => {
  it("matches list projection but neither enumerates nor reads unrelated subjects", async () => {
    const f = await fixture(); const listed = await f.service.list(); f.trees.read.mockClear(); f.orgs.listCatalogRows.mockClear(); f.teams.listTeamRunHistory.mockClear();
    expect(await f.service.getAgentOrg(" org-one ")).toEqual(listed[0]);
    expect(f.orgs.getCatalogRow).toHaveBeenCalledWith("org-one");
    expect(f.trees.read).toHaveBeenCalledWith(path.join(f.memoryDir, "agent_orgs", "org-one"), "org-one");
    expect(f.trees.read.mock.calls.every(([, id]) => id === "org-one")).toBe(true);
    expect(f.orgs.listCatalogRows).not.toHaveBeenCalled(); expect(f.teams.listTeamRunHistory).not.toHaveBeenCalled();
  });
  it("uses active snapshots, including archived active roots, and hides archived inactive roots", async () => {
    const f = await fixture(); f.orgs.getCatalogRow.mockResolvedValue({ ...f.row as object, archivedAt: "2026-10-01" } as never);
    expect(await f.service.getAgentOrg("org-one")).toBeNull();
    f.trees.read.mockClear(); f.orgRuns.getActive.mockReturnValue({ getExecutionTreeSnapshot: () => f.tree });
    expect(await f.service.getAgentOrg("org-one")).toMatchObject({ is_active: true, archived_at: "2026-10-01", summary: "Server summary",
      org: { rootOrg: { orgRunId: "org-one", members: [{ agentRunId: "worker-one" }] } } });
    expect(f.trees.read).not.toHaveBeenCalled();
  });
  it("carries no closed set: a run it delegated to is its own run, and only open ones are child rows (autobyteus-461)", async () => {
    expect(await (await fixture()).service.getAgentOrg("org-one")).not.toHaveProperty("closed_task_executions");
  });
  it("returns admitted absence without tree reads, and propagates tree failure/root mismatch", async () => {
    const f = await fixture(); expect(await f.service.getAgentOrg("unknown")).toBeNull(); expect(f.trees.read).not.toHaveBeenCalled();
    f.trees.read.mockRejectedValueOnce(new Error("tree failed"));
    await expect(f.service.getAgentOrg("org-one")).rejects.toThrow("tree failed");
    f.orgRuns.getActive.mockReturnValue({ getExecutionTreeSnapshot: () => ({ ...f.tree, rootOrg: { ...f.tree.rootOrg, orgRunId: "other" } }) });
    await expect(f.service.getAgentOrg("org-one")).rejects.toThrow("root mismatch");
    await expect(f.service.getAgentOrg(" ")).rejects.toThrow("orgRunId is required");
  });
});
