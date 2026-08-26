import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationExecutionEventJournalEvent } from "../../../src/application-orchestration/domain/models.js";
import { ApplicationAvailabilityStateRegistry } from "../../../src/application-platform/runtime/application-availability-state-registry.js";
import { ApplicationPlatformLifecycle } from "../../../src/application-platform/runtime/application-platform-lifecycle.js";
import { ApplicationAvailabilityService } from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationExecutionEventDispatchQueue } from "../../../src/application-orchestration/services/application-execution-event-dispatch-queue.js";
import { ApplicationExecutionEventDispatchService } from "../../../src/application-orchestration/services/application-execution-event-dispatch-service.js";
import { ApplicationReentryService } from "../../../src/application-orchestration/services/application-reentry-service.js";
import { ApplicationExecutionEventJournalStore } from "../../../src/application-orchestration/stores/application-execution-event-journal-store.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";

const APPLICATION_ID = "local-package::brief-studio";

const buildEvent = (): Omit<ApplicationExecutionEventJournalEvent, "journalSequence"> => ({
  eventId: "event-1",
  applicationId: APPLICATION_ID,
  family: "RUN_STARTED",
  publishedAt: "2026-08-22T09:00:00.000Z",
  binding: {
    bindingId: "binding-1",
    applicationId: APPLICATION_ID,
    launchRequestId: "launch-request-1",
    status: "ATTACHED",
    executionResourceRef: {
      source: "bundle",
      kind: "AGENT",
      localId: "researcher",
    },
    runtime: {
      subject: "AGENT_RUN",
      agentRunId: "run-1",
      definitionId: "researcher-definition",
      members: [],
    },
    createdAt: "2026-08-22T09:00:00.000Z",
    updatedAt: "2026-08-22T09:00:00.000Z",
    terminatedAt: null,
    lastErrorMessage: null,
  },
  producer: null,
  payload: {},
});

describe("application execution-event journal recovery", () => {
  let tempRoot: string;
  let storageLifecycle: ApplicationStorageLifecycleService;
  let platformStateStore: ApplicationPlatformStateStore;
  let journalStore: ApplicationExecutionEventJournalStore;
  const dispatchServices: ApplicationExecutionEventDispatchService[] = [];

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-event-journal-"));
    storageLifecycle = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot },
      applicationBundleService: {
        getApplicationById: async (applicationId: string) => (
          applicationId === APPLICATION_ID ? { id: applicationId } : null
        ),
      } as never,
    });
    platformStateStore = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => tempRoot },
      storageLifecycleService: storageLifecycle,
    });
    journalStore = new ApplicationExecutionEventJournalStore({ platformStateStore });
  });

  afterEach(async () => {
    for (const service of dispatchServices.splice(0)) {
      service.stop();
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const createDispatchService = () => {
    const engineController = {
      invokeApplicationEventHandler: vi.fn(async () => ({ status: "acknowledged" as const })),
    };
    const service = new ApplicationExecutionEventDispatchService({
      applicationBundleService: {
        listApplications: vi.fn(async () => [{ id: APPLICATION_ID }]),
      } as never,
      availabilityReader: {
        isApplicationActive: vi.fn(async () => true),
      },
      platformStateStore,
      journalStore: new ApplicationExecutionEventJournalStore({ platformStateStore }),
      eventQueue: new ApplicationExecutionEventDispatchQueue(),
      engineLauncher: { ensureReady: vi.fn(async () => undefined) },
      engineController,
    });
    dispatchServices.push(service);
    return { service, engineController };
  };

  it("does not create platform or journal state while inspecting absent recovery state", async () => {
    const databasePath = storageLifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;

    await expect(journalStore.getNextPendingRecordIfPresent(APPLICATION_ID)).resolves.toBeNull();

    await expect(fs.stat(databasePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("leaves an existing database without journal state byte-for-byte unchanged", async () => {
    const databasePath = storageLifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;
    await fs.mkdir(path.dirname(databasePath), { recursive: true });
    new DatabaseSync(databasePath).close();
    const before = await fs.readFile(databasePath);

    await expect(journalStore.getNextPendingRecordIfPresent(APPLICATION_ID)).resolves.toBeNull();

    expect(await fs.readFile(databasePath)).toEqual(before);
    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = db.prepare(
        `SELECT COUNT(*) AS tableCount FROM sqlite_master WHERE type = 'table'`,
      ).get() as { tableCount: number };
      expect(Number(row.tableCount)).toBe(0);
    } finally {
      db.close();
    }
  });

  it("reads an appended pending record through a new read-only store without changing SQLite bytes", async () => {
    const appended = await journalStore.appendEventAwaitable(APPLICATION_ID, buildEvent());
    const databasePath = storageLifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;
    const before = await fs.readFile(databasePath);
    const restartedStore = new ApplicationExecutionEventJournalStore({ platformStateStore });

    await expect(restartedStore.getNextPendingRecordIfPresent(APPLICATION_ID)).resolves.toMatchObject({
      event: {
        eventId: appended.event.eventId,
        journalSequence: appended.event.journalSequence,
        applicationId: APPLICATION_ID,
        binding: {
          bindingId: "binding-1",
          launchRequestId: "launch-request-1",
        },
      },
      ackedAt: null,
      lastDispatchAttemptNumber: 0,
    });

    expect(await fs.readFile(databasePath)).toEqual(before);
  });

  it("projects old binding and producer supersets, then dispatches and acknowledges them", async () => {
    const event = buildEvent();
    await journalStore.appendEventAwaitable(APPLICATION_ID, {
      ...event,
      binding: {
        ...event.binding,
        executionResourceRef: {
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "research-team",
        },
        runtime: {
          subject: "TEAM_RUN",
          teamRunId: "team-run-1",
          definitionId: "research-team-definition",
          members: [{
            memberAddress: "/researcher",
            displayName: "Researcher",
            agentRunId: "researcher-run-1",
          }],
        },
      },
      producer: {
        agentRunId: "researcher-run-1",
        displayName: "Researcher",
      },
    });
    const databasePath = storageLifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;
    const db = new DatabaseSync(databasePath);
    try {
      const row = db.prepare(
        `SELECT journal_sequence, binding_json, producer_json
           FROM __autobyteus_execution_event_journal
          WHERE event_id = ?`,
      ).get(event.eventId) as {
        journal_sequence: number;
        binding_json: string;
        producer_json: string;
      };
      const binding = JSON.parse(row.binding_json) as {
        runtime: { members: Array<Record<string, unknown>> };
      } & Record<string, unknown>;
      binding.runtime.members[0]!.runtimeKind = "AGENT_TEAM_MEMBER";
      binding.runtime.members[0]!.ignoredLegacyAttribute = true;
      binding.ignoredLegacyAttribute = "retained-on-disk";
      const producer = JSON.parse(row.producer_json) as Record<string, unknown>;
      producer.runtimeKind = "AGENT_TEAM_MEMBER";
      producer.ignoredLegacyAttribute = true;
      db.prepare(
        `UPDATE __autobyteus_execution_event_journal
            SET binding_json = ?, producer_json = ?
          WHERE journal_sequence = ?`,
      ).run(JSON.stringify(binding), JSON.stringify(producer), row.journal_sequence);
    } finally {
      db.close();
    }

    await expect(journalStore.getNextPendingRecordIfPresent(APPLICATION_ID)).resolves.toMatchObject({
      event: {
        binding: {
          runtime: {
            members: [{
              memberAddress: "/researcher",
              displayName: "Researcher",
              agentRunId: "researcher-run-1",
            }],
          },
        },
        producer: {
          agentRunId: "researcher-run-1",
          displayName: "Researcher",
        },
      },
    });

    const { service, engineController } = createDispatchService();
    await service.resumePendingEventsForApplication(APPLICATION_ID);
    await vi.waitFor(() => expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledOnce());
    const envelope = engineController.invokeApplicationEventHandler.mock.calls[0]![1].envelope;
    expect(envelope.event.binding.runtime.members[0]).not.toHaveProperty("runtimeKind");
    expect(envelope.event.producer).not.toHaveProperty("runtimeKind");
    await vi.waitFor(async () => {
      await expect(journalStore.getNextPendingRecordIfPresent(APPLICATION_ID)).resolves.toBeNull();
    });
  });

  it("lets lifecycle restart recovery reach ready and dispatch an existing pending event", async () => {
    await journalStore.appendEventAwaitable(APPLICATION_ID, buildEvent());
    const { service: eventDispatchService, engineController } = createDispatchService();
    const availabilityService = new ApplicationAvailabilityService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({ id: APPLICATION_ID })),
        getDiagnosticByApplicationId: vi.fn(async () => null),
      } as never,
      stateRegistry: new ApplicationAvailabilityStateRegistry(),
    });
    const lifecycle = new ApplicationPlatformLifecycle({
      preparation: {
        prepareWorkspaceRuntime: vi.fn(async () => undefined),
        prepareAgentCustomizations: vi.fn(async () => undefined),
        toolReadiness: { registerRequiredGroups: vi.fn(async () => undefined) },
        bootstrapBuiltInAgents: vi.fn(async () => undefined),
        definitionRuntimeReadiness: {
          prepare: vi.fn(async () => undefined),
          isApplicationReady: vi.fn(() => true),
          getDiagnosticsByApplicationId: vi.fn(() => new Map()),
        },
      },
      executionReadiness: { assertReady: vi.fn() },
      bundleService: {
        getCatalogSnapshot: vi.fn(async () => ({
          applications: [{ id: APPLICATION_ID }],
          diagnostics: [],
          refreshedAt: "2026-08-22T10:00:00.000Z",
        })),
      },
      storageLifecycleService: storageLifecycle,
      platformStateStore,
      recoveryService: {
        resumeBindings: vi.fn(async () => [{
          applicationId: APPLICATION_ID,
          status: "RECOVERED",
          detail: null,
        }]),
      },
      availabilityService,
      eventDispatchService,
      startupGate: { runStartupRecovery: vi.fn(async (work) => work()) },
      selectedApplicationIds: new Set([APPLICATION_ID]),
      agentCommunicationService: { closeAll: vi.fn(async () => undefined) },
      backendGateway: { dispose: vi.fn() },
      backendWebSocketSessionService: { dispose: vi.fn() },
      notificationHub: { closeAll: vi.fn() },
      runObserverService: { dispose: vi.fn(async () => undefined) },
      artifactDeliveryService: {
        stopAccepting: vi.fn(),
        awaitDrained: vi.fn(async () => undefined),
      },
      engineLauncher: { stopAll: vi.fn(async () => undefined) },
      executionLifecycle: {
        quiesce: vi.fn(),
        close: vi.fn(async () => undefined),
      },
      streamingService: { stopAll: vi.fn(async () => undefined) },
    } as never);

    await lifecycle.prepareBeforeListen();
    await expect(lifecycle.recoverAfterListen()).resolves.toBeUndefined();

    expect(lifecycle.getState()).toBe("ready");
    await vi.waitFor(() => {
      expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("lets reload/reentry inspect and dispatch existing journal state before activation", async () => {
    await journalStore.appendEventAwaitable(APPLICATION_ID, buildEvent());
    const { service: eventDispatchService, engineController } = createDispatchService();
    const availabilityService = {
      beginReentry: vi.fn(),
      synchronizeWithCatalogSnapshot: vi.fn(),
      quarantineApplication: vi.fn((_applicationId, detail) => ({
        applicationId: APPLICATION_ID,
        state: "QUARANTINED",
        detail,
        updatedAt: "2026-08-22T10:00:00.000Z",
      })),
      activateApplication: vi.fn(() => ({
        applicationId: APPLICATION_ID,
        state: "ACTIVE",
        detail: null,
        updatedAt: "2026-08-22T10:00:00.000Z",
      })),
    };
    const service = new ApplicationReentryService({
      bundleService: {
        reloadApplication: vi.fn(async () => ({ id: APPLICATION_ID })),
        getCatalogSnapshot: vi.fn(async () => ({
          applications: [{ id: APPLICATION_ID }],
          diagnostics: [],
          refreshedAt: "2026-08-22T10:00:00.000Z",
        })),
      } as never,
      availabilityService: availabilityService as never,
      recoveryService: { resumeApplication: vi.fn(async () => undefined) },
      eventDispatchService,
      engineLauncher: { stop: vi.fn(async () => undefined) },
    });

    await expect(service.reloadAndReenter(APPLICATION_ID)).resolves.toMatchObject({
      state: "ACTIVE",
      detail: null,
    });

    await vi.waitFor(() => {
      expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledTimes(1);
    });
    expect(availabilityService.activateApplication).toHaveBeenCalledAfter(
      availabilityService.synchronizeWithCatalogSnapshot,
    );
  });
});
