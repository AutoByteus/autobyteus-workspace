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

describe("ApplicationPackageCommandService", () => {
  it("rolls back a local import and performs one best-effort refresh after refresh failure", async () => {
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
    const refreshCoordinator = {
      refresh: vi.fn()
        .mockImplementationOnce(async () => {
          order.push("refresh.fail");
          throw new Error("refresh failed");
        })
        .mockImplementationOnce(async () => { order.push("refresh.rollback"); }),
    };
    const service = new ApplicationPackageCommandService({
      registry,
      provider,
      refreshCoordinator,
    } as never);

    await expect(service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: root,
    })).rejects.toThrow("refresh failed");
    expect(order).toEqual([
      "provider.validate",
      "root.add",
      "record.upsert",
      "refresh.fail",
      "root.remove",
      "record.remove",
      "refresh.rollback",
    ]);
  });

  it("deletes a managed install only after the committed registry refresh", async () => {
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
    const service = new ApplicationPackageCommandService({
      registry,
      provider: {} as never,
      refreshCoordinator: {
        refresh: vi.fn(async () => {
          order.push("refresh");
          await expect(fs.stat(managedInstallPath)).resolves.toBeDefined();
        }),
      },
    } as never);

    await expect(service.removeApplicationPackage(target.packageId)).resolves.toEqual([]);
    expect(order).toEqual(["root.remove", "record.remove", "refresh", "list"]);
    await expect(fs.stat(managedInstallPath)).rejects.toThrow();
  });

  it("restores removed package state and refreshes once after refresh failure", async () => {
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
    const service = new ApplicationPackageCommandService({
      registry,
      provider: {} as never,
      refreshCoordinator: {
        refresh: vi.fn()
          .mockImplementationOnce(async () => {
            order.push("refresh.fail");
            throw new Error("refresh failed");
          })
          .mockImplementationOnce(async () => { order.push("refresh.rollback"); }),
      },
    } as never);

    await expect(service.removeApplicationPackage(target.packageId))
      .rejects.toThrow("refresh failed");
    expect(order).toEqual([
      "root.remove",
      "record.remove",
      "refresh.fail",
      "root.restore",
      "record.restore",
      "refresh.rollback",
    ]);
  });
});
