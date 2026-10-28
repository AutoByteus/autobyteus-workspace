import { describe, expect, it, vi } from "vitest";
import { ApplicationCatalogTransitionService } from "../../../src/application-orchestration/services/application-catalog-transition-service.js";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
};

const application = (id: string, packageId = "pkg-a") => ({
  id,
  packageId,
  agentTools: [],
});

const candidate = (applications: ReturnType<typeof application>[], scope: "package" | "application" = "package") => ({
  owner: {} as never,
  scope: scope === "package"
    ? { kind: "package" as const, packageId: "pkg-a" }
    : { kind: "application" as const, applicationId: applications[0]?.id ?? "app-a", packageId: "pkg-a" },
  applications,
  diagnostics: [],
  refreshedAt: "2026-08-27T00:00:00.000Z",
});

const buildHarness = (input: {
  oldApplications?: ReturnType<typeof application>[];
  packageCandidate?: ReturnType<typeof candidate>;
  applicationCandidate?: ReturnType<typeof candidate>;
  stagePackage?: () => Promise<ReturnType<typeof candidate>>;
} = {}) => {
  const order: string[] = [];
  let snapshotCount = 0;
  const oldApplications = input.oldApplications ?? [application("app-a"), application("app-b"), application("app-c", "pkg-c")];
  const reentryService = {
    prepareParticipants: vi.fn(async (ids: string[]) => {
      const sorted = [...ids].sort();
      order.push(`prepare:${sorted.join(",")}`);
      return {
        owner: reentryService,
        participants: sorted.map((applicationId) => ({ applicationId, priorAvailability: null })),
      };
    }),
    recoverParticipants: vi.fn(async (_token: unknown, current: string[], setupRequired: ReadonlyMap<string, string>, options: unknown) => {
      // `recover:<current>:<not ready, with their setup reasons>:<options>`
      const notReady = [...setupRequired].map(([id, detail]) => `${id}=${detail}`).sort().join(",");
      order.push(`recover:${[...current].sort().join(",")}:${notReady}:${JSON.stringify(options)}`);
      return new Map();
    }),
    quarantineParticipants: vi.fn(async () => { order.push("quarantine"); }),
  };
  const bundleService = {
    getCatalogSnapshot: vi.fn(async () => {
      snapshotCount += 1;
      order.push(snapshotCount === 1 ? "snapshot.live" : "snapshot.committed");
      return { applications: oldApplications, diagnostics: [], refreshedAt: "now" };
    }),
    stagePackageCatalog: vi.fn(input.stagePackage ?? (async () => {
      order.push("stage.package");
      return input.packageCandidate ?? candidate([]);
    })),
    stageApplicationCatalog: vi.fn(async () => {
      order.push("stage.application");
      return input.applicationCandidate ?? candidate([application("app-a")], "application");
    }),
    prepareCatalogSlice: vi.fn((value: unknown) => {
      order.push("bundle.prepare");
      return { value };
    }),
    commitPreparedCatalogSlice: vi.fn(() => { order.push("bundle.commit"); }),
  };
  const applicationAgentToolCatalog = {
    prepareDelta: vi.fn(() => {
      order.push("tool.prepare");
      return {};
    }),
    commitPreparedDelta: vi.fn(() => { order.push("tool.commit"); }),
  };
  const readiness = {
    prepare: vi.fn(async () => { order.push("readiness"); }),
    getSetupRequiredDetail: vi.fn((_applicationId: string): string | null => null),
  };
  const storageLifecycleService = {
    ensureRuntimeDirectoryPrepared: vi.fn(async (applicationId: string) => {
      order.push(`runtime:${applicationId}`);
      return {} as never;
    }),
  };
  const availability = {
    getAvailability: vi.fn(async (applicationId: string) => ({
      applicationId,
      state: "ACTIVE",
      detail: null,
      updatedAt: "now",
    })),
  };
  const service = new ApplicationCatalogTransitionService({
    bundleService,
    applicationAgentToolCatalog,
    reentryService,
    catalogReconciliation: {
      reconcile: vi.fn(async () => { order.push("reconcile"); }),
    },
    definitionReadiness: readiness,
    availabilityService: availability,
    storageLifecycleService,
  } as never);
  return {
    service,
    order,
    storageLifecycleService,
    bundleService,
    applicationAgentToolCatalog,
    reentryService,
    readiness,
    availability,
  };
};

describe("ApplicationCatalogTransitionService", () => {
  it("drains only old target-package participants before mutation and commits paired target slices before recovery", async () => {
    const harness = buildHarness({ packageCandidate: candidate([]) });
    const mutationValue = { removed: true };

    await expect(harness.service.runPackageTransition({
      kind: "remove",
      packageId: "pkg-a",
      applyBeforeStage: async () => {
        harness.order.push("apply");
        return mutationValue;
      },
      finalizeAfterCommit: async (value) => {
        expect(value).toBe(mutationValue);
        harness.order.push("finalize");
      },
      rollbackSource: async () => { harness.order.push("rollback"); },
    })).resolves.toBe(mutationValue);

    expect(harness.order).toEqual([
      "snapshot.live",
      "prepare:app-a,app-b",
      "apply",
      "stage.package",
      "bundle.prepare",
      "tool.prepare",
      "bundle.commit",
      "tool.commit",
      "snapshot.committed",
      "reconcile",
      "readiness",
      "recover:::{}",
      "finalize",
    ]);
    expect(harness.reentryService.prepareParticipants).not.toHaveBeenCalledWith(
      expect.arrayContaining(["app-c"]),
    );
  });

  it("serializes concurrent package transitions while ordinary work remains outside its mutex", async () => {
    const firstApply = deferred<void>();
    const harness = buildHarness({ oldApplications: [] });
    const first = harness.service.runPackageTransition({
      kind: "import",
      packageId: "pkg-a",
      applyBeforeStage: async () => {
        harness.order.push("apply.first.start");
        await firstApply.promise;
        harness.order.push("apply.first.finish");
        return "first";
      },
      rollbackSource: async () => undefined,
    });
    const second = harness.service.runPackageTransition({
      kind: "import",
      packageId: "pkg-b",
      applyBeforeStage: async () => {
        harness.order.push("apply.second");
        return "second";
      },
      rollbackSource: async () => undefined,
    });

    await vi.waitFor(() => expect(harness.order).toContain("apply.first.start"));
    expect(harness.order).not.toContain("apply.second");
    harness.order.push("ordinary.application.call");
    firstApply.resolve();

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    expect(harness.order.indexOf("apply.first.finish"))
      .toBeLessThan(harness.order.indexOf("apply.second"));
    expect(harness.order.indexOf("ordinary.application.call"))
      .toBeLessThan(harness.order.indexOf("apply.first.finish"));
  });

  it("restores and re-stages actual source state before rethrowing the original transition failure", async () => {
    const failure = new Error("candidate invalid");
    let stageCount = 0;
    const restored = candidate([application("app-a")]);
    const harness = buildHarness({
      stagePackage: async () => {
        stageCount += 1;
        harness.order.push(`stage.${stageCount}`);
        if (stageCount === 1) throw failure;
        return restored;
      },
    });

    await expect(harness.service.runPackageTransition({
      kind: "reload",
      packageId: "pkg-a",
      applyBeforeStage: async () => {
        harness.order.push("apply");
        return "mutated";
      },
      rollbackSource: async (value, cause) => {
        expect(value).toBe("mutated");
        expect(cause).toBe(failure);
        harness.order.push("rollback.source");
      },
    })).rejects.toBe(failure);

    expect(harness.order).toContain("rollback.source");
    expect(harness.order.indexOf("rollback.source")).toBeLessThan(harness.order.indexOf("stage.2"));
    expect(harness.order.indexOf("tool.commit")).toBeLessThan(harness.order.indexOf("recover:app-a::{}"));
    expect(harness.reentryService.quarantineParticipants).not.toHaveBeenCalled();
  });

  it("quarantines affected participants and releases the mutex when rollback restoration also fails", async () => {
    const harness = buildHarness({
      stagePackage: async () => { throw new Error("stage failed"); },
    });

    await expect(harness.service.runPackageTransition({
      kind: "reload",
      packageId: "pkg-a",
      applyBeforeStage: async () => "mutated",
      rollbackSource: async () => { throw new Error("restore failed"); },
    })).rejects.toMatchObject({ name: "AggregateError" });
    expect(harness.reentryService.quarantineParticipants).toHaveBeenCalledTimes(1);

    harness.bundleService.stagePackageCatalog.mockResolvedValue(candidate([]) as never);
    await expect(harness.service.runPackageTransition({
      kind: "remove",
      packageId: "pkg-a",
      applyBeforeStage: async () => "next",
      rollbackSource: async () => undefined,
    })).resolves.toBe("next");
  });

  it("prepares each current application's runtime folder after the commits and before readiness on import", async () => {
    const harness = buildHarness({
      oldApplications: [],
      packageCandidate: candidate([application("app-a"), application("app-b")]),
    });

    await expect(harness.service.runPackageTransition({
      kind: "import",
      packageId: "pkg-a",
      applyBeforeStage: async () => "imported",
      rollbackSource: async () => undefined,
    })).resolves.toBe("imported");

    expect(harness.order.slice(harness.order.indexOf("tool.commit"))).toEqual([
      "tool.commit",
      "runtime:app-a",
      "runtime:app-b",
      "snapshot.committed",
      "reconcile",
      "readiness",
      "recover:app-a,app-b::{}",
    ]);
  });

  it("prepares the reloaded application's runtime folder before readiness", async () => {
    const harness = buildHarness({
      oldApplications: [application("app-a")],
      applicationCandidate: candidate([application("app-a")], "application"),
    });

    await harness.service.reloadAndReenter("app-a");

    expect(harness.storageLifecycleService.ensureRuntimeDirectoryPrepared)
      .toHaveBeenCalledExactlyOnceWith("app-a");
    expect(harness.order.indexOf("runtime:app-a")).toBeGreaterThan(harness.order.indexOf("tool.commit"));
    expect(harness.order.indexOf("runtime:app-a")).toBeLessThan(harness.order.indexOf("readiness"));
  });

  it("uses the same staged owner for exact-application repair and can recover a previously inactive participant", async () => {
    const harness = buildHarness({
      oldApplications: [application("app-a")],
      applicationCandidate: candidate([application("app-a")], "application"),
    });

    await expect(harness.service.reloadAndReenter("app-a")).resolves.toMatchObject({
      applicationId: "app-a",
      state: "ACTIVE",
    });

    expect(harness.bundleService.stageApplicationCatalog).toHaveBeenCalledWith("app-a");
    expect(harness.reentryService.recoverParticipants).toHaveBeenCalledWith(
      expect.anything(),
      ["app-a"],
      new Map(),
      { recoverPreviouslyInactive: true },
    );
  });

  it("passes each not-ready current application's setup reason from readiness to reentry (autobyteus-296, AC-006)", async () => {
    const harness = buildHarness({
      oldApplications: [],
      packageCandidate: candidate([application("app-a"), application("app-b")]),
    });
    const detail = "Application setup is required: app-b/slot:draftingTeam: Codex App Server authentication is unavailable: no logged-in account.";
    harness.readiness.getSetupRequiredDetail.mockImplementation((applicationId: string) =>
      applicationId === "app-b" ? detail : null);

    await harness.service.runPackageTransition({
      kind: "import",
      packageId: "pkg-a",
      applyBeforeStage: async () => "imported",
      rollbackSource: async () => undefined,
    });

    expect(harness.reentryService.recoverParticipants).toHaveBeenCalledWith(
      expect.anything(), ["app-a", "app-b"], new Map([["app-b", detail]]), {});
    expect(harness.order.indexOf("readiness")).toBeLessThan(harness.order.indexOf(`recover:app-a,app-b:app-b=${detail}:{}`));
  });
});
