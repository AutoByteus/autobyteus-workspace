import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CollaborationRunHistoryCatalogCore,
  resetCollaborationRunHistoryCatalogState,
} from "../../../../src/run-history/services/collaboration-run-history-catalog-core.js";

type Row = { id: string; summary: string; createdAt: string; terminatedAt: string | null };
const roots = ["/tmp/core-parity-a", "/tmp/core-parity-b"];
afterEach(() => {
  for (const root of roots) for (const family of ["agent_team", "agent_org"] as const)
    resetCollaborationRunHistoryCatalogState(root, family);
});
const makeCore = (root: string, family: "agent_team" | "agent_org", persisted: Row[], admitted: Set<string>) => {
  const readRows = vi.fn(async () => persisted);
  const writeRows = vi.fn(async (rows: readonly Row[]) => { persisted = [...rows]; });
  const awaitReady = vi.fn(async () => undefined);
  const core = new CollaborationRunHistoryCatalogCore<Row>(root, family, {
    idOf: (row) => row.id, readRows, writeRows, awaitReady,
    isAdmitted: (id) => admitted.has(id),
  });
  return { core, readRows, writeRows, awaitReady, get persisted() { return persisted; } };
};
const row = (id: string, summary = ""): Row => ({ id, summary, createdAt: "2026-09-24T00:00:00.000Z", terminatedAt: null });

describe("CollaborationRunHistoryCatalogCore", () => {
  for (const family of ["agent_team", "agent_org"] as const) {
    it(`${family}: fresh instances query only admitted index rows without writes`, async () => {
      const admitted = new Set(["visible"]);
      const first = makeCore(roots[0], family, [row("visible", "  hello  "), row("hidden")], admitted);
      expect(await first.core.listCatalogRows()).toEqual([row("visible", "hello")]);
      expect(await first.core.getCatalogRow("hidden")).toBeNull();
      expect(first.readRows).toHaveBeenCalledTimes(1);
      expect(first.writeRows).not.toHaveBeenCalled();
      const second = makeCore(roots[0], family, [], admitted);
      expect(await second.core.listCatalogRows()).toEqual([row("visible", "hello")]);
      expect(second.readRows).not.toHaveBeenCalled();
      await second.core.withQueue(async () => {
        const rows = second.core.rowsInQueue();
        rows.set("visible", row("visible", "updated"));
        await second.core.commitInQueue(rows);
      });
      expect(second.persisted).toHaveLength(2); // An unrelated write must not prune the unadmitted row.
      admitted.add("hidden");
      expect(await second.core.listCatalogRows()).toHaveLength(2);
      expect(first.writeRows).not.toHaveBeenCalled();
    });
  }

  it("isolates directories and families while sharing same-family queued commits", async () => {
    const admitted = new Set(["one"]);
    const team = makeCore(roots[0], "agent_team", [row("one")], admitted);
    const sameFamily = makeCore(roots[0], "agent_team", [], admitted);
    const org = makeCore(roots[0], "agent_org", [], admitted);
    const otherRoot = makeCore(roots[1], "agent_team", [], admitted);
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const first = team.core.withQueue(async () => {
      const rows = team.core.rowsInQueue();
      rows.set("one", row("one", "first"));
      await barrier;
      await team.core.commitInQueue(rows);
    });
    const second = sameFamily.core.withQueue(async () => {
      const rows = sameFamily.core.rowsInQueue();
      rows.set("one", row("one", "second"));
      await sameFamily.core.commitInQueue(rows);
    });
    await Promise.all([org.core.listCatalogRows(), otherRoot.core.listCatalogRows()]);
    expect(await org.core.listCatalogRows()).toEqual([]);
    expect(await otherRoot.core.listCatalogRows()).toEqual([]);
    release();
    await Promise.all([first, second]);
    expect(await team.core.getCatalogRow("one")).toMatchObject({ summary: "second" });
    expect(team.writeRows).toHaveBeenCalledTimes(1);
    expect(sameFamily.writeRows).toHaveBeenCalledTimes(1);
  });

  it("retries strict read failures without overwriting the index", async () => {
    const readRows = vi.fn().mockRejectedValueOnce(new Error("corrupt index")).mockResolvedValueOnce([]);
    const writeRows = vi.fn();
    const core = new CollaborationRunHistoryCatalogCore<Row>(roots[0], "agent_team", {
      idOf: (value) => value.id, readRows, writeRows,
      awaitReady: async () => undefined, isAdmitted: () => true,
    });
    await expect(core.listCatalogRows()).rejects.toThrow("corrupt index");
    await expect(core.listCatalogRows()).resolves.toEqual([]);
    expect(readRows).toHaveBeenCalledTimes(2);
    expect(writeRows).not.toHaveBeenCalled();
  });
});
