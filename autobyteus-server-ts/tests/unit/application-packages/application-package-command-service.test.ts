import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationPackageCommandService } from "../../../src/application-packages/services/application-package-command-service.js";

const tempRoots: string[] = [];
afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) =>
    fs.rm(root, { recursive: true, force: true })));
});

describe("ApplicationPackageCommandService catalog-transition boundary", () => {
  it("gives local-import source mutation and rollback to the catalog transition owner", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "package-command-"));
    tempRoots.push(root);
    await fs.mkdir(path.join(root, "applications"));
    const order: string[] = [];
    const registry = {
      getBuiltInRootPath: () => path.join(root, "built-in"),
      getBundledSourceRootPath: () => path.join(root, "bundled"),
      addAdditionalRootPath: vi.fn(() => order.push("root.add")),
      upsertLinkedLocalPackage: vi.fn(async () => { order.push("record.upsert"); }),
      listApplicationPackages: vi.fn(async () => []),
      removeAdditionalRootPath: vi.fn(() => order.push("root.remove")),
      removePackageRecord: vi.fn(async () => { order.push("record.remove"); }),
    };
    const provider = {
      validatePackageRoot: vi.fn(async () => { order.push("provider.validate"); }),
    };
    const catalogTransition = {
      runPackageTransition: vi.fn(async (mutation: {
        kind: string;
        applyBeforeStage: () => Promise<unknown>;
        rollbackSource: (value: unknown, cause: unknown) => Promise<void>;
      }) => {
        expect(mutation.kind).toBe("import");
        order.push("transition.begin");
        const value = await mutation.applyBeforeStage();
        order.push("transition.stage.fail");
        const failure = new Error("stage failed");
        await mutation.rollbackSource(value, failure);
        order.push("transition.rollback.staged");
        throw failure;
      }),
    };
    const service = new ApplicationPackageCommandService({
      registry,
      provider,
      catalogTransition,
    } as never);

    await expect(service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: root,
    })).rejects.toThrow("stage failed");
    expect(order).toEqual([
      "provider.validate",
      "transition.begin",
      "root.add",
      "record.upsert",
      "transition.stage.fail",
      "root.remove",
      "record.remove",
      "transition.rollback.staged",
    ]);
  });

  it("deletes a managed install only from the transition finalizer after commit", async () => {
    const managedInstallPath = await fs.mkdtemp(path.join(os.tmpdir(), "managed-package-"));
    tempRoots.push(managedInstallPath);
    const order: string[] = [];
    const target = {
      packageId: "github:owner/repo",
      packageRootPath: managedInstallPath,
      sourceKind: "GITHUB_REPOSITORY",
      managedInstallPath,
      isPlatformOwned: false,
      isRemovable: true,
    };
    const registry = {
      findRegistryEntryById: vi.fn(async () => target),
      findPackageRecord: vi.fn(async () => ({ packageId: target.packageId })),
      listAdditionalRootPaths: vi.fn(() => [managedInstallPath]),
      removeAdditionalRootPath: vi.fn(() => order.push("root.remove")),
      removePackageRecord: vi.fn(async () => { order.push("record.remove"); }),
      listApplicationPackages: vi.fn(async () => {
        order.push("list");
        return [];
      }),
    };
    const catalogTransition = {
      runPackageTransition: vi.fn(async (mutation: {
        kind: string;
        applyBeforeStage: () => Promise<unknown>;
        finalizeAfterCommit?: (value: unknown) => Promise<void>;
      }) => {
        expect(mutation.kind).toBe("remove");
        const value = await mutation.applyBeforeStage();
        await expect(fs.stat(managedInstallPath)).resolves.toBeDefined();
        order.push("transition.commit");
        await mutation.finalizeAfterCommit?.(value);
        order.push("transition.finalized");
        return value;
      }),
    };
    const service = new ApplicationPackageCommandService({
      registry,
      provider: {} as never,
      catalogTransition,
    } as never);

    await expect(service.removeApplicationPackage(target.packageId)).resolves.toEqual([]);
    expect(order).toEqual([
      "root.remove",
      "record.remove",
      "transition.commit",
      "transition.finalized",
      "list",
    ]);
    await expect(fs.stat(managedInstallPath)).rejects.toThrow();
  });

  it("restores removed registry state through the transition rollback callback", async () => {
    const packageRootPath = "/tmp/linked-package";
    const order: string[] = [];
    const target = {
      packageId: "local:linked",
      packageRootPath,
      sourceKind: "LOCAL_PATH",
      managedInstallPath: null,
      isPlatformOwned: false,
      isRemovable: true,
    };
    const record = { packageId: target.packageId };
    const registry = {
      findRegistryEntryById: vi.fn(async () => target),
      findPackageRecord: vi.fn(async () => record),
      listAdditionalRootPaths: vi.fn(() => [packageRootPath]),
      removeAdditionalRootPath: vi.fn(() => order.push("root.remove")),
      removePackageRecord: vi.fn(async () => { order.push("record.remove"); }),
      addAdditionalRootPath: vi.fn(() => order.push("root.restore")),
      restorePackageRecord: vi.fn(async () => { order.push("record.restore"); }),
    };
    const catalogTransition = {
      runPackageTransition: vi.fn(async (mutation: {
        applyBeforeStage: () => Promise<unknown>;
        rollbackSource: (value: unknown, cause: unknown) => Promise<void>;
      }) => {
        const value = await mutation.applyBeforeStage();
        order.push("transition.stage.fail");
        const failure = new Error("stage failed");
        await mutation.rollbackSource(value, failure);
        order.push("transition.rollback.staged");
        throw failure;
      }),
    };
    const service = new ApplicationPackageCommandService({
      registry,
      provider: {} as never,
      catalogTransition,
    } as never);

    await expect(service.removeApplicationPackage(target.packageId))
      .rejects.toThrow("stage failed");
    expect(order).toEqual([
      "root.remove",
      "record.remove",
      "transition.stage.fail",
      "root.restore",
      "record.restore",
      "transition.rollback.staged",
    ]);
  });
});
