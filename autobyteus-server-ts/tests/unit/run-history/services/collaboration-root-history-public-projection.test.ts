import { noDelegations } from "../../../helpers/no-delegations.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentOrgExecutionTreeDtoSchema } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerStore } from "../../../../src/run-history/store/agent-org-container-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { readStoredOrgTree } from "../../../../src/agent-org-execution/container/stored-org-tree.js";
import { writeStoredOrgContainer } from "../../../helpers/stored-org-container.js";
import { CollaborationRootHistoryService } from "../../../../src/run-history/services/collaboration-root-history-service.js";
import { projectAgentOrgRunHistoryRow } from "../../../../src/run-history/services/agent-org-run-history-row-projector.js";


const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

// Check every public field, not just a set of IDs. A run its agents delegated to is its own run (autobyteus-461): the
// history row holds the Org's own parts only (its delegated runs are its tree's rows, SR-084). A stopped Org is a stored
// container whose tree is composed from its units' files (org-teams-follow-definition): a direct agent and a mounted Team.
const setup = async (active: boolean) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-history-public-"));
  roots.push(memoryDir);
  await writeStoredOrgContainer(memoryDir, { orgRunId: "org-root", createdAt: "2026-10-03T00:00:00.000Z", handoffs: [{ from: "/manager", to: "/configured/lead", rules: ["coordinate"] }], units: [
    { kind: "agent", address: "/manager", runId: "manager" },
    { kind: "agent_team", address: "/configured", runId: "configured-team", coordinatorAddress: "/lead",
      members: [{ address: "/lead", agentRunId: "configured-lead", workspaceRootPath: "/tmp/test-owned-projection-workspace" }] }] });
  const tree = (await readStoredOrgTree(memoryDir, "org-root"))!;
  const expected = agentOrgExecutionTreeDtoSchema.parse(JSON.parse(JSON.stringify(tree)));
  const store = AgentOrgContainerStore.prototype;
  const packagePath = new AgentMemoryLayout(memoryDir).getOrgDirPath("org-root");
  const file = getAgentOrgRunExecutionTreePath(packagePath);
  const bytes = await fs.readFile(file);
  const write = vi.spyOn(store, "write");
  const getExecutionTreeSnapshot = vi.fn(() => tree);
  const catalog = [projectAgentOrgRunHistoryRow(tree)];
  const service = new CollaborationRootHistoryService({ tree: noDelegations(),
    memoryDir,
    teams: { listTeamRunHistory: async () => [] },
    orgs: { listCatalogRows: async () => catalog, getCatalogRow: async (id: string) => catalog.find(row => row.orgRunId === id) ?? null },
    orgRuns: { getActive: vi.fn(() => active ? { getExecutionTreeSnapshot } : null) } as never,
  });
  return { memoryDir, tree, expected, store, packagePath, file, bytes, write, getExecutionTreeSnapshot, catalog, service };
};

describe("mixed public history Org projection", () => {
  it.each([[false, "list"], [true, "list"], [false, "scoped"], [true, "scoped"]] as const)(
    "strictly projects active=%s via %s without losing any public field or private bytes", async (active, surface) => {
    const current = await setup(active);
    const privateBefore = JSON.stringify(current.tree);
    // Repeated normal reads have the same result, never a write/migration/restore.
    for (let attempt = 0; attempt < 2; attempt++) {
      const rows = surface === "list" ? await current.service.list() : [await current.service.getAgentOrg(" org-root ")];
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row).toMatchObject({ root_subject_kind: "agent_org", root_run_id: "org-root", is_active: active });
      if (row.root_subject_kind !== "agent_org") throw new Error("Expected Org branch");
      expect(agentOrgExecutionTreeDtoSchema.parse(row.org)).toEqual(current.expected);
      expect(row.org).toEqual(current.expected);
      expect(JSON.stringify(current.tree)).toBe(privateBefore);
      expect(await fs.readFile(current.file)).toEqual(current.bytes);
    }
    expect(current.write).not.toHaveBeenCalled();
    expect(current.getExecutionTreeSnapshot).toHaveBeenCalledTimes(active ? 2 : 0);
  });

  it("uses the active snapshot rather than a stale stored copy and leaves that copy intact", async () => {
    const current = await setup(true);
    current.getExecutionTreeSnapshot.mockReturnValue({ ...current.tree, rootOrg: { ...current.tree.rootOrg, orgDefinitionName: "Active current name" } });
    const rows = await current.service.list();
    expect(rows[0]).toMatchObject({ org: { rootOrg: { orgDefinitionName: "Active current name" } } });
    expect(await current.service.getAgentOrg("org-root")).toEqual(rows[0]);
    expect(current.write).not.toHaveBeenCalled();
    expect(await fs.readFile(current.file)).toEqual(current.bytes);
  });

  it("retains mixed family ordering and the existing archived inactive exclusion", async () => {
    const current = await setup(false);
    const team = { teamRunId: "team-root", createdAt: "2026-10-04T00:00:00.000Z", archivedAt: null, isActive: false, summary: "Team" };
    const service = new CollaborationRootHistoryService({ tree: noDelegations(),
      memoryDir: roots.at(-1)!, teams: { listTeamRunHistory: async () => [team] } as never,
      orgs: { listCatalogRows: async () => current.catalog, getCatalogRow: async (id: string) => current.catalog.find(row => row.orgRunId === id) ?? null },
      orgRuns: { getActive: () => null },
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
    const current = await setup(true);
    const list = vi.spyOn(current.service, "list");
    expect(await current.service.getAgentOrg("missing")).toBeNull();
    await expect(current.service.getAgentOrg(" ")).rejects.toThrow("orgRunId is required");
    expect(list).not.toHaveBeenCalled();
    current.catalog[0] = { ...current.catalog[0]!, archivedAt: "2026-10-03T02:00:00.000Z" };
    expect(await current.service.getAgentOrg("org-root")).toMatchObject({ is_active: true, archived_at: current.catalog[0].archivedAt });
    current.getExecutionTreeSnapshot.mockReturnValue({ ...current.tree, rootOrg: { ...current.tree.rootOrg, orgRunId: "other-root" } });
    await expect(current.service.getAgentOrg("org-root")).rejects.toThrow("history root mismatch");
    await expect(current.service.list()).rejects.toThrow("history root mismatch");
    expect(current.write).not.toHaveBeenCalled();
    expect(await fs.readFile(current.file)).toEqual(current.bytes);
  });

  it("carries each Org and Team root's last activity (workspace-tree-vs-chooser DS-005)", async () => {
    const current = await setup(false);
    const forOrgRun = vi.fn(async () => "2026-11-05T09:30:00.000Z");
    const team = { teamRunId: "team-root", createdAt: "2026-11-01T00:00:00.000Z", lastActivityAt: "2026-11-04T00:00:00.000Z",
      archivedAt: null, isActive: false, summary: "" };
    const service = new CollaborationRootHistoryService({ tree: noDelegations(),
      memoryDir: current.memoryDir,
      teams: { listTeamRunHistory: async () => [team as never] },
      orgs: { listCatalogRows: async () => current.catalog, getCatalogRow: async () => current.catalog[0]! },
      orgRuns: { getActive: () => null } as never,
      lastActivity: { forOrgRun },
    });
    const rows = await service.list();
    expect(rows.find((row) => row.root_subject_kind === "agent_org")?.last_activity_at).toBe("2026-11-05T09:30:00.000Z");
    expect(rows.find((row) => row.root_subject_kind === "agent_team")?.last_activity_at).toBe("2026-11-04T00:00:00.000Z");
    expect(forOrgRun).toHaveBeenCalledWith({ orgRunId: "org-root", createdAt: current.catalog[0]!.createdAt });
  });
});
