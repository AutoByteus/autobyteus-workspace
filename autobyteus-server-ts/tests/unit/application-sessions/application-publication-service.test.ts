import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";
import { ApplicationSessionStateStore } from "../../../src/application-sessions/stores/application-session-state-store.js";
import { ApplicationPublicationJournalStore } from "../../../src/application-sessions/stores/application-publication-journal-store.js";
import { ApplicationPublicationService } from "../../../src/application-sessions/services/application-publication-service.js";
import { APPLICATION_SESSION_CONTEXT_KEY } from "../../../src/application-sessions/utils/application-producer-provenance.js";
import type { ApplicationSessionSnapshot } from "../../../src/application-sessions/domain/models.js";

const createMockAppConfig = (rootDir: string) => ({
  getAppDataDir: () => rootDir,
});

const createBundle = (applicationRootPath: string): ApplicationBundle => ({
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

const buildSnapshot = (): ApplicationSessionSnapshot => ({
  applicationSessionId: "application-session-1",
  application: {
    applicationId: "built-in:applications__sample-app",
    localApplicationId: "sample-app",
    packageId: "built-in:applications",
    name: "Sample App",
    description: "Sample application",
    iconAssetPath: null,
    entryHtmlAssetPath: "/application-bundles/sample-app/assets/ui/index.html",
    writable: true,
  },
  runtime: {
    kind: "AGENT",
    runId: "agent-run-1",
    definitionId: "sample-agent-def",
  },
  view: {
    members: [
      {
        memberRouteKey: "sample-agent",
        displayName: "Sample Agent",
        teamPath: ["Sample Agent"],
        runtimeTarget: {
          runId: "agent-run-1",
          runtimeKind: "AGENT",
        },
        artifactsByKey: {},
        primaryArtifactKey: null,
      },
    ],
  },
  createdAt: new Date().toISOString(),
  terminatedAt: null,
});

describe("ApplicationPublicationService", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let storageLifecycleService: ApplicationStorageLifecycleService;
  let platformStateStore: ApplicationPlatformStateStore;
  let sessionStateStore: ApplicationSessionStateStore;
  let journalStore: ApplicationPublicationJournalStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-publication-service-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "sample-app");
    storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: {
        getApplicationById: async () => createBundle(applicationRootPath),
      } as never,
    });
    platformStateStore = new ApplicationPlatformStateStore({ storageLifecycleService });
    sessionStateStore = new ApplicationSessionStateStore({ platformStateStore });
    journalStore = new ApplicationPublicationJournalStore({ platformStateStore });
    await sessionStateStore.persistLiveSession(buildSnapshot());
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("keeps ApplicationPublicationService authoritative for projection updates and durable journal append", async () => {
    const dispatchService = { schedule: vi.fn() };
    const streamService = { publish: vi.fn() };
    const service = new ApplicationPublicationService({
      platformStateStore,
      sessionStateStore,
      journalStore,
      dispatchService: dispatchService as never,
      streamService: streamService as never,
    });

    const nextSnapshot = await service.appendRuntimePublication({
      runId: "agent-run-1",
      customData: {
        [APPLICATION_SESSION_CONTEXT_KEY]: {
          applicationSessionId: "application-session-1",
          applicationId: "built-in:applications__sample-app",
          member: {
            memberRouteKey: "sample-agent",
            displayName: "Sample Agent",
            teamPath: ["Sample Agent"],
            runtimeKind: "AGENT",
          },
        },
      },
      publication: {
        contractVersion: "1",
        artifactKey: "drafting",
        artifactType: "markdown_document",
        title: "Drafting",
        summary: "Current working draft",
        artifactRef: {
          kind: "INLINE_JSON",
          mimeType: "application/json",
          value: { percent: 42 },
        },
        metadata: { phase: "drafting" },
        isFinal: false,
      },
    });

    expect(nextSnapshot.view.members[0]?.artifactsByKey.drafting?.metadata).toEqual({ phase: "drafting" });
    expect(streamService.publish).toHaveBeenCalledTimes(1);
    expect(dispatchService.schedule).toHaveBeenCalledWith("built-in:applications__sample-app");

    const journalRecord = await journalStore.getNextPendingRecord("built-in:applications__sample-app");
    expect(journalRecord?.event.eventId).toMatch(/[0-9a-f-]{36}/);
    expect(journalRecord?.event.journalSequence).toBe(1);
    expect(journalRecord?.event.family).toBe("ARTIFACT");
    expect(journalRecord?.event.applicationSessionId).toBe("application-session-1");

    const persistedSnapshot = await sessionStateStore.getSessionById(
      "built-in:applications__sample-app",
      "application-session-1",
    );
    expect(persistedSnapshot?.view.members[0]?.artifactsByKey.drafting?.title).toBe("Drafting");
  });

  it("rejects legacy publication-family fields without mutating durable session state", async () => {
    const dispatchService = { schedule: vi.fn() };
    const streamService = { publish: vi.fn() };
    const service = new ApplicationPublicationService({
      platformStateStore,
      sessionStateStore,
      journalStore,
      dispatchService: dispatchService as never,
      streamService: streamService as never,
    });

    const before = await sessionStateStore.getSessionById(
      "built-in:applications__sample-app",
      "application-session-1",
    );

    await expect(service.appendRuntimePublication({
      runId: "agent-run-1",
      customData: {
        [APPLICATION_SESSION_CONTEXT_KEY]: {
          applicationSessionId: "application-session-1",
          applicationId: "built-in:applications__sample-app",
          member: {
            memberRouteKey: "sample-agent",
            displayName: "Sample Agent",
            teamPath: ["Sample Agent"],
            runtimeKind: "AGENT",
          },
        },
      },
      publication: {
        contractVersion: "1",
        artifactKey: "invalid-publication",
        artifactType: "markdown_document",
        artifactRef: {
          kind: "INLINE_JSON",
          mimeType: "application/json",
          value: {},
        },
        publicationFamily: "PROGRESS",
      },
    })).rejects.toThrow("publish_artifact v1 disallows fields");

    const after = await sessionStateStore.getSessionById(
      "built-in:applications__sample-app",
      "application-session-1",
    );
    expect(after).toEqual(before);
    expect(await journalStore.getNextPendingRecord("built-in:applications__sample-app")).toBeNull();
    expect(streamService.publish).not.toHaveBeenCalled();
    expect(dispatchService.schedule).not.toHaveBeenCalled();
  });
});
