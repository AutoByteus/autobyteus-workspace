import { describe, expect, it, vi } from "vitest";
import {
  ApplicationAvailabilityService,
  ApplicationUnavailableError,
} from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";

describe("ApplicationBackendGatewayService", () => {
  const createDeferred = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((nextResolve, nextReject) => {
      resolve = nextResolve;
      reject = nextReject;
    });
    return { promise, resolve, reject };
  };

  it("keeps the backend gateway app-scoped and forwards optional launch context explicitly", async () => {
    const bundleService = {
      getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
    };
    const engineHostService = {
      invokeApplicationQuery: vi.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: bundleService as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: engineHostService as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    const result = await service.invokeApplicationQuery(
      "app-1",
      "tickets.get",
      {
        applicationId: "app-1",
        launchInstanceId: "launch-123",
      },
      { ticketId: "t-1" },
    );

    expect(result).toEqual({ ok: true });
    expect(engineHostService.invokeApplicationQuery).toHaveBeenCalledWith("app-1", {
      queryName: "tickets.get",
      requestContext: {
        applicationId: "app-1",
        launchInstanceId: "launch-123",
      },
      input: { ticketId: "t-1" },
    });
  });

  it("rejects mismatched requestContext identity so callers cannot bypass the app boundary", async () => {
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: {
        invokeApplicationCommand: vi.fn(),
      } as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    await expect(service.invokeApplicationCommand(
      "app-1",
      "tickets.create",
      {
        applicationId: "other-app",
        launchInstanceId: null,
      },
      { title: "Hello" },
    )).rejects.toThrow("requestContext.applicationId must match the route applicationId");
  });

  it("surfaces application availability failures before worker launch", async () => {
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn(),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => {
          throw new ApplicationUnavailableError("app-1", "QUARANTINED", "manifest invalid");
        }),
      } as never,
      engineHostService: {
        ensureApplicationEngine: vi.fn(),
      } as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    await expect(service.ensureApplicationReady("app-1")).rejects.toThrow(
      "Application 'app-1' is currently quarantined: manifest invalid",
    );
  });

  it("keeps backend admission blocked while an application is REENTERING", async () => {
    const recoveryDeferred = createDeferred<void>();
    const availabilityService = new ApplicationAvailabilityService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: "app-1",
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
        })),
        getDiagnosticByApplicationId: vi.fn(async () => null),
        reloadApplication: vi.fn(async () => ({ id: "app-1" })),
        getCatalogSnapshot: vi.fn(async () => ({
          refreshedAt: "2026-04-20T10:00:00.000Z",
          applications: [
            {
              id: "app-1",
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
          diagnostics: [],
        })),
      } as never,
      engineHostService: {
        stopApplicationEngine: vi.fn(async () => undefined),
      } as never,
      recoveryService: {
        resumeApplication: vi.fn(() => recoveryDeferred.promise),
      } as never,
      dispatchService: {
        suspendApplication: vi.fn(),
        resumePendingEventsForApplication: vi.fn(async () => undefined),
      } as never,
    });
    const engineHostService = {
      ensureApplicationEngine: vi.fn(async () => ({
        applicationId: "app-1",
        state: "ready",
        ready: true,
        startedAt: null,
        lastFailure: null,
        exposures: null,
      })),
    };
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({ id: "app-1" })),
      } as never,
      availabilityService: availabilityService as never,
      engineHostService: engineHostService as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    const reentryPromise = availabilityService.reloadAndReenter("app-1");
    await Promise.resolve();

    await expect(service.ensureApplicationReady("app-1")).rejects.toThrow(
      "Application 'app-1' is currently reentering. Please retry after repair/reload completes.",
    );
    expect(engineHostService.ensureApplicationEngine).not.toHaveBeenCalled();

    recoveryDeferred.resolve();
    await reentryPromise;
  });
});
