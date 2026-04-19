import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApplicationBackendMountTransport } from "../../../../autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationEngineHostService } from "../../../src/application-engine/services/application-engine-host-service.js";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";
import { ApplicationNotificationStreamService } from "../../../src/application-backend-gateway/streaming/application-notification-stream-service.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../src/api/fastify-runtime-config.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";

const applicationBackendState = vi.hoisted(() => ({
  gatewayService: null as ApplicationBackendGatewayService | null,
}));

vi.mock("../../../src/application-backend-gateway/services/application-backend-gateway-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/application-backend-gateway/services/application-backend-gateway-service.js")
  >("../../../src/application-backend-gateway/services/application-backend-gateway-service.js");
  return {
    ...actual,
    getApplicationBackendGatewayService: () => {
      if (!applicationBackendState.gatewayService) {
        throw new Error("Integration test gateway service was not initialized.");
      }
      return applicationBackendState.gatewayService;
    },
  };
});

import { registerApplicationBackendRoutes } from "../../../src/api/rest/application-backends.js";

const APPLICATION_ID = "route-echo-app";

const createBundle = (applicationRootPath: string): ApplicationBundle => ({
  id: APPLICATION_ID,
  localApplicationId: "route-echo-app",
  packageId: "test-package",
  name: "Route Echo App",
  description: "Application backend route echo fixture",
  iconAssetPath: null,
  entryHtmlAssetPath: "/application-bundles/route-echo-app/assets/ui/index.html",
  runtimeTarget: {
    kind: "AGENT",
    localId: "sample-agent",
    definitionId: "sample-agent-def",
  },
  writable: true,
  applicationRootPath,
  packageRootPath: path.dirname(path.dirname(applicationRootPath)),
  localAgentIds: ["sample-agent"],
  localTeamIds: [],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
  backend: {
    manifestPath: path.join(applicationRootPath, "backend", "bundle.json"),
    manifestRelativePath: "backend/bundle.json",
    entryModulePath: path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
    entryModuleRelativePath: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: { engine: "node", semver: ">=22 <23" },
    sdkCompatibility: {
      backendDefinitionContractVersion: "2",
      frontendSdkContractVersion: "2",
    },
    supportedExposures: {
      queries: false,
      commands: false,
      routes: true,
      graphql: false,
      notifications: false,
      eventHandlers: false,
    },
    migrationsDirPath: null,
    migrationsDirRelativePath: null,
    assetsDirPath: null,
    assetsDirRelativePath: null,
  },
});

const buildBaseUrl = (address: string | { port: number; address: string }): string => {
  if (typeof address === "string") {
    return address;
  }
  return `http://127.0.0.1:${address.port}`;
};

describe("Application backend mount route transport integration", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let app: FastifyInstance;
  let baseUrl: string;
  let engineHostService: ApplicationEngineHostService;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-route-transport-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "route-echo-app");
    await fs.mkdir(path.join(applicationRootPath, "backend", "dist"), { recursive: true });
    await fs.mkdir(path.join(applicationRootPath, "ui"), { recursive: true });
    await fs.writeFile(path.join(applicationRootPath, "ui", "index.html"), "<!doctype html><html></html>", "utf8");
    await fs.writeFile(
      path.join(applicationRootPath, "backend", "bundle.json"),
      `${JSON.stringify({
        contractVersion: "1",
        entryModule: "backend/dist/entry.mjs",
        moduleFormat: "esm",
        distribution: "self-contained",
        targetRuntime: { engine: "node", semver: ">=22 <23" },
        sdkCompatibility: {
          backendDefinitionContractVersion: "2",
          frontendSdkContractVersion: "2",
        },
        supportedExposures: {
          queries: false,
          commands: false,
          routes: true,
          graphql: false,
          notifications: false,
          eventHandlers: false,
        },
      }, null, 2)}
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
      `export default {
  definitionContractVersion: '2',
  routes: [
    {
      method: 'POST',
      path: '/tickets/echo',
      handler: async (request, ctx) => ({
        status: 200,
        body: {
          body: request.body,
          bodyType: Array.isArray(request.body) ? 'array' : request.body === null ? 'null' : typeof request.body,
          requestContext: ctx.requestContext,
        },
      }),
    },
  ],
}\n`,
      "utf8",
    );

    const bundleService = {
      getApplicationById: vi.fn().mockImplementation(async (applicationId: string) =>
        applicationId === APPLICATION_ID ? createBundle(applicationRootPath) : null),
    };

    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: {
        getAppDataDir: () => tempRoot,
      } as never,
      applicationBundleService: bundleService as never,
    });

    engineHostService = new ApplicationEngineHostService({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });

    applicationBackendState.gatewayService = new ApplicationBackendGatewayService({
      applicationBundleService: bundleService as never,
      engineHostService,
      notificationStreamService: new ApplicationNotificationStreamService(),
    });

    app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
    await app.register(async (restApp) => {
      await registerApplicationBackendRoutes(restApp);
    }, { prefix: "/rest" });
    await app.listen({ host: "127.0.0.1", port: 0 });
    baseUrl = buildBaseUrl(app.server.address() as { port: number; address: string });
  });

  afterEach(async () => {
    await engineHostService.stopApplicationEngine(APPLICATION_ID);
    await app.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
    applicationBackendState.gatewayService = null;
  });

  it("round-trips structured JSON route bodies through /backend/routes/*", async () => {
    const transport = createApplicationBackendMountTransport({
      backendBaseUrl: `${baseUrl}/rest/applications/${APPLICATION_ID}/backend`,
    });

    const response = await transport.invokeRoute({
      requestContext: {
        applicationId: APPLICATION_ID,
        launchInstanceId: "launch-route-1",
      },
      request: {
        method: "POST",
        path: "/tickets/echo",
        headers: {},
        query: {},
        params: {},
        body: {
          hello: "world",
          nested: { count: 2 },
        },
      },
    });

    expect(response).toEqual({
      status: 200,
      body: {
        body: {
          hello: "world",
          nested: { count: 2 },
        },
        bodyType: "object",
        requestContext: {
          applicationId: APPLICATION_ID,
          launchInstanceId: "launch-route-1",
        },
      },
    });
  });
});
