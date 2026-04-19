import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationExecutionEventEnvelope,
  ApplicationNotificationMessage,
  ApplicationRunBindingSummary,
} from "@autobyteus/application-sdk-contracts";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import {
  BUILT_IN_APPLICATION_PACKAGE_ID,
  FileApplicationBundleProvider,
} from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationEngineHostService } from "../../../src/application-engine/services/application-engine-host-service.js";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";
import {
  ApplicationNotificationStreamService,
  type ApplicationNotificationStreamMessage,
} from "../../../src/application-backend-gateway/streaming/application-notification-stream-service.js";
import { ApplicationExecutionEventDispatchService } from "../../../src/application-orchestration/services/application-execution-event-dispatch-service.js";
import { ApplicationExecutionEventIngressService } from "../../../src/application-orchestration/services/application-execution-event-ingress-service.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationOrchestrationStartupGate } from "../../../src/application-orchestration/services/application-orchestration-startup-gate.js";
import { ApplicationRunBindingLaunchService } from "../../../src/application-orchestration/services/application-run-binding-launch-service.js";
import { ApplicationRunObserverService } from "../../../src/application-orchestration/services/application-run-observer-service.js";
import { ApplicationRuntimeResourceResolver } from "../../../src/application-orchestration/services/application-runtime-resource-resolver.js";
import { ApplicationExecutionContext, APPLICATION_EXECUTION_CONTEXT_KEY } from "../../../src/application-orchestration/domain/models.js";
import { ApplicationExecutionEventJournalStore } from "../../../src/application-orchestration/stores/application-execution-event-journal-store.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../../src/application-orchestration/stores/application-run-lookup-store.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../src/api/fastify-runtime-config.js";
import { registerApplicationBackendRoutes } from "../../../src/api/rest/application-backends.js";
import { registerApplicationBackendNotificationWebsocket } from "../../../src/api/websocket/application-backend-notifications.js";

const applicationBackendState = vi.hoisted(() => ({
  gatewayService: null as ApplicationBackendGatewayService | null,
  notificationStreamService: null as ApplicationNotificationStreamService | null,
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

vi.mock("../../../src/application-backend-gateway/streaming/application-notification-stream-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/application-backend-gateway/streaming/application-notification-stream-service.js")
  >("../../../src/application-backend-gateway/streaming/application-notification-stream-service.js");
  return {
    ...actual,
    getApplicationNotificationStreamService: () => {
      if (!applicationBackendState.notificationStreamService) {
        throw new Error("Integration test notification stream service was not initialized.");
      }
      return applicationBackendState.notificationStreamService;
    },
  };
});

const IMPORTABLE_PACKAGE_ROOT = path.resolve(
  process.cwd(),
  "..",
  "applications/brief-studio/dist/importable-package",
);

const buildBaseUrl = (address: string | { port: number; address: string }): string => {
  if (typeof address === "string") {
    return address;
  }
  return `http://127.0.0.1:${address.port}`;
};

const waitForSocketOpen = async (socket: WebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for websocket open."));
    }, 5_000);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("open", onOpen);
      socket.off("error", onError);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once("open", onOpen);
    socket.once("error", onError);
  });

const waitForMessage = async (
  messages: ApplicationNotificationStreamMessage[],
  socket: WebSocket,
  predicate: (message: ApplicationNotificationStreamMessage) => boolean,
  label: string,
): Promise<ApplicationNotificationStreamMessage> =>
  new Promise((resolve, reject) => {
    const existing = messages.find(predicate);
    if (existing) {
      resolve(existing);
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      const preview = JSON.stringify(messages.slice(-5));
      reject(new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`));
    }, 5_000);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };

    const onMessage = (raw: WebSocket.RawData) => {
      const parsed = JSON.parse(String(raw)) as ApplicationNotificationStreamMessage;
      if (predicate(parsed)) {
        cleanup();
        resolve(parsed);
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.on("message", onMessage);
    socket.once("error", onError);
  });

const readJson = async <T>(response: Response): Promise<T> => {
  const body = await response.text();
  return body ? (JSON.parse(body) as T) : (null as T);
};

const expectOkJson = async <T>(response: Response, label: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}: ${await response.text()}`);
  }
  return readJson<T>(response);
};

const buildArtifactPublication = (input: {
  artifactKey: string;
  artifactType: string;
  title: string;
  summary?: string;
  isFinal: boolean;
}): Record<string, unknown> => ({
  contractVersion: "1",
  artifactKey: input.artifactKey,
  artifactType: input.artifactType,
  title: input.title,
  summary: input.summary ?? null,
  artifactRef: {
    kind: "INLINE_JSON",
    mimeType: "application/json",
    value: {
      title: input.title,
    },
  },
  isFinal: input.isFinal,
});

const cloneBinding = (binding: ApplicationRunBindingSummary): ApplicationRunBindingSummary => structuredClone(binding);

const buildDirectArtifactEnvelope = (input: {
  applicationId: string;
  executionRef: string;
  binding: ApplicationRunBindingSummary;
  eventId: string;
  journalSequence: number;
  memberRouteKey: string;
  memberName: string;
  displayName: string;
  artifactKey: string;
  artifactType: string;
  title: string;
  summary?: string;
  isFinal: boolean;
  publishedAt: string;
}): { envelope: ApplicationExecutionEventEnvelope } => ({
  envelope: {
    event: {
      eventId: input.eventId,
      journalSequence: input.journalSequence,
      applicationId: input.applicationId,
      executionRef: input.executionRef,
      family: "ARTIFACT",
      publishedAt: input.publishedAt,
      binding: cloneBinding(input.binding),
      producer: {
        memberRouteKey: input.memberRouteKey,
        memberName: input.memberName,
        displayName: input.displayName,
        teamPath: [],
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
      payload: buildArtifactPublication({
        artifactKey: input.artifactKey,
        artifactType: input.artifactType,
        title: input.title,
        summary: input.summary,
        isFinal: input.isFinal,
      }),
    },
    delivery: {
      semantics: "AT_LEAST_ONCE",
      attemptNumber: 1,
      dispatchedAt: input.publishedAt,
    },
  },
});

describe("Brief Studio imported package integration", () => {
  let tempRoot: string;
  let builtInAppRoot: string;
  let appDataRoot: string;
  let app: FastifyInstance;
  let baseUrl: string;
  let bundleService: ApplicationBundleService;
  let engineHostService: ApplicationEngineHostService;
  let storageLifecycleService: ApplicationStorageLifecycleService;
  let applicationId: string;
  let startupGate: ApplicationOrchestrationStartupGate;
  let notificationSocket: WebSocket | null;
  let notificationMessages: ApplicationNotificationStreamMessage[];
  let ingressService: ApplicationExecutionEventIngressService;
  let latestBinding: ApplicationRunBindingSummary | null;
  let latestTeamRunId: string | null;
  let executionContextByRouteKey: Map<string, ApplicationExecutionContext>;
  let memberRunIdByRouteKey: Map<string, string>;
  let lifecycleListenersByRunId: Map<string, (event: {
    runtimeSubject: "TEAM_RUN";
    runId: string;
    phase: "ATTACHED" | "TERMINATED" | "FAILED";
    occurredAt: string;
    errorMessage?: string | null;
  }) => void>;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-brief-studio-"));
    builtInAppRoot = path.join(tempRoot, "built-in-root");
    appDataRoot = path.join(tempRoot, "app-data");
    await fs.mkdir(builtInAppRoot, { recursive: true });
    await fs.mkdir(appDataRoot, { recursive: true });

    ApplicationBundleService.resetInstance();
    ApplicationEngineHostService.resetInstance();
    ApplicationBackendGatewayService.resetInstance();
    ApplicationExecutionEventDispatchService.resetInstance();
    ApplicationOrchestrationHostService.resetInstance();
    ApplicationOrchestrationStartupGate.resetInstance();
    ApplicationRunObserverService.resetInstance();
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: appDataRoot });

    const provider = new FileApplicationBundleProvider(
      {
        getAppRootDir: () => builtInAppRoot,
      } as never,
      {
        getBuiltInRootPath: () => builtInAppRoot,
        listAdditionalRootPaths: () => [IMPORTABLE_PACKAGE_ROOT],
      } as never,
      {
        listPackageRecords: async () => [],
      } as never,
    );

    bundleService = new ApplicationBundleService({ provider });
    const [bundle] = await bundleService.listApplications();
    if (!bundle) {
      throw new Error("Expected Brief Studio bundle to be discoverable from the importable package root.");
    }
    applicationId = bundle.id;

    storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: {
        getAppDataDir: () => appDataRoot,
      } as never,
      applicationBundleService: bundleService as never,
    });

    const platformStateStore = new ApplicationPlatformStateStore({
      storageLifecycleService,
    });
    const bindingStore = new ApplicationRunBindingStore({ platformStateStore });
    const journalStore = new ApplicationExecutionEventJournalStore({ platformStateStore });
    const lookupStore = new ApplicationRunLookupStore();

    startupGate = ApplicationOrchestrationStartupGate.getInstance();
    latestBinding = null;
    latestTeamRunId = null;
    executionContextByRouteKey = new Map();
    memberRunIdByRouteKey = new Map();
    lifecycleListenersByRunId = new Map();

    const fakeTeamDefinitionService = {
      getAllDefinitions: vi.fn(async () => []),
      getDefinitionById: vi.fn(async (definitionId: string) => ({
        id: definitionId,
        name: "Brief Studio Team",
        coordinatorMemberName: "writer",
        nodes: [
          {
            memberName: "researcher",
            ref: "researcher",
            refType: "agent",
            refScope: "team_local",
          },
          {
            memberName: "writer",
            ref: "writer",
            refType: "agent",
            refScope: "team_local",
          },
        ],
      })),
    };

    const fakeAgentDefinitionService = {
      getVisibleAgentDefinitions: vi.fn(async () => []),
      getAgentDefinitionById: vi.fn(async (definitionId: string) => ({
        id: definitionId,
        name: definitionId,
      })),
    };

    const fakeLifecycleGateway = {
      observeBoundRun: vi.fn(async (
        descriptor: { runtimeSubject: "TEAM_RUN"; runId: string },
        listener: (event: {
          runtimeSubject: "TEAM_RUN";
          runId: string;
          phase: "ATTACHED" | "TERMINATED" | "FAILED";
          occurredAt: string;
          errorMessage?: string | null;
        }) => void,
      ) => {
        lifecycleListenersByRunId.set(descriptor.runId, listener);
        listener({
          runtimeSubject: descriptor.runtimeSubject,
          runId: descriptor.runId,
          phase: "ATTACHED",
          occurredAt: new Date().toISOString(),
        });
        return () => {
          lifecycleListenersByRunId.delete(descriptor.runId);
        };
      }),
    };

    const fakeTeamRunService = {
      buildMemberConfigsFromLaunchPreset: vi.fn(async ({ launchPreset }: { launchPreset: Record<string, unknown> }) => ([
        {
          memberName: "researcher",
          memberRouteKey: "researcher",
          agentDefinitionId: "brief-studio-team/researcher",
          llmModelIdentifier: launchPreset.llmModelIdentifier,
          autoExecuteTools: false,
          skillAccessMode: launchPreset.skillAccessMode ?? "PRELOADED_ONLY",
          workspaceId: null,
          workspaceRootPath: launchPreset.workspaceRootPath,
          llmConfig: launchPreset.llmConfig ?? null,
          runtimeKind: launchPreset.runtimeKind ?? "AUTOBYTEUS",
        },
        {
          memberName: "writer",
          memberRouteKey: "writer",
          agentDefinitionId: "brief-studio-team/writer",
          llmModelIdentifier: launchPreset.llmModelIdentifier,
          autoExecuteTools: false,
          skillAccessMode: launchPreset.skillAccessMode ?? "PRELOADED_ONLY",
          workspaceId: null,
          workspaceRootPath: launchPreset.workspaceRootPath,
          llmConfig: launchPreset.llmConfig ?? null,
          runtimeKind: launchPreset.runtimeKind ?? "AUTOBYTEUS",
        },
      ])),
      createTeamRun: vi.fn(async ({ memberConfigs }: { memberConfigs: Array<Record<string, unknown>> }) => {
        const runIndex = (latestTeamRunId ? Number(latestTeamRunId.split("-").pop()) : 0) + 1;
        latestTeamRunId = `team-run-${runIndex}`;
        const runtimeMemberConfigs = memberConfigs.map((memberConfig) => {
          const memberRouteKey = String(memberConfig.memberRouteKey ?? memberConfig.memberName);
          const memberRunId = `${latestTeamRunId}::${memberRouteKey}`;
          executionContextByRouteKey.set(
            memberRouteKey,
            structuredClone(memberConfig.applicationExecutionContext as ApplicationExecutionContext),
          );
          memberRunIdByRouteKey.set(memberRouteKey, memberRunId);
          return {
            ...memberConfig,
            memberRunId,
          };
        });
        return {
          runId: latestTeamRunId,
          config: {
            memberConfigs: runtimeMemberConfigs,
          },
        };
      }),
      terminateTeamRun: vi.fn(async () => undefined),
      resolveTeamRun: vi.fn(async () => null),
    };

    const resourceResolver = new ApplicationRuntimeResourceResolver({
      applicationBundleService: bundleService,
      agentDefinitionService: fakeAgentDefinitionService as never,
      agentTeamDefinitionService: fakeTeamDefinitionService as never,
    });

    const runBindingLaunchService = new ApplicationRunBindingLaunchService({
      resourceResolver,
      bindingStore,
      lookupStore,
      teamRunService: fakeTeamRunService as never,
      agentTeamDefinitionService: fakeTeamDefinitionService as never,
      agentDefinitionService: fakeAgentDefinitionService as never,
    });

    let engineHostServiceRef: ApplicationEngineHostService | null = null;
    const dispatchService = new ApplicationExecutionEventDispatchService({
      applicationBundleService: bundleService,
      journalStore,
      engineHostService: {
        invokeApplicationEventHandler: (...args: [string, { envelope: ApplicationExecutionEventEnvelope }]) => {
          if (!engineHostServiceRef) {
            throw new Error("Application engine host service is not ready.");
          }
          return engineHostServiceRef.invokeApplicationEventHandler(...args);
        },
      } as never,
    });

    ingressService = new ApplicationExecutionEventIngressService({
      bindingStore,
      lookupStore,
      journalStore,
      dispatchService,
    });

    const runObserverService = new ApplicationRunObserverService({
      lifecycleGateway: fakeLifecycleGateway as never,
      bindingStore,
      lookupStore,
      ingressService,
    });

    const orchestrationHostService = new ApplicationOrchestrationHostService({
      startupGate,
      resourceResolver,
      runBindingLaunchService,
      bindingStore,
      lookupStore,
      runObserverService,
      teamRunService: fakeTeamRunService as never,
      ingressService,
    });

    engineHostService = new ApplicationEngineHostService({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
      orchestrationHostService,
    });
    engineHostServiceRef = engineHostService;

    applicationBackendState.notificationStreamService = new ApplicationNotificationStreamService();
    applicationBackendState.gatewayService = new ApplicationBackendGatewayService({
      applicationBundleService: bundleService as never,
      engineHostService,
      notificationStreamService: applicationBackendState.notificationStreamService,
    });

    await startupGate.runStartupRecovery(async () => {
      await dispatchService.resumePendingEvents();
    });

    app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
    await app.register(websocket);
    await app.register(async (restApp) => {
      await registerApplicationBackendRoutes(restApp);
    }, { prefix: "/rest" });
    await registerApplicationBackendNotificationWebsocket(app);
    await app.listen({ host: "127.0.0.1", port: 0 });
    baseUrl = buildBaseUrl(app.server.address() as { port: number; address: string });
    notificationSocket = null;
    notificationMessages = [];
  });

  afterEach(async () => {
    if (notificationSocket && notificationSocket.readyState === WebSocket.OPEN) {
      notificationSocket.close();
    }
    if (applicationId) {
      await engineHostService.stopApplicationEngine(applicationId);
    }
    if (app) {
      await app.close();
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
    applicationBackendState.gatewayService = null;
    applicationBackendState.notificationStreamService = null;
    appConfigProvider.resetForTests();
  });

  it("discovers Brief Studio as an imported package, starts an app-owned run, and projects live execution events through REST/WS", async () => {
    const applications = await bundleService.listApplications();
    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      localApplicationId: "brief-studio",
      name: "Brief Studio",
    });
    expect(applications[0]!.packageId.startsWith("application-local:")).toBe(true);
    expect(applications[0]!.packageId).not.toBe(BUILT_IN_APPLICATION_PACKAGE_ID);
    expect(await bundleService.getApplicationById(applicationId)).not.toBeNull();

    const launchInstanceId = `${applicationId}::launch-1`;
    const requestContext = {
      applicationId,
      launchInstanceId,
    };

    const stoppedStatus = await expectOkJson<{
      applicationId: string;
      state: string;
      ready: boolean;
      startedAt: string | null;
      lastFailure: string | null;
      exposures: unknown;
    }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/status`),
      "Brief Studio status route",
    );
    expect(stoppedStatus).toEqual({
      applicationId,
      state: "stopped",
      ready: false,
      startedAt: null,
      lastFailure: null,
      exposures: null,
    });

    const emptyList = await expectOkJson<{ result: { briefs: unknown[] } }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.list`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestContext, input: null }),
      }),
      "Brief Studio empty list query",
    );
    expect(emptyList).toEqual({ result: { briefs: [] } });

    notificationSocket = new WebSocket(
      `${baseUrl.replace("http://", "ws://")}/ws/applications/${encodeURIComponent(applicationId)}/backend/notifications`,
    );
    notificationSocket.on("message", (raw) => {
      notificationMessages.push(JSON.parse(String(raw)) as ApplicationNotificationStreamMessage);
    });
    await waitForSocketOpen(notificationSocket);
    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) => message.type === "connected" && message.applicationId === applicationId,
      "connected",
    );

    const createBriefJson = await expectOkJson<{
      result: {
        briefId: string;
        bindingId: string;
        runId: string;
      };
    }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/commands/createBrief`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestContext,
          input: {
            title: "Market Entry Brief",
            llmModelIdentifier: "gpt-test",
          },
        }),
      }),
      "Brief Studio createBrief command",
    );

    expect(createBriefJson.result.briefId).toMatch(/^brief-/);
    expect(createBriefJson.result.bindingId).toEqual(expect.any(String));
    expect(createBriefJson.result.runId).toBe(latestTeamRunId);

    const createdNotification = await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.created"
        && (message.notification.payload as { briefId?: string }).briefId === createBriefJson.result.briefId,
      "brief.created",
    );
    expect(createdNotification).toMatchObject({
      type: "notification",
      notification: {
        applicationId,
        topic: "brief.created",
        payload: {
          briefId: createBriefJson.result.briefId,
          bindingId: createBriefJson.result.bindingId,
          runId: createBriefJson.result.runId,
        },
      } as { applicationId: string; topic: string; payload: ApplicationNotificationMessage["payload"] },
    });

    await vi.waitFor(async () => {
      const detailJson = await expectOkJson<{
        result: {
          brief: {
            briefId: string;
            status: string;
            latestBindingId: string | null;
            latestRunId: string | null;
            latestBindingStatus: string | null;
            artifacts: unknown[];
          } | null;
        };
      }>(
        await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.getDetail`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestContext,
            input: {
              briefId: createBriefJson.result.briefId,
            },
          }),
        }),
        "Brief Studio detail after createBrief",
      );
      expect(detailJson.result.brief).toMatchObject({
        briefId: createBriefJson.result.briefId,
        status: "researching",
        latestBindingId: createBriefJson.result.bindingId,
        latestRunId: createBriefJson.result.runId,
        latestBindingStatus: "ATTACHED",
        artifacts: [],
      });
    });

    await ingressService.appendRuntimeArtifactEvent({
      runId: memberRunIdByRouteKey.get("researcher")!,
      customData: {
        [APPLICATION_EXECUTION_CONTEXT_KEY]: executionContextByRouteKey.get("researcher")!,
      },
      publication: buildArtifactPublication({
        artifactKey: "research-note-1",
        artifactType: "research_note",
        title: "Research Summary",
        summary: "Audience and sources collected.",
        isFinal: false,
      }),
    });

    await ingressService.appendRuntimeArtifactEvent({
      runId: memberRunIdByRouteKey.get("writer")!,
      customData: {
        [APPLICATION_EXECUTION_CONTEXT_KEY]: executionContextByRouteKey.get("writer")!,
      },
      publication: buildArtifactPublication({
        artifactKey: "brief-draft-1",
        artifactType: "final_brief",
        title: "Market Entry Brief",
        summary: "Draft ready for review.",
        isFinal: true,
      }),
    });

    const readyForReviewNotification = await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.ready_for_review"
        && (message.notification.payload as { bindingId?: string }).bindingId === createBriefJson.result.bindingId,
      "brief.ready_for_review",
    );
    expect(readyForReviewNotification).toMatchObject({
      type: "notification",
      notification: {
        applicationId,
        topic: "brief.ready_for_review",
      },
    });

    lifecycleListenersByRunId.get(createBriefJson.result.runId)?.({
      runtimeSubject: "TEAM_RUN",
      runId: createBriefJson.result.runId,
      phase: "TERMINATED",
      occurredAt: "2026-04-19T10:45:00.000Z",
    });

    await vi.waitFor(async () => {
      const listJson = await expectOkJson<{
        result: {
          briefs: Array<{
            briefId: string;
            title: string;
            status: string;
            latestBindingId: string | null;
            latestRunId: string | null;
            latestBindingStatus: string | null;
            lastErrorMessage: string | null;
            updatedAt: string;
          }>;
        };
      }>(
        await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.list`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestContext, input: null }),
        }),
        "Brief Studio list after artifact ingress",
      );

      expect(listJson.result.briefs).toEqual([
        expect.objectContaining({
          briefId: createBriefJson.result.briefId,
          title: "Market Entry Brief",
          status: "in_review",
          latestBindingId: createBriefJson.result.bindingId,
          latestRunId: createBriefJson.result.runId,
          latestBindingStatus: "TERMINATED",
          lastErrorMessage: null,
        }),
      ]);
    });

    const detailJson = await expectOkJson<{
      result: {
        brief: {
          briefId: string;
          title: string;
          status: string;
          latestBindingId: string | null;
          latestRunId: string | null;
          latestBindingStatus: string | null;
          lastErrorMessage: string | null;
          artifacts: Array<{
            artifactKind: string;
            artifactKey: string;
            artifactType: string;
            title: string;
            summary: string | null;
            producerMemberRouteKey: string;
            isFinal: boolean;
          }>;
          reviewNotes: unknown[];
        } | null;
      };
    }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.getDetail`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestContext,
          input: {
            briefId: createBriefJson.result.briefId,
          },
        }),
      }),
      "Brief Studio detail after artifact ingress",
    );

    expect(detailJson.result.brief).toMatchObject({
      briefId: createBriefJson.result.briefId,
      title: "Market Entry Brief",
      status: "in_review",
      latestBindingId: createBriefJson.result.bindingId,
      latestRunId: createBriefJson.result.runId,
      latestBindingStatus: "TERMINATED",
      lastErrorMessage: null,
      reviewNotes: [],
      artifacts: [
        expect.objectContaining({
          artifactKind: "researcher",
          artifactKey: "research-note-1",
          artifactType: "research_note",
          title: "Research Summary",
          summary: "Audience and sources collected.",
          producerMemberRouteKey: "researcher",
          isFinal: false,
        }),
        expect.objectContaining({
          artifactKind: "writer",
          artifactKey: "brief-draft-1",
          artifactType: "final_brief",
          title: "Market Entry Brief",
          summary: "Draft ready for review.",
          producerMemberRouteKey: "writer",
          isFinal: true,
        }),
      ],
    });

    const addNoteJson = await expectOkJson<{
      result: {
        briefId: string;
        noteId: string;
      };
    }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/commands/addReviewNote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestContext,
          input: {
            briefId: createBriefJson.result.briefId,
            body: "Please tighten the recommendation section.",
          },
        }),
      }),
      "Brief Studio addReviewNote command",
    );
    expect(addNoteJson.result.briefId).toBe(createBriefJson.result.briefId);
    expect(addNoteJson.result.noteId).toEqual(expect.any(String));

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.note_added"
        && (message.notification.payload as { noteId?: string }).noteId === addNoteJson.result.noteId,
      "brief.note_added",
    );

    const approveJson = await expectOkJson<{
      result: {
        briefId: string;
        status: string;
      };
    }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/commands/approveBrief`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestContext,
          input: {
            briefId: createBriefJson.result.briefId,
          },
        }),
      }),
      "Brief Studio approveBrief command",
    );
    expect(approveJson).toEqual({
      result: {
        briefId: createBriefJson.result.briefId,
        status: "approved",
      },
    });

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.review_updated"
        && (message.notification.payload as { status?: string }).status === "approved",
      "brief.review_updated",
    );

    const approvedDetailJson = await expectOkJson<{
      result: {
        brief: {
          status: string;
          approvedAt: string | null;
          reviewNotes: Array<{
            noteId: string;
            briefId: string;
            body: string;
          }>;
        } | null;
      };
    }>(
      await fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.getDetail`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestContext,
          input: {
            briefId: createBriefJson.result.briefId,
          },
        }),
      }),
      "Brief Studio detail after approval",
    );
    expect(approvedDetailJson.result.brief).toMatchObject({
      status: "approved",
      approvedAt: expect.any(String),
      reviewNotes: [
        expect.objectContaining({
          noteId: addNoteJson.result.noteId,
          briefId: createBriefJson.result.briefId,
          body: "Please tighten the recommendation section.",
        }),
      ],
    });

    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const appDb = new DatabaseSync(layout.appDatabasePath);
    try {
      const counts = {
        processedEvents: Number(
          (appDb.prepare("SELECT COUNT(*) AS count FROM processed_events").get() as { count: number }).count,
        ),
        briefs: Number((appDb.prepare("SELECT COUNT(*) AS count FROM briefs").get() as { count: number }).count),
        artifacts: Number(
          (appDb.prepare("SELECT COUNT(*) AS count FROM brief_artifacts").get() as { count: number }).count,
        ),
        reviewNotes: Number(
          (appDb.prepare("SELECT COUNT(*) AS count FROM review_notes").get() as { count: number }).count,
        ),
      };
      expect(counts).toEqual({
        processedEvents: 4,
        briefs: 1,
        artifacts: 2,
        reviewNotes: 1,
      });
    } finally {
      appDb.close();
    }
  }, 20_000);

  it("rejects unexpected Brief Studio producers without committing projection state", async () => {
    expect(await bundleService.getApplicationById(applicationId)).not.toBeNull();

    const binding: ApplicationRunBindingSummary = {
      bindingId: "binding-unexpected-1",
      applicationId,
      executionRef: "brief-unexpected-1",
      status: "ATTACHED",
      resourceRef: {
        owner: "bundle",
        kind: "AGENT_TEAM",
        localId: "brief-studio-team",
      },
      runtime: {
        subject: "TEAM_RUN",
        runId: "team-run-unexpected-1",
        definitionId: "bundle-team__pkg__brief-studio__brief-studio-team",
        members: [
          {
            memberName: "unexpected-member",
            memberRouteKey: "unexpected-member",
            displayName: "Unexpected Member",
            teamPath: [],
            runId: "team-run-unexpected-1::unexpected-member",
            runtimeKind: "AGENT_TEAM_MEMBER",
          },
        ],
      },
      createdAt: "2026-04-19T10:50:00.000Z",
      updatedAt: "2026-04-19T10:50:00.000Z",
      terminatedAt: null,
      lastErrorMessage: null,
    };

    await expect(
      engineHostService.invokeApplicationEventHandler(
        applicationId,
        buildDirectArtifactEnvelope({
          applicationId,
          executionRef: binding.executionRef,
          binding,
          eventId: "unexpected-producer-event",
          journalSequence: 1,
          memberRouteKey: "unexpected-member",
          memberName: "unexpected-member",
          displayName: "Unexpected Member",
          artifactKey: "surprise-artifact",
          artifactType: "research_note",
          title: "Unexpected artifact",
          summary: "Should reject",
          isFinal: false,
          publishedAt: "2026-04-19T10:51:00.000Z",
        }),
      ),
    ).rejects.toThrow("Unexpected Brief Studio artifact producer 'unexpected-member'");

    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const db = new DatabaseSync(layout.appDatabasePath);
    try {
      const counts = {
        processedEvents: Number(
          (db.prepare("SELECT COUNT(*) AS count FROM processed_events").get() as { count: number }).count,
        ),
        briefs: Number((db.prepare("SELECT COUNT(*) AS count FROM briefs").get() as { count: number }).count),
        artifacts: Number(
          (db.prepare("SELECT COUNT(*) AS count FROM brief_artifacts").get() as { count: number }).count,
        ),
      };
      expect(counts).toEqual({
        processedEvents: 0,
        briefs: 0,
        artifacts: 0,
      });
    } finally {
      db.close();
    }
  });
});
