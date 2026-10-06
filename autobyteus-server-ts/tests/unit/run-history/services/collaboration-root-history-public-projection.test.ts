import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentOrgExecutionTreeDtoSchema } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { CollaborationRootHistoryService } from "../../../../src/run-history/services/collaboration-root-history-service.js";
import { projectAgentOrgRunHistoryRow } from "../../../../src/run-history/services/agent-org-run-history-row-projector.js";
import { orgProjectionTree } from "../../../fixtures/collaboration-public-projection-fixtures.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

// Check every public field, not just a set of IDs: source/ingress/launch facts
// and every nested position must survive. Private ownership stays in storage.
const setup = async (active: boolean, linked: boolean) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-history-public-"));
  roots.push(memoryDir);
  const tree = { ...orgProjectionTree(linked), archivedAt: null };
  const expected = agentOrgExecutionTreeDtoSchema.parse({ ...orgProjectionTree(false), archivedAt: null });
  const store = new AgentOrgRunExecutionTreeStore();
  const packagePath = new AgentMemoryLayout(memoryDir).getOrgDirPath("org-root");
  await store.write(packagePath, tree);
  const file = getAgentOrgRunExecutionTreePath(packagePath);
  const bytes = await fs.readFile(file);
  const read = vi.spyOn(store, "read");
  const write = vi.spyOn(store, "write");
  const getExecutionTreeSnapshot = vi.fn(() => tree);
  const catalog = [projectAgentOrgRunHistoryRow(tree)];
  const service = new CollaborationRootHistoryService({
    memoryDir,
    teams: { listTeamRunHistory: async () => [] },
    orgs: { listCatalogRows: async () => catalog, getCatalogRow: async (id: string) => catalog.find(row => row.orgRunId === id) ?? null },
    orgRuns: { getActive: vi.fn(() => active ? { getExecutionTreeSnapshot } : null), closedTaskExecutionsFor: () => [] } as never,
    orgTrees: store,
  });
  return { tree, expected, store, packagePath, file, bytes, read, write, getExecutionTreeSnapshot, catalog, service };
};

describe("mixed public history Org projection", () => {
  it.each([
    [false, true, "list"], [true, true, "list"], [false, false, "list"], [true, false, "list"],
    [false, true, "scoped"], [true, true, "scoped"], [false, false, "scoped"], [true, false, "scoped"],
  ] as const)("strictly projects active=%s linked=%s via %s without losing any concrete worker or private bytes", async (active, linked, surface) => {
    const current = await setup(active, linked);
    const privateBefore = JSON.stringify(current.tree);
    expect(privateBefore).not.toContain("taskLifetime"); // dev-residue stamps never reach the current tree (C-1)
    // Repeated normal reads have the same result, never a write/migration/restore.
    for (let attempt = 0; attempt < 2; attempt++) {
      const rows = surface === "list" ? await current.service.list() : [await current.service.getAgentOrg(" org-root ")];
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row).toMatchObject({ root_subject_kind: "agent_org", root_run_id: "org-root", is_active: active });
      if (row.root_subject_kind !== "agent_org") throw new Error("Expected Org branch");
      expect(agentOrgExecutionTreeDtoSchema.parse(row.org)).toEqual(current.expected);
      expect(row.org).toEqual(current.expected);
      expect(JSON.stringify(row.org)).not.toContain("taskLifetime");
      expect(JSON.stringify(current.tree)).toBe(privateBefore);
      expect(await fs.readFile(current.file)).toEqual(current.bytes);
    }
    expect(current.write).not.toHaveBeenCalled();
    expect(current.getExecutionTreeSnapshot).toHaveBeenCalledTimes(active ? 2 : 0);
    expect(current.read).toHaveBeenCalledTimes(active ? 0 : 2);
    expect(JSON.stringify(await current.store.read(current.packagePath, "org-root"))).not.toContain("taskLifetime");
  });

  it("uses the active snapshot rather than a stale stored copy and leaves that copy intact", async () => {
    const current = await setup(true, true);
    current.getExecutionTreeSnapshot.mockReturnValue({ ...current.tree, rootOrg: { ...current.tree.rootOrg, orgDefinitionName: "Active current name" } });
    const rows = await current.service.list();
    expect(rows[0]).toMatchObject({ org: { rootOrg: { orgDefinitionName: "Active current name" } } });
    expect(await current.service.getAgentOrg("org-root")).toEqual(rows[0]);
    expect(current.read).not.toHaveBeenCalled();
    expect(current.write).not.toHaveBeenCalled();
    expect(await fs.readFile(current.file)).toEqual(current.bytes);
  });

  it("retains mixed family ordering and the existing archived inactive exclusion", async () => {
    const current = await setup(false, true);
    const team = { teamRunId: "team-root", createdAt: "2026-10-04T00:00:00.000Z", archivedAt: null, isActive: false, summary: "Team" };
    const service = new CollaborationRootHistoryService({
      memoryDir: roots.at(-1)!, teams: { listTeamRunHistory: async () => [team] } as never,
      orgs: { listCatalogRows: async () => current.catalog, getCatalogRow: async (id: string) => current.catalog.find(row => row.orgRunId === id) ?? null },
      orgRuns: { getActive: () => null, closedTaskExecutionsFor: () => [] }, orgTrees: current.store,
    });
    const rows = await service.list();
    expect(rows.map(row => row.root_run_id)).toEqual(["team-root", "org-root"]);
    expect(rows[0]).toMatchObject({ root_subject_kind: "agent_team", team });
    expect(rows[0]?.root_subject_kind === "agent_team" && rows[0].team).toBe(team);
    current.catalog[0] = { ...current.catalog[0]!, archivedAt: "2026-10-03T02:00:00.000Z" };
    expect((await service.list()).map(row => row.root_run_id)).toEqual(["team-root"]);
    expect(await service.getAgentOrg("org-root")).toBeNull();
    expect(current.write).not.toHaveBeenCalled();
    expect(await fs.readFile(current.file)).toEqual(current.bytes);
  });

  it("keeps scoped lookup selected, rejects wrong root identity, and preserves archived active visibility", async () => {
    const current = await setup(true, true);
    const list = vi.spyOn(current.service, "list");
    expect(await current.service.getAgentOrg("missing")).toBeNull();
    await expect(current.service.getAgentOrg(" ")).rejects.toThrow("orgRunId is required");
    expect(list).not.toHaveBeenCalled();
    current.catalog[0] = { ...current.catalog[0]!, archivedAt: "2026-10-03T02:00:00.000Z" };
    expect(await current.service.getAgentOrg("org-root")).toMatchObject({ is_active: true, archived_at: current.catalog[0].archivedAt });
    current.getExecutionTreeSnapshot.mockReturnValue({ ...current.tree, rootOrg: { ...current.tree.rootOrg, orgRunId: "other-root" } });
    await expect(current.service.getAgentOrg("org-root")).rejects.toThrow("history root mismatch");
    await expect(current.service.list()).rejects.toThrow("history root mismatch");
    expect(current.read).not.toHaveBeenCalled();
    expect(current.write).not.toHaveBeenCalled();
    expect(await fs.readFile(current.file)).toEqual(current.bytes);
  });
});
