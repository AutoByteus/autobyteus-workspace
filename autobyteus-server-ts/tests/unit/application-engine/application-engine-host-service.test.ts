import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationEngineHostService } from "../../../src/application-engine/services/application-engine-host-service.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";

describe("ApplicationEngineHostService", () => {
  let tempRoot: string;
  let applicationRootPath: string;

  const createMockAppConfig = (rootDir: string) => ({
    getAppDataDir: () => rootDir,
  });

  const createBundle = (): ApplicationBundle => ({
    id: "built-in:applications__sample-app",
    localApplicationId: "sample-app",
    packageId: "built-in:applications",
    name: "Sample App",
    description: "Sample application",
    iconAssetPath: null,
    entryHtmlAssetPath: "/application-bundles/sample-app/assets/ui/index.html",
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
  });

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-engine-host-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "sample-app");
    await fs.mkdir(path.join(applicationRootPath, "backend", "dist"), { recursive: true });
    await fs.writeFile(
      path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
      `export default {
        definitionContractVersion: '2',
        queries: {
          'tickets.get': async (input, ctx) => {
            await ctx.publishNotification('query.called', { input })
            return { input, requestContext: ctx.requestContext, appDatabaseUrl: ctx.storage.appDatabaseUrl }
          },
        },
        commands: {
          'tickets.create': async (input, ctx) => {
            await ctx.publishNotification('command.called', { input })
            return { ok: true, input, applicationId: ctx.requestContext?.applicationId ?? null }
          },
        },
        routes: [
          {
            method: 'GET',
            path: '/tickets/:id',
            handler: async (request, ctx) => ({
              status: 200,
              headers: { 'x-ticket-id': request.params.id },
              body: { params: request.params, requestContext: ctx.requestContext },
            }),
          },
        ],
        graphql: {
          async execute(request, ctx) {
            return { query: request.query, requestContext: ctx.requestContext }
          },
        },
        eventHandlers: {
          async runStarted(event, ctx) {
            await ctx.publishNotification('event.called', { eventId: event.event.eventId })
          },
        },
        artifactHandlers: {
          async persisted(event, ctx) {
            await ctx.publishNotification('artifact.called', { revisionId: event.revisionId, path: event.path })
          },
        },
      }\n`,
      "utf-8",
    );
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("boots the worker, validates exposures, and invokes app-owned backend handlers through the host boundary", async () => {
    const bundleService = {
      getApplicationById: vi.fn().mockResolvedValue(createBundle()),
    };
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: bundleService as never,
    });
    const service = new ApplicationEngineHostService({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });
    const notificationListener = vi.fn();
    service.onNotification(notificationListener);

    const status = await service.ensureApplicationEngine("built-in:applications__sample-app");
    expect(status.ready).toBe(true);
    expect(status.exposures?.queries).toContain("tickets.get");
    expect(status.exposures?.eventHandlers).toContain("RUN_STARTED");

    const queryResult = await service.invokeApplicationQuery("built-in:applications__sample-app", {
      queryName: "tickets.get",
      requestContext: {
        applicationId: "built-in:applications__sample-app",
        launchInstanceId: "launch-1",
      },
      input: { ticketId: "t-1" },
    });
    expect(queryResult).toMatchObject({
      input: { ticketId: "t-1" },
      requestContext: {
        applicationId: "built-in:applications__sample-app",
        launchInstanceId: "launch-1",
      },
    });

    const routeResult = await service.routeApplicationRequest("built-in:applications__sample-app", {
      requestContext: {
        applicationId: "built-in:applications__sample-app",
        launchInstanceId: "launch-1",
      },
      request: {
        method: "GET",
        path: "/tickets/t-1",
        headers: {},
        query: {},
        params: {},
        body: null,
      },
    });
    expect(routeResult).toMatchObject({
      status: 200,
      headers: { "x-ticket-id": "t-1" },
      body: {
        params: { id: "t-1" },
      },
    });

    const graphqlResult = await service.executeApplicationGraphql("built-in:applications__sample-app", {
      requestContext: {
        applicationId: "built-in:applications__sample-app",
        launchInstanceId: null,
      },
      request: {
        query: "{ ping }",
      },
    });
    expect(graphqlResult).toEqual({
      query: "{ ping }",
      requestContext: {
        applicationId: "built-in:applications__sample-app",
        launchInstanceId: null,
      },
    });

    const eventResult = await service.invokeApplicationEventHandler("built-in:applications__sample-app", {
      envelope: {
        event: {
          eventId: "event-1",
          journalSequence: 7,
          applicationId: "built-in:applications__sample-app",
          family: "RUN_STARTED",
          publishedAt: new Date().toISOString(),
          binding: {
            bindingId: "binding-1",
            applicationId: "built-in:applications__sample-app",
            bindingIntentId: "binding-intent-1",
            status: "ATTACHED",
            resourceRef: {
              owner: "bundle",
              kind: "AGENT",
              localId: "sample-agent",
            },
            runtime: {
              subject: "AGENT_RUN",
              runId: "run-1",
              definitionId: "sample-agent-def",
              members: [],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            terminatedAt: null,
            lastErrorMessage: null,
          },
          producer: null,
          payload: {},
        },
        delivery: {
          semantics: "AT_LEAST_ONCE",
          attemptNumber: 1,
          dispatchedAt: new Date().toISOString(),
        },
      },
    });
    expect(eventResult).toEqual({ status: "acknowledged" });

    const artifactResult = await service.invokeApplicationArtifactHandler("built-in:applications__sample-app", {
      event: {
        runId: "run-1",
        artifactId: "run-1:brief-studio/final-brief.md",
        revisionId: "revision-1",
        path: "brief-studio/final-brief.md",
        description: "Ready for review",
        fileKind: "file",
        publishedAt: new Date().toISOString(),
        binding: {
          bindingId: "binding-1",
          applicationId: "built-in:applications__sample-app",
          bindingIntentId: "binding-intent-1",
          status: "ATTACHED",
          resourceRef: {
            owner: "bundle",
            kind: "AGENT",
            localId: "sample-agent",
          },
          runtime: {
            subject: "AGENT_RUN",
            runId: "run-1",
            definitionId: "sample-agent-def",
            members: [],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          terminatedAt: null,
          lastErrorMessage: null,
        },
        producer: null,
      },
    });
    expect(artifactResult).toEqual({ status: "acknowledged" });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(notificationListener).toHaveBeenCalled();

    await service.stopApplicationEngine("built-in:applications__sample-app");
    expect(service.getApplicationEngineStatus("built-in:applications__sample-app").state).toBe("stopped");
  });
});
