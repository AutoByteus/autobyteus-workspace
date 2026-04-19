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

const buildHostedBackendBaseUrl = (applicationId: string, baseUrl: string): string =>
  `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend`;

const buildHostedBackendNotificationsUrl = (applicationId: string, baseUrl: string): string =>
  `${baseUrl.replace("http://", "ws://")}/ws/applications/${encodeURIComponent(applicationId)}/backend/notifications`;

const createHostedBriefStudioClient = async (
  applicationId: string,
  baseUrl: string,
  requestContext: { applicationId: string; launchInstanceId: string },
) => {
  const { createBriefStudioGraphqlClient } = await import(
    "../../../../applications/brief-studio/dist/importable-package/applications/brief-studio/ui/generated/graphql-client.js"
  );
  return createBriefStudioGraphqlClient({
    application: { applicationId },
    requestContext,
    transport: {
      backendBaseUrl: buildHostedBackendBaseUrl(applicationId, baseUrl),
      backendNotificationsUrl: buildHostedBackendNotificationsUrl(applicationId, baseUrl),
    },
  });
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

const postGraphql = async (
  applicationId: string,
  baseUrl: string,
  requestContext: { applicationId: string; launchInstanceId: string },
  request: {
    query: string;
    operationName?: string | null;
    variables?: Record<string, unknown> | null;
  },
): Promise<Response> =>
  fetch(`${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestContext,
      request,
    }),
  });

const expectGraphqlField = async <T>(
  response: Response,
  label: string,
  fieldName: string,
): Promise<T> => {
  const payload = await expectOkJson<{
    result: {
      data: Record<string, unknown> | null;
      errors?: Array<{ message?: string }>;
    };
  }>(response, label);

  if (Array.isArray(payload.result.errors) && payload.result.errors.length > 0) {
    throw new Error(
      `${label} returned GraphQL errors: ${payload.result.errors.map((error) => error.message || "unknown").join("; ")}`,
    );
  }

  if (!payload.result.data || !(fieldName in payload.result.data)) {
    throw new Error(`${label} did not return field '${fieldName}'.`);
  }

  return payload.result.data[fieldName] as T;
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
  let lookupStore: ApplicationRunLookupStore;
  let latestBinding: ApplicationRunBindingSummary | null;
  let latestTeamRunId: string | null;
  let executionContextByRouteKey: Map<string, ApplicationExecutionContext>;
  let memberRunIdByRouteKey: Map<string, string>;
  let teamRunById: Map<string, { postMessage: (message: unknown, targetMemberName: string | null) => Promise<{ accepted: boolean; message?: string | null }> }>;
  let lifecycleListenersByRunId: Map<string, (event: {
    runtimeSubject: "TEAM_RUN";
    runId: string;
    phase: "ATTACHED" | "TERMINATED" | "FAILED";
    occurredAt: string;
    errorMessage?: string | null;
  }) => void>;
  let onObserveBoundRun: ((descriptor: { runtimeSubject: "TEAM_RUN"; runId: string }) => Promise<void>) | null;

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
    lookupStore = new ApplicationRunLookupStore();

    startupGate = ApplicationOrchestrationStartupGate.getInstance();
    latestBinding = null;
    latestTeamRunId = null;
    executionContextByRouteKey = new Map();
    memberRunIdByRouteKey = new Map();
    teamRunById = new Map();
    lifecycleListenersByRunId = new Map();
    onObserveBoundRun = null;

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
        if (onObserveBoundRun) {
          await onObserveBoundRun(descriptor);
        }
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
        teamRunById.set(latestTeamRunId, {
          postMessage: async () => ({ accepted: true }),
        });
        return {
          runId: latestTeamRunId,
          config: {
            memberConfigs: runtimeMemberConfigs,
          },
        };
      }),
      terminateTeamRun: vi.fn(async () => undefined),
      resolveTeamRun: vi.fn(async (runId: string) => (
        teamRunById.get(runId)
        ?? null
      )),
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

  it("discovers Brief Studio as an imported package, drives the app-owned GraphQL API, and projects live execution events through REST/WS", async () => {
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

    const emptyList = await expectGraphqlField<unknown[]>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: "query BriefsQuery { briefs { briefId } }",
      }),
      "Brief Studio empty list query",
      "briefs",
    );
    expect(emptyList).toEqual([]);

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

    const createdBrief = await expectGraphqlField<{
      briefId: string;
      title: string;
      status: string;
      latestBindingId: string | null;
      latestRunId: string | null;
      latestBindingStatus: string | null;
    }>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `mutation CreateBriefMutation($input: CreateBriefInput!) {
          createBrief(input: $input) {
            briefId
            title
            status
            latestBindingId
            latestRunId
            latestBindingStatus
          }
        }`,
        operationName: "CreateBriefMutation",
        variables: {
          input: {
            title: "Market Entry Brief",
          },
        },
      }),
      "Brief Studio createBrief mutation",
      "createBrief",
    );

    expect(createdBrief.briefId).toMatch(/^brief-/);
    expect(createdBrief.latestBindingId).toBeNull();
    expect(createdBrief.latestRunId).toBeNull();

    const createdNotification = await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.created"
        && (message.notification.payload as { briefId?: string }).briefId === createdBrief.briefId,
      "brief.created",
    );
    expect(createdNotification).toMatchObject({
      type: "notification",
      notification: {
        applicationId,
        topic: "brief.created",
        payload: {
          briefId: createdBrief.briefId,
        },
      } as { applicationId: string; topic: string; payload: ApplicationNotificationMessage["payload"] },
    });

    await vi.waitFor(async () => {
      const detail = await expectGraphqlField<{
        briefId: string;
        status: string;
        latestBindingId: string | null;
        latestRunId: string | null;
        latestBindingStatus: string | null;
        artifacts: unknown[];
      } | null>(
        await postGraphql(applicationId, baseUrl, requestContext, {
          query: `query BriefQuery($briefId: ID!) {
            brief(briefId: $briefId) {
              briefId
              status
              latestBindingId
              latestRunId
              latestBindingStatus
              artifacts { artifactKey }
            }
          }`,
          operationName: "BriefQuery",
          variables: {
            briefId: createdBrief.briefId,
          },
        }),
        "Brief Studio detail after createBrief",
        "brief",
      );
      expect(detail).toMatchObject({
        briefId: createdBrief.briefId,
        status: "not_started",
        latestBindingId: null,
        latestRunId: null,
        latestBindingStatus: null,
        artifacts: [],
      });
    });

    const launchedRun = await expectGraphqlField<{
      briefId: string;
      bindingId: string;
      runId: string;
      status: string;
    }>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `mutation LaunchDraftRunMutation($input: LaunchDraftRunInput!) {
          launchDraftRun(input: $input) {
            briefId
            bindingId
            runId
            status
          }
        }`,
        operationName: "LaunchDraftRunMutation",
        variables: {
          input: {
            briefId: createdBrief.briefId,
            llmModelIdentifier: "gpt-test",
          },
        },
      }),
      "Brief Studio launchDraftRun mutation",
      "launchDraftRun",
    );

    expect(launchedRun.briefId).toBe(createdBrief.briefId);
    expect(launchedRun.bindingId).toEqual(expect.any(String));
    expect(launchedRun.runId).toBe(latestTeamRunId);

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.draft_run_launched"
        && (message.notification.payload as { bindingId?: string }).bindingId === launchedRun.bindingId,
      "brief.draft_run_launched",
    );

    await vi.waitFor(async () => {
      const detail = await expectGraphqlField<{
        briefId: string;
        status: string;
        latestBindingId: string | null;
        latestRunId: string | null;
        latestBindingStatus: string | null;
      } | null>(
        await postGraphql(applicationId, baseUrl, requestContext, {
          query: `query BriefQuery($briefId: ID!) {
            brief(briefId: $briefId) {
              briefId
              status
              latestBindingId
              latestRunId
              latestBindingStatus
            }
          }`,
          operationName: "BriefQuery",
          variables: {
            briefId: createdBrief.briefId,
          },
        }),
        "Brief Studio detail after launchDraftRun",
        "brief",
      );

      expect(detail).toMatchObject({
        briefId: createdBrief.briefId,
        status: "researching",
        latestBindingId: launchedRun.bindingId,
        latestRunId: launchedRun.runId,
        latestBindingStatus: "ATTACHED",
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
        && (message.notification.payload as { bindingId?: string }).bindingId === launchedRun.bindingId,
      "brief.ready_for_review",
    );
    expect(readyForReviewNotification).toMatchObject({
      type: "notification",
      notification: {
        applicationId,
        topic: "brief.ready_for_review",
      },
    });

    lifecycleListenersByRunId.get(launchedRun.runId)?.({
      runtimeSubject: "TEAM_RUN",
      runId: launchedRun.runId,
      phase: "TERMINATED",
      occurredAt: "2026-04-19T10:45:00.000Z",
    });

    await vi.waitFor(async () => {
      const briefs = await expectGraphqlField<
        Array<{
          briefId: string;
          title: string;
          status: string;
          latestBindingId: string | null;
          latestRunId: string | null;
          latestBindingStatus: string | null;
          lastErrorMessage: string | null;
          updatedAt: string;
        }>
      >(
        await postGraphql(applicationId, baseUrl, requestContext, {
          query: `query BriefsQuery {
            briefs {
              briefId
              title
              status
              latestBindingId
              latestRunId
              latestBindingStatus
              lastErrorMessage
              updatedAt
            }
          }`,
          operationName: "BriefsQuery",
        }),
        "Brief Studio list after artifact ingress",
        "briefs",
      );

      expect(briefs).toEqual([
        expect.objectContaining({
          briefId: createdBrief.briefId,
          title: "Market Entry Brief",
          status: "in_review",
          latestBindingId: launchedRun.bindingId,
          latestRunId: launchedRun.runId,
          latestBindingStatus: "TERMINATED",
          lastErrorMessage: null,
        }),
      ]);
    });

    const detail = await expectGraphqlField<{
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
    } | null>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `query BriefQuery($briefId: ID!) {
          brief(briefId: $briefId) {
            briefId
            title
            status
            latestBindingId
            latestRunId
            latestBindingStatus
            lastErrorMessage
            artifacts {
              artifactKind
              artifactKey
              artifactType
              title
              summary
              producerMemberRouteKey
              isFinal
            }
            reviewNotes { noteId }
          }
        }`,
        operationName: "BriefQuery",
        variables: {
          briefId: createdBrief.briefId,
        },
      }),
      "Brief Studio detail after artifact ingress",
      "brief",
    );

    expect(detail).toMatchObject({
      briefId: createdBrief.briefId,
      title: "Market Entry Brief",
      status: "in_review",
      latestBindingId: launchedRun.bindingId,
      latestRunId: launchedRun.runId,
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

    const executions = await expectGraphqlField<
      Array<{
        bindingId: string;
        status: string;
        runId: string;
      }>
    >(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `query BriefExecutionsQuery($briefId: ID!) {
          briefExecutions(briefId: $briefId) {
            bindingId
            status
            runId
          }
        }`,
        operationName: "BriefExecutionsQuery",
        variables: {
          briefId: createdBrief.briefId,
        },
      }),
      "Brief Studio briefExecutions query",
      "briefExecutions",
    );
    expect(executions).toEqual([
      expect.objectContaining({
        bindingId: launchedRun.bindingId,
        status: "TERMINATED",
        runId: launchedRun.runId,
      }),
    ]);

    const addReviewNote = await expectGraphqlField<{
      briefId: string;
      noteId: string;
    }>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `mutation AddReviewNoteMutation($input: AddReviewNoteInput!) {
          addReviewNote(input: $input) {
            briefId
            noteId
          }
        }`,
        operationName: "AddReviewNoteMutation",
        variables: {
          input: {
            briefId: createdBrief.briefId,
            body: "Please tighten the recommendation section.",
          },
        },
      }),
      "Brief Studio addReviewNote mutation",
      "addReviewNote",
    );
    expect(addReviewNote.briefId).toBe(createdBrief.briefId);
    expect(addReviewNote.noteId).toEqual(expect.any(String));

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.note_added"
        && (message.notification.payload as { noteId?: string }).noteId === addReviewNote.noteId,
      "brief.note_added",
    );

    const approveBrief = await expectGraphqlField<{
      briefId: string;
      status: string;
    }>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `mutation ApproveBriefMutation($input: ApproveBriefInput!) {
          approveBrief(input: $input) {
            briefId
            status
          }
        }`,
        operationName: "ApproveBriefMutation",
        variables: {
          input: {
            briefId: createdBrief.briefId,
          },
        },
      }),
      "Brief Studio approveBrief mutation",
      "approveBrief",
    );
    expect(approveBrief).toEqual({
      briefId: createdBrief.briefId,
      status: "approved",
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

    const approvedDetail = await expectGraphqlField<{
      status: string;
      approvedAt: string | null;
      reviewNotes: Array<{
        noteId: string;
        briefId: string;
        body: string;
      }>;
    } | null>(
      await postGraphql(applicationId, baseUrl, requestContext, {
        query: `query BriefQuery($briefId: ID!) {
          brief(briefId: $briefId) {
            status
            approvedAt
            reviewNotes {
              noteId
              briefId
              body
            }
          }
        }`,
        operationName: "BriefQuery",
        variables: {
          briefId: createdBrief.briefId,
        },
      }),
      "Brief Studio detail after approval",
      "brief",
    );
    expect(approvedDetail).toMatchObject({
      status: "approved",
      approvedAt: expect.any(String),
      reviewNotes: [
        expect.objectContaining({
          noteId: addReviewNote.noteId,
          briefId: createdBrief.briefId,
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
        briefBindings: Number(
          (appDb.prepare("SELECT COUNT(*) AS count FROM brief_bindings").get() as { count: number }).count,
        ),
        pendingBindingIntentsCommitted: Number(
          (
            appDb.prepare(
              "SELECT COUNT(*) AS count FROM pending_binding_intents WHERE status = 'COMMITTED'",
            ).get() as { count: number }
          ).count,
        ),
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
        briefBindings: 1,
        pendingBindingIntentsCommitted: 1,
        artifacts: 2,
        reviewNotes: 1,
      });
    } finally {
      appDb.close();
    }
  }, 20_000);

  it("preserves same-binding early final projection when the packaged Brief Studio GraphQL client launches through the hosted backend mount", async () => {
    expect(await bundleService.getApplicationById(applicationId)).not.toBeNull();

    const launchInstanceId = `${applicationId}::launch-race`;
    const requestContext = {
      applicationId,
      launchInstanceId,
    };
    const client = await createHostedBriefStudioClient(applicationId, baseUrl, requestContext);

    notificationSocket = new WebSocket(buildHostedBackendNotificationsUrl(applicationId, baseUrl));
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

    expect(await client.briefs()).toEqual([]);

    const createdBrief = await client.createBrief({
      title: "Launch Race Brief",
    });
    expect(createdBrief).toMatchObject({
      title: "Launch Race Brief",
      status: "not_started",
      latestBindingId: null,
      latestRunId: null,
      latestBindingStatus: null,
    });

    onObserveBoundRun = async ({ runId }) => {
      const writerRunId = `${runId}::writer`;
      await vi.waitFor(() => {
        expect(lookupStore.getLookupByRunId(writerRunId)).toMatchObject({
          applicationId,
        });
      });

      await ingressService.appendRuntimeArtifactEvent({
        runId: writerRunId,
        customData: {
          [APPLICATION_EXECUTION_CONTEXT_KEY]: executionContextByRouteKey.get("writer")!,
        },
        publication: buildArtifactPublication({
          artifactKey: "launch-race-final-1",
          artifactType: "final_brief",
          title: "Launch Race Brief",
          summary: "Projected before launch completion.",
          isFinal: true,
        }),
      });

      const layout = storageLifecycleService.getStorageLayout(applicationId);
      await vi.waitFor(() => {
        const appDb = new DatabaseSync(layout.appDatabasePath);
        try {
          const briefRow = appDb.prepare(
            `SELECT status, latest_binding_status
               FROM briefs
              WHERE brief_id = ?`,
          ).get(createdBrief.briefId) as {
            status: string;
            latest_binding_status: string | null;
          };
          expect(briefRow).toEqual({
            status: "in_review",
            latest_binding_status: "ATTACHED",
          });
        } finally {
          appDb.close();
        }
      });
    };

    const launchedRun = await client.launchDraftRun({
      briefId: createdBrief.briefId,
      llmModelIdentifier: "gpt-test",
    });
    expect(launchedRun).toMatchObject({
      briefId: createdBrief.briefId,
      bindingId: expect.any(String),
      runId: latestTeamRunId,
      status: "ATTACHED",
    });

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.ready_for_review"
        && (message.notification.payload as { bindingId?: string }).bindingId === launchedRun.bindingId,
      "brief.ready_for_review",
    );

    const detail = await client.brief(createdBrief.briefId);
    expect(detail).toMatchObject({
      briefId: createdBrief.briefId,
      title: "Launch Race Brief",
      status: "in_review",
      latestBindingId: launchedRun.bindingId,
      latestRunId: launchedRun.runId,
      latestBindingStatus: "ATTACHED",
      lastErrorMessage: null,
      artifacts: [
        expect.objectContaining({
          artifactKey: "launch-race-final-1",
          artifactType: "final_brief",
          title: "Launch Race Brief",
          summary: "Projected before launch completion.",
          producerMemberRouteKey: "writer",
          isFinal: true,
        }),
      ],
    });

    expect(await client.briefs()).toEqual([
      expect.objectContaining({
        briefId: createdBrief.briefId,
        title: "Launch Race Brief",
        status: "in_review",
        latestBindingId: launchedRun.bindingId,
        latestRunId: launchedRun.runId,
        latestBindingStatus: "ATTACHED",
        lastErrorMessage: null,
      }),
    ]);

    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const appDb = new DatabaseSync(layout.appDatabasePath);
    try {
      const counts = {
        briefBindings: Number(
          (appDb.prepare("SELECT COUNT(*) AS count FROM brief_bindings").get() as { count: number }).count,
        ),
        pendingBindingIntentsCommitted: Number(
          (
            appDb.prepare(
              "SELECT COUNT(*) AS count FROM pending_binding_intents WHERE status = 'COMMITTED'",
            ).get() as { count: number }
          ).count,
        ),
        artifacts: Number(
          (appDb.prepare("SELECT COUNT(*) AS count FROM brief_artifacts").get() as { count: number }).count,
        ),
      };
      expect(counts).toEqual({
        briefBindings: 1,
        pendingBindingIntentsCommitted: 1,
        artifacts: 1,
      });
    } finally {
      appDb.close();
    }
  }, 20_000);

  it("rejects unexpected Brief Studio producers without committing projection state", async () => {
    expect(await bundleService.getApplicationById(applicationId)).not.toBeNull();
    await storageLifecycleService.ensureStoragePrepared(applicationId);
    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const seededDb = new DatabaseSync(layout.appDatabasePath);
    try {
      seededDb.prepare(
        `INSERT INTO briefs (
           brief_id,
           title,
           status,
           latest_binding_id,
           latest_run_id,
           latest_binding_status,
           last_error_message,
           created_at,
           updated_at,
           approved_at,
           rejected_at
         ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL)`,
      ).run(
        "brief-unexpected-1",
        "Unexpected Brief",
        "not_started",
        "2026-04-19T10:49:00.000Z",
        "2026-04-19T10:49:00.000Z",
      );
      seededDb.prepare(
        `INSERT INTO pending_binding_intents (
           binding_intent_id,
           brief_id,
           status,
           binding_id,
           created_at,
           updated_at,
           committed_at
         ) VALUES (?, ?, 'PENDING_START', NULL, ?, ?, NULL)`,
      ).run(
        "binding-intent-unexpected-1",
        "brief-unexpected-1",
        "2026-04-19T10:49:30.000Z",
        "2026-04-19T10:49:30.000Z",
      );
    } finally {
      seededDb.close();
    }

    const binding: ApplicationRunBindingSummary = {
      bindingId: "binding-unexpected-1",
      applicationId,
      bindingIntentId: "binding-intent-unexpected-1",
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

    const db = new DatabaseSync(layout.appDatabasePath);
    try {
      const counts = {
        processedEvents: Number(
          (db.prepare("SELECT COUNT(*) AS count FROM processed_events").get() as { count: number }).count,
        ),
        briefs: Number((db.prepare("SELECT COUNT(*) AS count FROM briefs").get() as { count: number }).count),
        briefBindings: Number(
          (db.prepare("SELECT COUNT(*) AS count FROM brief_bindings").get() as { count: number }).count,
        ),
        artifacts: Number(
          (db.prepare("SELECT COUNT(*) AS count FROM brief_artifacts").get() as { count: number }).count,
        ),
      };
      expect(counts).toEqual({
        processedEvents: 0,
        briefs: 1,
        briefBindings: 1,
        artifacts: 0,
      });
    } finally {
      db.close();
    }
  });
});
