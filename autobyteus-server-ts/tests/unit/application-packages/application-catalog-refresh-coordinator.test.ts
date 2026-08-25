import { describe, expect, it, vi } from "vitest";
import { ApplicationCatalogRefreshCoordinator } from "../../../src/application-packages/services/application-catalog-refresh-coordinator.js";

describe("ApplicationCatalogRefreshCoordinator", () => {
  it("propagates one committed package snapshot in the required order", async () => {
    const order: string[] = [];
    const snapshot = { applications: [], diagnostics: [], refreshedAt: "now" };
    const coordinator = new ApplicationCatalogRefreshCoordinator({
      bundleService: {
        refresh: vi.fn(async () => { order.push("bundle.refresh"); }),
        getCatalogSnapshot: vi.fn(async () => {
          order.push("bundle.snapshot");
          return snapshot;
        }),
      },
      catalogReconciliation: {
        reconcile: vi.fn(async (value) => {
          expect(value).toBe(snapshot);
          order.push("catalog.reconcile");
        }),
      },
      agentDefinitionService: {
        refreshCache: vi.fn(async () => { order.push("agents.refresh"); }),
      },
      agentTeamDefinitionService: {
        refreshCache: vi.fn(async () => { order.push("teams.refresh"); }),
      },
    } as never);

    await coordinator.refresh();
    expect(order).toEqual([
      "bundle.refresh",
      "bundle.snapshot",
      "catalog.reconcile",
      "agents.refresh",
      "teams.refresh",
    ]);
  });
});
