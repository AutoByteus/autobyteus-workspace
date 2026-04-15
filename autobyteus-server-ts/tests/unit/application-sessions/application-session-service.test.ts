import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationSessionService } from "../../../src/application-sessions/services/application-session-service.js";
import { ApplicationSessionStateStore } from "../../../src/application-sessions/stores/application-session-state-store.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";
import type {
  ApplicationSessionBinding,
  ApplicationSessionSnapshot,
} from "../../../src/application-sessions/domain/models.js";

const applicationBundle: ApplicationBundle = {
  id: "bundle-app__pkg__sample-app",
  localApplicationId: "sample-app",
  packageId: "pkg",
  name: "Sample App",
  description: "Sample application",
  iconAssetPath: null,
  entryHtmlAssetPath: "application-bundles/sample-app/assets/ui/index.html",
  runtimeTarget: {
    kind: "AGENT",
    localId: "sample-agent",
    definitionId: "agent-def-1",
  },
  writable: true,
  applicationRootPath: "/tmp/sample-app",
  packageRootPath: "/tmp",
  localAgentIds: ["sample-agent"],
  localTeamIds: [],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
  backend: {
    manifestPath: "/tmp/sample-app/backend/bundle.json",
    manifestRelativePath: "backend/bundle.json",
    entryModulePath: "/tmp/sample-app/backend/dist/entry.mjs",
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
};

const createDurableBundle = (input: {
  applicationId: string;
  localApplicationId: string;
  applicationRootPath: string;
  definitionId: string;
  migrationsDirPath: string | null;
}): ApplicationBundle => ({
  id: input.applicationId,
  localApplicationId: input.localApplicationId,
  packageId: "built-in:applications",
  name: `${input.localApplicationId} App`,
  description: `${input.localApplicationId} application`,
  iconAssetPath: null,
  entryHtmlAssetPath: `/application-bundles/${input.localApplicationId}/assets/ui/index.html`,
  runtimeTarget: {
    kind: "AGENT",
    localId: `${input.localApplicationId}-agent`,
    definitionId: input.definitionId,
  },
  writable: true,
  applicationRootPath: input.applicationRootPath,
  packageRootPath: path.dirname(path.dirname(input.applicationRootPath)),
  localAgentIds: [`${input.localApplicationId}-agent`],
  localTeamIds: [],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
  backend: {
    manifestPath: path.join(input.applicationRootPath, "backend", "bundle.json"),
    manifestRelativePath: "backend/bundle.json",
    entryModulePath: path.join(input.applicationRootPath, "backend", "dist", "entry.mjs"),
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
    migrationsDirPath: input.migrationsDirPath,
    migrationsDirRelativePath: input.migrationsDirPath ? "backend/migrations" : null,
    assetsDirPath: null,
    assetsDirRelativePath: null,
  },
});

const createInMemorySessionStateStore = () => {
  const sessions = new Map<string, ApplicationSessionSnapshot>();

  const applicationSessionBinding = async (
    applicationId: string,
    requestedSessionId?: string | null,
  ): Promise<ApplicationSessionBinding> => {
    const requested = requestedSessionId ? sessions.get(requestedSessionId) ?? null : null;
    if (requested && requested.application.applicationId === applicationId && requested.terminatedAt === null) {
      return {
        applicationId,
        requestedSessionId: requestedSessionId ?? null,
        resolvedSessionId: requested.applicationSessionId,
        resolution: "requested_live",
        session: structuredClone(requested),
      };
    }

    const active = Array.from(sessions.values()).find(
      (session) => session.application.applicationId === applicationId && session.terminatedAt === null,
    ) ?? null;
    if (active) {
      return {
        applicationId,
        requestedSessionId: requestedSessionId ?? null,
        resolvedSessionId: active.applicationSessionId,
        resolution: "application_active",
        session: structuredClone(active),
      };
    }

    return {
      applicationId,
      requestedSessionId: requestedSessionId ?? null,
      resolvedSessionId: null,
      resolution: "none",
      session: null,
    };
  };

  return {
    persistLiveSession: vi.fn(async (snapshot: ApplicationSessionSnapshot) => {
      sessions.set(snapshot.applicationSessionId, structuredClone(snapshot));
      return structuredClone(snapshot);
    }),
    persistSessionUpdate: vi.fn(async (snapshot: ApplicationSessionSnapshot) => {
      sessions.set(snapshot.applicationSessionId, structuredClone(snapshot));
      return structuredClone(snapshot);
    }),
    applicationSessionBinding: vi.fn(applicationSessionBinding),
    findSessionById: vi.fn(async (_applicationIds: string[], applicationSessionId: string) => {
      const session = sessions.get(applicationSessionId) ?? null;
      return session ? structuredClone(session) : null;
    }),
  };
};

const createSubject = () => {
  const sessionStateStore = createInMemorySessionStateStore();
  const publicationService = {
    recordSessionStarted: vi.fn().mockResolvedValue(undefined),
    recordSessionTerminated: vi.fn().mockResolvedValue(undefined),
    appendRuntimePublication: vi.fn(),
  };
  const applicationBundleService = {
    getApplicationById: vi.fn().mockResolvedValue(applicationBundle),
    listApplications: vi.fn().mockResolvedValue([applicationBundle]),
  };
  const agentRunService = {
    createAgentRun: vi.fn().mockResolvedValue({
      runId: "agent-run-1",
    }),
    terminateAgentRun: vi.fn().mockResolvedValue(true),
    resolveAgentRun: vi.fn(),
  };
  const teamRunService = {
    createTeamRun: vi.fn(),
    terminateTeamRun: vi.fn(),
    resolveTeamRun: vi.fn(),
  };
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn().mockResolvedValue({
      id: "agent-def-1",
      name: "Sample Agent",
    }),
  };
  const agentTeamDefinitionService = {
    getDefinitionById: vi.fn(),
  };
  const streamService = {
    publish: vi.fn(),
  };

  const service = new ApplicationSessionService({
    applicationBundleService: applicationBundleService as never,
    agentRunService: agentRunService as never,
    teamRunService: teamRunService as never,
    agentDefinitionService: agentDefinitionService as never,
    agentTeamDefinitionService: agentTeamDefinitionService as never,
    sessionStateStore: sessionStateStore as never,
    publicationService: publicationService as never,
    streamService: streamService as never,
  });

  return {
    service,
    mocks: {
      applicationBundleService,
      agentRunService,
      publicationService,
      sessionStateStore,
      streamService,
    },
  };
};

describe("ApplicationSessionService", () => {
  it("returns requested_live when the requested session is still live for the application", async () => {
    const { service } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const binding = await service.applicationSessionBinding(
      applicationBundle.id,
      session.applicationSessionId,
    );

    expect(binding).toMatchObject({
      applicationId: applicationBundle.id,
      requestedSessionId: session.applicationSessionId,
      resolvedSessionId: session.applicationSessionId,
      resolution: "requested_live",
    });
    expect(binding.session?.applicationSessionId).toBe(session.applicationSessionId);
  });

  it("replaces the previous live session and records the lifecycle publication hooks", async () => {
    const { service, mocks } = createSubject();
    const firstSession = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const secondSession = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-2",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    expect(secondSession.applicationSessionId).not.toBe(firstSession.applicationSessionId);
    expect(mocks.agentRunService.terminateAgentRun).toHaveBeenCalledWith("agent-run-1");
    expect(mocks.publicationService.recordSessionStarted).toHaveBeenCalledTimes(2);
    expect(mocks.publicationService.recordSessionTerminated).toHaveBeenCalledTimes(1);
    expect(mocks.streamService.publish).toHaveBeenCalled();
  });

  it("marks the persisted session terminated and returns none for future bindings", async () => {
    const { service, mocks } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    await service.terminateSession(session.applicationSessionId);
    const binding = await service.applicationSessionBinding(
      applicationBundle.id,
      session.applicationSessionId,
    );

    expect(mocks.sessionStateStore.persistSessionUpdate).toHaveBeenCalled();
    expect(binding).toEqual({
      applicationId: applicationBundle.id,
      requestedSessionId: session.applicationSessionId,
      resolvedSessionId: null,
      resolution: "none",
      session: null,
    });
  });

  it("loads a live session by raw id without triggering unrelated app migration failures", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-session-lookup-"));

    try {
      const validApplicationId = "built-in:applications__valid-app";
      const invalidApplicationId = "built-in:applications__broken-app";
      const validApplicationRootPath = path.join(tempRoot, "bundle", "applications", "valid-app");
      const invalidApplicationRootPath = path.join(tempRoot, "bundle", "applications", "broken-app");
      const invalidMigrationsDirPath = path.join(invalidApplicationRootPath, "backend", "migrations");

      await fs.mkdir(path.join(validApplicationRootPath, "backend", "dist"), { recursive: true });
      await fs.mkdir(invalidMigrationsDirPath, { recursive: true });
      await fs.writeFile(
        path.join(invalidMigrationsDirPath, "001_invalid.sql"),
        "ATTACH DATABASE 'platform.sqlite' AS platform;\nCREATE TABLE __autobyteus_bad (id TEXT);\n",
        "utf-8",
      );

      const validBundle = createDurableBundle({
        applicationId: validApplicationId,
        localApplicationId: "valid-app",
        applicationRootPath: validApplicationRootPath,
        definitionId: "valid-agent-def",
        migrationsDirPath: null,
      });
      const invalidBundle = createDurableBundle({
        applicationId: invalidApplicationId,
        localApplicationId: "broken-app",
        applicationRootPath: invalidApplicationRootPath,
        definitionId: "broken-agent-def",
        migrationsDirPath: invalidMigrationsDirPath,
      });
      const bundlesById = new Map<string, ApplicationBundle>([
        [validApplicationId, validBundle],
        [invalidApplicationId, invalidBundle],
      ]);
      const applicationBundleService = {
        getApplicationById: vi.fn(async (applicationId: string) => bundlesById.get(applicationId) ?? null),
        listApplications: vi.fn().mockResolvedValue([invalidBundle, validBundle]),
      };
      const storageLifecycleService = new ApplicationStorageLifecycleService({
        appConfig: {
          getAppDataDir: () => tempRoot,
        },
        applicationBundleService: applicationBundleService as never,
      });
      const platformStateStore = new ApplicationPlatformStateStore({ storageLifecycleService });
      const sessionStateStore = new ApplicationSessionStateStore({ platformStateStore });

      const persistedSession = await sessionStateStore.persistLiveSession({
        applicationSessionId: "application-session-live-1",
        application: {
          applicationId: validApplicationId,
          localApplicationId: "valid-app",
          packageId: "built-in:applications",
          name: "Valid App",
          description: "valid application",
          iconAssetPath: null,
          entryHtmlAssetPath: "/application-bundles/valid-app/assets/ui/index.html",
          writable: true,
        },
        runtime: {
          kind: "AGENT",
          runId: "agent-run-live-1",
          definitionId: "valid-agent-def",
        },
        view: {
          delivery: { current: null },
          members: [],
        },
        createdAt: new Date().toISOString(),
        terminatedAt: null,
      });

      await expect(storageLifecycleService.ensureStoragePrepared(invalidApplicationId)).rejects.toThrow(
        "ATTACH is not allowed in app migrations",
      );

      const service = new ApplicationSessionService({
        applicationBundleService: applicationBundleService as never,
        sessionStateStore: sessionStateStore as never,
      });

      const loadedSession = await service.getSessionById(persistedSession.applicationSessionId);

      expect(loadedSession?.application.applicationId).toBe(validApplicationId);
      expect(loadedSession?.applicationSessionId).toBe(persistedSession.applicationSessionId);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
