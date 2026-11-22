import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetCollaborationRunHistoryCatalogState } from "../../../../src/run-history/services/collaboration-run-history-catalog-core.js";
import { AgentOrgRunHistoryCatalogService } from "../../../../src/run-history/services/agent-org-run-history-catalog-service.js";
import { AgentOrgContainerStore } from "../../../../src/run-history/store/agent-org-container-store.js";
import type { AgentOrgContainerFile } from "../../../../src/agent-org-execution/domain/agent-org-container-file.js";
import type { AgentOrgRunIndexRowRecord } from "../../../../src/run-history/store/agent-org-run-history-index-record-types.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { writeStoredOrgContainer } from "../../../helpers/stored-org-container.js";

/**
 * The Org history catalog over stored Org containers (org-teams-follow-definition): archive marks the container file, delete
 * removes the Org's unit runs and its own folder; readiness admits only containers, so nothing else reaches it.
 */
const tree = testAgentOrgExecutionTree({ orgRunId: "org-run", members: [testOrgAgentNode("/director", "agent-run")] });
const CREATED = "2026-11-22T00:00:00.000Z";
const rowFor = (orgRunId: string, archivedAt: string | null = null): AgentOrgRunIndexRowRecord => Object.freeze({
  orgRunId, orgDefinitionId: `${orgRunId}-def`, orgDefinitionName: orgRunId, workspaceRootPath: "/workspace", summary: "",
  createdAt: CREATED, archivedAt, terminatedAt: "2026-11-22T01:00:00.000Z",
});
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const harness = async (options: { active?: boolean; includeSibling?: boolean } = {}) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-history-catalog-"));
  dirs.push(memoryDir);
  const ids = ["org-run", ...(options.includeSibling ? ["org-sibling"] : [])];
  for (const orgRunId of ids) {
    await writeStoredOrgContainer(memoryDir, { orgRunId, createdAt: CREATED, units: [{ kind: "agent", address: "/director", runId: `${orgRunId}-director` }] });
  }
  let persisted: readonly AgentOrgRunIndexRowRecord[] = ids.map((id) => rowFor(id));
  let failIndexWrites = 0;
  const index = {
    readIndex: vi.fn(async () => structuredClone(persisted)),
    writeIndex: vi.fn(async (rows: readonly AgentOrgRunIndexRowRecord[]) => {
      if (failIndexWrites > 0) { failIndexWrites -= 1; throw new Error("index write failed"); }
      persisted = structuredClone(rows);
    }),
  };
  const packages = { awaitReady: vi.fn(async () => undefined), rebuild: vi.fn(async () => undefined), listAdmitted: vi.fn(() => ids),
    isAdmitted: vi.fn((id: string) => ids.includes(id)), exclude: vi.fn() };
  const manager = {
    withInactiveHistoryMutation: vi.fn(async (_orgRunId: string, operation: () => Promise<unknown>) =>
      options.active ? { kind: "managed" as const } : { kind: "completed" as const, value: await operation() }),
  };
  const removePackage = vi.fn(async (dir: string) => fs.rm(dir, { recursive: true, force: true }));
  resetCollaborationRunHistoryCatalogState(memoryDir, "agent_org");
  const catalog = new AgentOrgRunHistoryCatalogService(memoryDir, manager as never, { indexStore: index as never, packageCatalog: packages as never, removePackage });
  const container = (orgRunId: string): Promise<AgentOrgContainerFile | null> =>
    new AgentOrgContainerStore().readIfContainer(path.join(memoryDir, "agent_orgs", orgRunId), orgRunId);
  return { memoryDir, catalog, index, packages, manager, removePackage, container,
    failNextIndexWrite: () => { failIndexWrites += 1; }, get persisted() { return persisted; } };
};

describe("AgentOrgRunHistoryCatalogService", () => {
  it("loads an admitted index once without an index write", async () => {
    const test = await harness();
    await Promise.all([test.catalog.listCatalogRows(), test.catalog.listCatalogRows(), test.catalog.listCatalogRows()]);

    expect(test.packages.awaitReady).toHaveBeenCalledTimes(1);
    expect(test.packages.rebuild).not.toHaveBeenCalled();
    expect(test.index.readIndex).toHaveBeenCalledTimes(1);
    expect(test.packages.listAdmitted).not.toHaveBeenCalled();
    expect(test.index.writeIndex).not.toHaveBeenCalled();
  });

  it("rejects readiness failures without reading or publishing unvalidated history", async () => {
    const test = await harness();
    test.packages.awaitReady.mockRejectedValueOnce(new Error("Strict root readiness failed."));

    await expect(test.catalog.listCatalogRows()).rejects.toThrow("Strict root readiness failed.");
    expect(test.packages.rebuild).not.toHaveBeenCalled();
    expect(test.index.readIndex).not.toHaveBeenCalled();
    expect(test.index.writeIndex).not.toHaveBeenCalled();
  });

  it("serializes first-write attempts and keeps the first enqueued accepted completion", async () => {
    const test = await harness();
    await test.catalog.listCatalogRows();
    const firstEnqueued = test.catalog.recordRunSummary({ orgRunId: "org-run", summary: "Second socket completed first" });
    const secondEnqueued = test.catalog.recordRunSummary({ orgRunId: "org-run", summary: "First socket completed later" });
    await Promise.all([firstEnqueued, secondEnqueued]);
    expect((await test.catalog.listCatalogRows())[0]?.summary).toBe("Second socket completed first");
    expect(test.persisted[0]?.summary).toBe("Second socket completed first");
  });

  it("archives through the inactive manager lane: the container file marked once (idempotent timestamp), its units and the sibling untouched", async () => {
    const test = await harness({ includeSibling: true });
    await test.catalog.listCatalogRows();
    const sibling = await test.container("org-sibling");
    const first = await test.catalog.archiveStored("org-run");
    const firstTimestamp = (await test.container("org-run"))!.archivedAt;
    const second = await test.catalog.archiveStored("org-run");
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(firstTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect((await test.container("org-run"))!.archivedAt).toBe(firstTimestamp);
    expect((await test.container("org-run"))!.rootOrg.units.map((unit) => unit.runId)).toEqual(["org-run-director"]);
    expect(await test.container("org-sibling")).toEqual(sibling);
    expect(test.persisted.find((row) => row.orgRunId === "org-run")?.archivedAt).toBe(firstTimestamp);
    expect(test.persisted.find((row) => row.orgRunId === "org-sibling")).toEqual(rowFor("org-sibling"));
    expect(test.manager.withInactiveHistoryMutation).toHaveBeenCalledTimes(2);
    expect(test.removePackage).not.toHaveBeenCalled();
  });

  it("restores the original container file and index when archive index publication fails", async () => {
    const test = await harness();
    await test.catalog.listCatalogRows();
    const original = await test.container("org-run");
    test.failNextIndexWrite();
    const result = await test.catalog.archiveStored("org-run");
    expect(result.success).toBe(false);
    expect(await test.container("org-run")).toEqual(original);
    expect(test.persisted).toEqual([rowFor("org-run")]);
  });

  it("deletes the stopped Org's unit runs and its own folder and index row; the sibling stays", async () => {
    const test = await harness({ includeSibling: true });
    await test.catalog.listCatalogRows();
    const result = await test.catalog.deleteStored("org-run");
    expect(result.success).toBe(true);
    expect(test.removePackage).toHaveBeenCalledWith(path.join(test.memoryDir, "agents", "org-run-director"));
    expect(test.removePackage).toHaveBeenCalledWith(path.join(test.memoryDir, "agent_orgs", "org-run"));
    expect(await test.container("org-run")).toBeNull();
    expect(await test.container("org-sibling")).not.toBeNull();
    expect(test.persisted).toEqual([rowFor("org-sibling")]);
    expect(await test.catalog.listCatalogRows()).toEqual([rowFor("org-sibling")]);
    expect(test.packages.exclude).toHaveBeenCalledWith("org-run", expect.stringContaining("deleted permanently"));
  });

  it("rejects active, unknown, and unsafe identities without mutating durable state", async () => {
    const active = await harness({ active: true });
    await active.catalog.listCatalogRows();
    const before = await active.container("org-run");
    await expect(active.catalog.archiveStored("org-run")).resolves.toMatchObject({ success: false, message: expect.stringContaining("active") });
    await expect(active.catalog.deleteStored("org-run")).resolves.toMatchObject({ success: false, message: expect.stringContaining("active") });
    expect(await active.container("org-run")).toEqual(before);
    expect(active.removePackage).not.toHaveBeenCalled();

    const inactive = await harness();
    await inactive.catalog.listCatalogRows();
    await expect(inactive.catalog.archiveStored("missing")).resolves.toMatchObject({ success: false, message: expect.stringContaining("not found") });
    await expect(inactive.catalog.deleteStored("../org-run")).resolves.toMatchObject({ success: false, message: expect.stringContaining("Invalid") });
    await expect(inactive.catalog.archiveStored(" org-run ")).resolves.toMatchObject({ success: false, message: expect.stringContaining("Invalid") });
    expect(inactive.removePackage).not.toHaveBeenCalled();
  });

  it("preserves a committed summary through restore projections", async () => {
    const test = await harness();
    await test.catalog.recordRunSummary({ orgRunId: "org-run", summary: "Stable first message" });
    await test.catalog.recordRestored(tree);
    expect((await test.catalog.listCatalogRows())[0]?.summary).toBe("Stable first message");
  });
});
