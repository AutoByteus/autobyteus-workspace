import { describe, expect, it, vi } from "vitest";
import {
  ApplicationAvailabilityService,
  ApplicationUnavailableError,
} from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationBackendApiGatewayService } from "../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js";

class TestSocket {
  sent: Array<string | Uint8Array> = [];
  closes: Array<{ code?: number; reason?: string }> = [];
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  send(value: string | Uint8Array): void { this.sent.push(value); }
  close(code?: number, reason?: string): void { this.closes.push({ code, reason }); }
  on(event: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }
}

const flushAsyncWork = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const applicationWithWebSockets = (webSockets: boolean) => ({
  id: "app-1",
  backend: {
    supportedExposures: {
      queries: true,
      commands: true,
      routes: true,
      graphql: true,
      notifications: true,
      eventHandlers: true,
      webSockets,
    },
  },
});

describe("ApplicationBackendApiGatewayService", () => {
  const createDeferred = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((nextResolve, nextReject) => {
      resolve = nextResolve;
      reject = nextReject;
    });
    return { promise, resolve, reject };
  };

  it("keeps the backend API gateway app-scoped and forwards app request context explicitly", async () => {
    const bundleService = {
      getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
    };
    const engineHostService = {
      invokeApplicationQuery: vi.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ApplicationBackendApiGatewayService({
      applicationBundleService: bundleService as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: engineHostService as never,
      notificationHub: { publish: vi.fn() } as never,
    });

    const result = await service.invokeApplicationQuery(
      "app-1",
      "tickets.get",
      {
        applicationId: "app-1",
      },
      { ticketId: "t-1" },
    );

    expect(result).toEqual({ ok: true });
    expect(engineHostService.invokeApplicationQuery).toHaveBeenCalledWith("app-1", {
      queryName: "tickets.get",
      requestContext: {
        applicationId: "app-1",
      },
      input: { ticketId: "t-1" },
    });
  });

  it("rejects mismatched requestContext identity so callers cannot bypass the app boundary", async () => {
    const service = new ApplicationBackendApiGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: {
        invokeApplicationCommand: vi.fn(),
      } as never,
      notificationHub: { publish: vi.fn() } as never,
    });

    await expect(service.invokeApplicationCommand(
      "app-1",
      "tickets.create",
      {
        applicationId: "other-app",
      },
      { title: "Hello" },
    )).rejects.toThrow("requestContext.applicationId must match the route applicationId");
  });

  it("rejects disabled custom WebSockets before opening the application engine path", async () => {
    const engineHostService = {
      onWebSocketAction: vi.fn(),
      onWorkerClose: vi.fn(),
      openApplicationWebSocket: vi.fn(async () => undefined),
      closeApplicationWebSocket: vi.fn(async () => undefined),
    };
    const socket = new TestSocket();
    const service = new ApplicationBackendApiGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => applicationWithWebSockets(false)),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: engineHostService as never,
    });

    service.connectApplicationWebSocket({
      applicationId: "app-1",
      request: { path: "/rooms/one", params: {}, query: {}, headers: {} },
      socket,
    });
    await flushAsyncWork();

    expect(engineHostService.openApplicationWebSocket).not.toHaveBeenCalled();
    expect(socket.sent).toEqual([]);
    expect(socket.closes).toEqual([{
      code: 1011,
      reason: "Application backend connection rejected",
    }]);
  });

  it("opens custom WebSockets after the active bundle enables the exposure", async () => {
    const engineHostService = {
      onWebSocketAction: vi.fn(),
      onWorkerClose: vi.fn(),
      openApplicationWebSocket: vi.fn(async () => undefined),
      closeApplicationWebSocket: vi.fn(async () => undefined),
    };
    const socket = new TestSocket();
    const service = new ApplicationBackendApiGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => applicationWithWebSockets(true)),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: engineHostService as never,
    });

    service.connectApplicationWebSocket({
      applicationId: "app-1",
      request: { path: "/rooms/one", params: {}, query: {}, headers: {} },
      socket,
    });
    await flushAsyncWork();

    expect(engineHostService.openApplicationWebSocket).toHaveBeenCalledOnce();
    expect(socket.sent).toEqual([
      JSON.stringify({
        protocol: "autobyteus.application-backend.websocket.v1",
        type: "CONNECTION_READY",
      }),
    ]);
    expect(socket.closes).toEqual([]);
  });

  it("surfaces application availability failures before worker launch", async () => {
    const service = new ApplicationBackendApiGatewayService({
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
      notificationHub: { publish: vi.fn() } as never,
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
          executionResourceSlots: [],
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
              backendDefinitionContractVersion: "4",
              frontendSdkContractVersion: "4",
            },
            supportedExposures: {
              queries: true,
              commands: true,
              routes: true,
              graphql: true,
              notifications: true,
              eventHandlers: true,
              webSockets: false,
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
              executionResourceSlots: [],
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
                  backendDefinitionContractVersion: "4",
                  frontendSdkContractVersion: "4",
                },
                supportedExposures: {
                  queries: true,
                  commands: true,
                  routes: true,
                  graphql: true,
                  notifications: true,
                  eventHandlers: true,
                  webSockets: false,
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
    const service = new ApplicationBackendApiGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({ id: "app-1" })),
      } as never,
      availabilityService: availabilityService as never,
      engineHostService: engineHostService as never,
      notificationHub: { publish: vi.fn() } as never,
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
