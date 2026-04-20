import { describe, expect, it, vi } from "vitest";
import type { ApplicationCatalogSnapshot } from "../../../src/application-bundles/domain/application-catalog-snapshot.js";
import { ApplicationAvailabilityService } from "../../../src/application-orchestration/services/application-availability-service.js";

const refreshedAt = new Date("2026-04-20T10:00:00.000Z").toISOString();
const applicationId = "bundle-app__app-1";

const buildSnapshot = (): ApplicationCatalogSnapshot => ({
  refreshedAt,
  applications: [
    {
      id: applicationId,
      localApplicationId: "app-1",
      packageId: "built-in:applications",
      name: "App 1",
      description: null,
      iconAssetPath: null,
      entryHtmlAssetPath: "/application-bundles/app-1/ui/index.html",
      bundleResources: [],
      resourceSlots: [],
      writable: true,
      applicationRootPath: "/tmp/app-1",
      packageRootPath: "/tmp",
      localAgentIds: [],
      localTeamIds: [],
      entryHtmlRelativePath: "ui/index.html",
      iconRelativePath: null,
      backend: {
        manifestPath: "/tmp/app-1/backend/bundle.json",
        manifestRelativePath: "backend/bundle.json",
        entryModulePath: "/tmp/app-1/backend/dist/entry.mjs",
        entryModuleRelativePath: "backend/dist/entry.mjs",
        moduleFormat: "esm",
        distribution: "self-contained",
        targetRuntime: { engine: "node", semver: ">=22 <23" },
        sdkCompatibility: {
          backendDefinitionContractVersion: "2",
          frontendSdkContractVersion: "2",
        },
        supportedExposures: {
          queries: true,
          commands: true,
          routes: true,
          graphql: true,
          notifications: true,
          eventHandlers: true,
        },
        migrationsDirPath: null,
        migrationsDirRelativePath: null,
        assetsDirPath: null,
        assetsDirRelativePath: null,
      },
    },
  ],
  diagnostics: [
    {
      applicationId: "bundle-app__broken-app",
      localApplicationId: "broken-app",
      packageId: "built-in:applications",
      packageRootPath: "/tmp",
      applicationRootPath: "/tmp/broken-app",
      message: "manifest invalid",
      discoveredAt: refreshedAt,
    },
  ],
});

describe("ApplicationAvailabilityService", () => {
  it("tracks active and quarantined applications from the catalog snapshot", async () => {
    const dispatchService = {
      suspendApplication: vi.fn(),
    };
    const service = new ApplicationAvailabilityService({
      dispatchService: dispatchService as never,
      applicationBundleService: {
        getApplicationById: vi.fn(async () => null),
        getDiagnosticByApplicationId: vi.fn(async () => null),
      } as never,
    });

    service.synchronizeWithCatalogSnapshot(buildSnapshot());

    await expect(service.getAvailability(applicationId)).resolves.toMatchObject({
      state: "ACTIVE",
      detail: null,
    });
    await expect(service.getAvailability("bundle-app__broken-app")).resolves.toMatchObject({
      state: "QUARANTINED",
      detail: "manifest invalid",
    });
    expect(dispatchService.suspendApplication).toHaveBeenCalledWith("bundle-app__broken-app");
  });

  it("reloads, reruns recovery, and resumes dispatch before marking an app active", async () => {
    const bundleService = {
      reloadApplication: vi.fn(async () => ({ id: applicationId })),
      getCatalogSnapshot: vi.fn(async () => ({
        ...buildSnapshot(),
        diagnostics: [],
      })),
    };
    const recoveryService = {
      resumeApplication: vi.fn(async () => undefined),
    };
    const dispatchService = {
      suspendApplication: vi.fn(),
      resumePendingEventsForApplication: vi.fn(async () => undefined),
    };
    const service = new ApplicationAvailabilityService({
      applicationBundleService: bundleService as never,
      recoveryService: recoveryService as never,
      dispatchService: dispatchService as never,
    });
    service.synchronizeWithCatalogSnapshot(buildSnapshot());

    const availability = await service.reloadAndReenter(applicationId);

    expect(bundleService.reloadApplication).toHaveBeenCalledWith(applicationId);
    expect(recoveryService.resumeApplication).toHaveBeenCalledWith(applicationId);
    expect(dispatchService.resumePendingEventsForApplication).toHaveBeenCalledWith(applicationId);
    expect(availability).toMatchObject({ state: "ACTIVE", detail: null });
  });

  it("keeps applications quarantined when reload validation still reports diagnostics", async () => {
    const bundleService = {
      getApplicationById: vi.fn(async () => null),
      getDiagnosticByApplicationId: vi.fn(async () => null),
      reloadApplication: vi.fn(async () => null),
      getCatalogSnapshot: vi.fn(async () => buildSnapshot()),
    };
    const dispatchService = {
      suspendApplication: vi.fn(),
    };
    const service = new ApplicationAvailabilityService({
      applicationBundleService: bundleService as never,
      dispatchService: dispatchService as never,
    });

    const availability = await service.reloadAndReenter("bundle-app__broken-app");

    expect(availability).toMatchObject({
      state: "QUARANTINED",
      detail: "manifest invalid",
    });
  });
});
