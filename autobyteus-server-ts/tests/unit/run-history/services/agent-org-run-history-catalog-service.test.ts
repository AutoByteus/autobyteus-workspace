import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resetCollaborationRunHistoryCatalogState } from "../../../../src/run-history/services/collaboration-run-history-catalog-core.js";
import { AgentOrgRunHistoryCatalogService } from "../../../../src/run-history/services/agent-org-run-history-catalog-service.js";
import type { AgentOrgRunExecutionTreeFileV1 } from "../../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunIndexRowRecord } from "../../../../src/run-history/store/agent-org-run-history-index-record-types.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../../fixtures/current-agent-org-run-fixtures.js";

const tree = testAgentOrgExecutionTree({
  orgRunId: "org-run",
  members: [testOrgAgentNode("/director", "agent-run")],
});
const siblingTree = testAgentOrgExecutionTree({
  orgRunId: "org-sibling",
  members: [testOrgAgentNode("/director", "sibling-agent-run")],
});
const rowFor = (input: AgentOrgRunExecutionTreeFileV1): AgentOrgRunIndexRowRecord => Object.freeze({
  orgRunId: input.rootOrg.orgRunId,
  orgDefinitionId: input.rootOrg.orgDefinitionId,
  orgDefinitionName: input.rootOrg.orgDefinitionName,
  workspaceRootPath: input.rootOrg.defaultLaunchConfiguration.workspaceRootPath,
  summary: "",
  createdAt: input.createdAt,
  archivedAt: input.archivedAt,
  terminatedAt: "2026-09-20T00:00:00.000Z",
});

const harness = (options: { active?: boolean; includeSibling?: boolean; removalFails?: boolean } = {}) => {
  let persisted: readonly AgentOrgRunIndexRowRecord[] = [rowFor(tree), ...(options.includeSibling ? [rowFor(siblingTree)] : [])];
  let failIndexWrites = 0;
  const treesById = new Map<string, AgentOrgRunExecutionTreeFileV1>([
    ["org-run", structuredClone(tree)],
    ...(options.includeSibling ? [["org-sibling", structuredClone(siblingTree)] as const] : []),
  ]);
  const index = {
    readIndex: vi.fn(async () => structuredClone(persisted)),
    writeIndex: vi.fn(async (rows: readonly AgentOrgRunIndexRowRecord[]) => {
      if (failIndexWrites > 0) { failIndexWrites -= 1; throw new Error("index write failed"); }
      persisted = structuredClone(rows);
    }),
  };
  const packages = {
    awaitReady: vi.fn(async () => undefined),
    rebuild: vi.fn(async () => undefined),
    listAdmitted: vi.fn(() => [...treesById.keys()]),
    isAdmitted: vi.fn((id: string) => treesById.has(id)),
    exclude: vi.fn(),
  };
  const trees = {
    read: vi.fn(async (_directory: string, orgRunId: string) => structuredClone(treesById.get(orgRunId) ?? null)),
    write: vi.fn(async (_directory: string, value: AgentOrgRunExecutionTreeFileV1) => {
      treesById.set(value.rootOrg.orgRunId, structuredClone(value));
      return { outcome: "committed" as const };
    }),
  };
  const manager = {
    withInactiveHistoryMutation: vi.fn(async (_orgRunId: string, operation: () => Promise<unknown>) =>
      options.active ? { kind: "managed" as const } : { kind: "completed" as const, value: await operation() }),
  };
  const removePackage = vi.fn(async (orgDirPath: string) => {
    if (options.removalFails) throw new Error("removal failed");
    treesById.delete(path.basename(orgDirPath));
  });
  resetCollaborationRunHistoryCatalogState("/unused", "agent_org");
  const catalog = new AgentOrgRunHistoryCatalogService("/unused", manager as never, {
    indexStore: index as never,
    packageCatalog: packages as never,
    treeStore: trees as never,
    removePackage,
  });
  return {
    catalog, index, packages, trees, manager, removePackage, treesById,
    failNextIndexWrite: () => { failIndexWrites += 1; },
    get persisted() { return persisted; },
  };
};

describe("AgentOrgRunHistoryCatalogService", () => {
  it("loads an admitted index once without a tree read or index write", async () => {
    const test = harness();
    await Promise.all([test.catalog.listCatalogRows(), test.catalog.listCatalogRows(), test.catalog.listCatalogRows()]);

    expect(test.packages.awaitReady).toHaveBeenCalledTimes(1);
    expect(test.packages.rebuild).not.toHaveBeenCalled();
    expect(test.index.readIndex).toHaveBeenCalledTimes(1);
    expect(test.packages.listAdmitted).not.toHaveBeenCalled();
    expect(test.trees.read).not.toHaveBeenCalled();
    expect(test.index.writeIndex).not.toHaveBeenCalled();
  });

  it("rejects readiness failures without reading or publishing unvalidated history", async () => {
    const test = harness();
    test.packages.awaitReady.mockRejectedValueOnce(new Error("Strict root readiness failed."));

    await expect(test.catalog.listCatalogRows()).rejects.toThrow("Strict root readiness failed.");
    expect(test.packages.rebuild).not.toHaveBeenCalled();
    expect(test.index.readIndex).not.toHaveBeenCalled();
    expect(test.trees.read).not.toHaveBeenCalled();
    expect(test.index.writeIndex).not.toHaveBeenCalled();
  });

  it("serializes first-write attempts and keeps the first enqueued accepted completion", async () => {
    const test = harness();
    await test.catalog.listCatalogRows();
    const firstEnqueued = test.catalog.recordRunSummary({ orgRunId: "org-run", summary: "Second socket completed first" });
    const secondEnqueued = test.catalog.recordRunSummary({ orgRunId: "org-run", summary: "First socket completed later" });
    await Promise.all([firstEnqueued, secondEnqueued]);
    expect((await test.catalog.listCatalogRows())[0]?.summary).toBe("Second socket completed first");
    expect(test.persisted[0]?.summary).toBe("Second socket completed first");
  });

  it("archives through the inactive manager lane, preserves the package, and keeps one idempotent timestamp", async () => {
    const test = harness({ includeSibling: true });
    await test.catalog.listCatalogRows();

    const first = await test.catalog.archiveStored("org-run");
    const archivedTree = test.treesById.get("org-run")!;
    const firstTimestamp = archivedTree.archivedAt;
    const second = await test.catalog.archiveStored("org-run");

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(firstTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(test.treesById.get("org-run")?.archivedAt).toBe(firstTimestamp);
    expect(test.treesById.get("org-run")?.rootOrg.members).toEqual(tree.rootOrg.members);
    expect(test.treesById.get("org-sibling")).toEqual(siblingTree);
    expect(test.persisted.find((row) => row.orgRunId === "org-run")?.archivedAt).toBe(firstTimestamp);
    expect(test.persisted.find((row) => row.orgRunId === "org-sibling")).toEqual(rowFor(siblingTree));
    expect(test.manager.withInactiveHistoryMutation).toHaveBeenCalledTimes(2);
    expect(test.removePackage).not.toHaveBeenCalled();
  });

  it("restores the original tree and index when archive index publication fails", async () => {
    const test = harness();
    await test.catalog.listCatalogRows();
    test.failNextIndexWrite();

    const result = await test.catalog.archiveStored("org-run");

    expect(result.success).toBe(false);
    expect(test.treesById.get("org-run")).toEqual(tree);
    expect(test.persisted).toEqual([rowFor(tree)]);
    expect((await test.catalog.listCatalogRows())[0]).toEqual(rowFor(tree));
  });

  it("deletes only the exact stopped package and index row after verified readback", async () => {
    const test = harness({ includeSibling: true });
    await test.catalog.listCatalogRows();

    const result = await test.catalog.deleteStored("org-run");

    expect(result.success).toBe(true);
    expect(test.removePackage).toHaveBeenCalledWith(path.join("/unused", "agent_orgs", "org-run"));
    expect(test.treesById.has("org-run")).toBe(false);
    expect(test.treesById.get("org-sibling")).toEqual(siblingTree);
    expect(test.persisted).toEqual([rowFor(siblingTree)]);
    expect(await test.catalog.listCatalogRows()).toEqual([rowFor(siblingTree)]);
    expect(test.packages.exclude).toHaveBeenCalledWith("org-run", expect.stringContaining("deleted permanently"));
  });

  it("restores the exact index row when package removal fails and the package remains intact", async () => {
    const test = harness({ removalFails: true });
    await test.catalog.listCatalogRows();

    const result = await test.catalog.deleteStored("org-run");

    expect(result.success).toBe(false);
    expect(result.message).toContain("removal failed");
    expect(test.treesById.get("org-run")).toEqual(tree);
    expect(test.persisted).toEqual([rowFor(tree)]);
    expect(test.packages.exclude).not.toHaveBeenCalled();
  });

  it("rejects active, unknown, and unsafe identities without mutating durable state", async () => {
    const active = harness({ active: true });
    await active.catalog.listCatalogRows();
    await expect(active.catalog.archiveStored("org-run")).resolves.toMatchObject({ success: false, message: expect.stringContaining("active") });
    await expect(active.catalog.deleteStored("org-run")).resolves.toMatchObject({ success: false, message: expect.stringContaining("active") });
    expect(active.trees.write).not.toHaveBeenCalled();
    expect(active.removePackage).not.toHaveBeenCalled();

    const inactive = harness();
    await inactive.catalog.listCatalogRows();
    await expect(inactive.catalog.archiveStored("missing")).resolves.toMatchObject({ success: false, message: expect.stringContaining("not found") });
    await expect(inactive.catalog.deleteStored("../org-run")).resolves.toMatchObject({ success: false, message: expect.stringContaining("Invalid") });
    await expect(inactive.catalog.archiveStored(" org-run ")).resolves.toMatchObject({ success: false, message: expect.stringContaining("Invalid") });
    expect(inactive.removePackage).not.toHaveBeenCalled();
  });

  it("preserves a committed summary through restore projections", async () => {
    const test = harness();
    await test.catalog.recordRunSummary({ orgRunId: "org-run", summary: "Stable first message" });
    await test.catalog.recordRestored(tree);
    expect((await test.catalog.listCatalogRows())[0]?.summary).toBe("Stable first message");
  });
});
