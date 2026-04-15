import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";
import { ApplicationPublicationJournalStore } from "../../../src/application-sessions/stores/application-publication-journal-store.js";
import { ApplicationPublicationDispatchService } from "../../../src/application-sessions/services/application-publication-dispatch-service.js";

describe("ApplicationPublicationDispatchService", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let platformStateStore: ApplicationPlatformStateStore;
  let journalStore: ApplicationPublicationJournalStore;
  const applicationId = "built-in:applications__sample-app";

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
        backendDefinitionContractVersion: "1",
        frontendSdkContractVersion: "1",
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
    vi.useFakeTimers();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-publication-dispatch-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "sample-app");
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: {
        getApplicationById: async () => createBundle(),
      } as never,
    });
    platformStateStore = new ApplicationPlatformStateStore({ storageLifecycleService });
    journalStore = new ApplicationPublicationJournalStore({ platformStateStore });
    await platformStateStore.withTransaction(applicationId, (db) => {
      journalStore.appendNormalizedEvent(db, {
        eventId: "event-1",
        applicationId,
        applicationSessionId: "application-session-1",
        family: "ARTIFACT",
        publishedAt: new Date("2026-04-14T10:00:00.000Z").toISOString(),
        producer: {
          memberRouteKey: "sample-agent",
          memberName: "Sample Agent",
          role: "AGENT",
        },
        payload: {
          contractVersion: "1",
          artifactKey: "drafting",
          artifactType: "markdown_document",
          title: "Drafting",
          artifactRef: {
            kind: "INLINE_JSON",
            mimeType: "application/json",
            value: { percent: 25 },
          },
        },
      });
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("retries in order with stable eventId and journalSequence until the durable ack cursor advances", async () => {
    const envelopes: Array<{ eventId: string; journalSequence: number; attemptNumber: number }> = [];
    const engineHostService = {
      invokeApplicationEventHandler: vi
        .fn()
        .mockImplementationOnce(async (_applicationId, { envelope }) => {
          envelopes.push({
            eventId: envelope.event.eventId,
            journalSequence: envelope.event.journalSequence,
            attemptNumber: envelope.delivery.attemptNumber,
          });
          throw new Error("worker unavailable");
        })
        .mockImplementationOnce(async (_applicationId, { envelope }) => {
          envelopes.push({
            eventId: envelope.event.eventId,
            journalSequence: envelope.event.journalSequence,
            attemptNumber: envelope.delivery.attemptNumber,
          });
          return { status: "acknowledged" };
        }),
    };
    const service = new ApplicationPublicationDispatchService({
      applicationBundleService: {
        listApplications: vi.fn().mockResolvedValue([createBundle()]),
      } as never,
      journalStore,
      engineHostService: engineHostService as never,
    });

    service.schedule(applicationId);
    await vi.runAllTimersAsync();

    expect(envelopes).toEqual([
      { eventId: "event-1", journalSequence: 1, attemptNumber: 1 },
      { eventId: "event-1", journalSequence: 1, attemptNumber: 2 },
    ]);
    expect(await journalStore.getNextPendingRecord(applicationId)).toBeNull();
  });

  it("treats missing handlers as acknowledged no-ops so the journal does not wedge", async () => {
    const engineHostService = {
      invokeApplicationEventHandler: vi.fn().mockResolvedValue({ status: "missing_handler" }),
    };
    const service = new ApplicationPublicationDispatchService({
      applicationBundleService: {
        listApplications: vi.fn().mockResolvedValue([createBundle()]),
      } as never,
      journalStore,
      engineHostService: engineHostService as never,
    });

    service.schedule(applicationId);
    await vi.runAllTimersAsync();

    expect(engineHostService.invokeApplicationEventHandler).toHaveBeenCalledTimes(1);
    expect(await journalStore.getNextPendingRecord(applicationId)).toBeNull();
  });

  it("resumes pending durable dispatch after a fresh service start without requiring a new publication", async () => {
    const engineHostService = {
      invokeApplicationEventHandler: vi.fn().mockResolvedValue({ status: "acknowledged" }),
    };
    const service = new ApplicationPublicationDispatchService({
      applicationBundleService: {
        listApplications: vi.fn().mockResolvedValue([createBundle()]),
      } as never,
      journalStore,
      engineHostService: engineHostService as never,
    });

    await service.resumePendingDispatches();
    await vi.runAllTimersAsync();

    expect(engineHostService.invokeApplicationEventHandler).toHaveBeenCalledTimes(1);
    expect(await journalStore.getNextPendingRecord(applicationId)).toBeNull();
  });
});
