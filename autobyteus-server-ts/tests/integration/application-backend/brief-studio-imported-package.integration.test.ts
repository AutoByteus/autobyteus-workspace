import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import {
  BUILT_IN_APPLICATION_PACKAGE_ID,
  FileApplicationBundleProvider,
} from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationEngineHostService } from "../../../src/application-engine/services/application-engine-host-service.js";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";
import {
  ApplicationNotificationStreamService,
  type ApplicationNotificationStreamMessage,
} from "../../../src/application-backend-gateway/streaming/application-notification-stream-service.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../src/api/fastify-runtime-config.js";

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

import { registerApplicationBackendRoutes } from "../../../src/api/rest/application-backends.js";
import { registerApplicationBackendNotificationWebsocket } from "../../../src/api/websocket/application-backend-notifications.js";

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
      const preview = JSON.stringify(messages.slice(-3));
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

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const buildArtifactEnvelope = (input: {
  applicationId: string;
  applicationSessionId: string;
  eventId: string;
  journalSequence: number;
  memberRouteKey: string;
  artifactKey: string;
  artifactType: string;
  title: string;
  summary?: string;
  isFinal: boolean;
  attemptNumber: number;
  publishedAt: string;
}) => ({
  envelope: {
    event: {
      eventId: input.eventId,
      journalSequence: input.journalSequence,
      applicationId: input.applicationId,
      applicationSessionId: input.applicationSessionId,
      family: "ARTIFACT" as const,
      publishedAt: input.publishedAt,
      producer: {
        memberRouteKey: input.memberRouteKey,
        role: "AGENT_TEAM_MEMBER",
      },
      payload: {
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
      },
    },
    delivery: {
      semantics: "AT_LEAST_ONCE" as const,
      attemptNumber: input.attemptNumber,
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
  let notificationSocket: WebSocket | null;
  let notificationMessages: ApplicationNotificationStreamMessage[];

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-brief-studio-"));
    builtInAppRoot = path.join(tempRoot, "built-in-root");
    appDataRoot = path.join(tempRoot, "app-data");
    await fs.mkdir(builtInAppRoot, { recursive: true });
    await fs.mkdir(appDataRoot, { recursive: true });

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

    engineHostService = new ApplicationEngineHostService({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });
    applicationBackendState.notificationStreamService = new ApplicationNotificationStreamService();
    applicationBackendState.gatewayService = new ApplicationBackendGatewayService({
      applicationBundleService: bundleService as never,
      engineHostService,
      notificationStreamService: applicationBackendState.notificationStreamService,
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
  });

  it("discovers Brief Studio as an imported package and executes the generated sample backend flow through REST/WS", async () => {
    const applications = await bundleService.listApplications();
    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      localApplicationId: "brief-studio",
      name: "Brief Studio",
    });
    expect(applications[0]!.packageId.startsWith("application-local:")).toBe(true);
    expect(applications[0]!.packageId).not.toBe(BUILT_IN_APPLICATION_PACKAGE_ID);
    expect(await bundleService.getApplicationById(applicationId)).not.toBeNull();

    const stoppedStatusResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/status`,
    );
    if (stoppedStatusResponse.status !== 200) {
      throw new Error(
        `Expected imported Brief Studio status route to succeed, received ${stoppedStatusResponse.status}: ${await stoppedStatusResponse.text()} (applicationIdLength=${applicationId.length})`,
      );
    }
    expect(await stoppedStatusResponse.json()).toEqual({
      applicationId,
      state: "stopped",
      ready: false,
      startedAt: null,
      lastFailure: null,
      exposures: null,
    });

    const emptyListResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.list`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: null }),
      },
    );
    if (emptyListResponse.status !== 200) {
      throw new Error(
        `Expected imported Brief Studio list query to succeed, received ${emptyListResponse.status}: ${await emptyListResponse.text()} (applicationIdLength=${applicationId.length})`,
      );
    }
    expect(await emptyListResponse.json()).toEqual({
      result: {
        briefs: [],
      },
    });

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

    const researcherEvent = buildArtifactEnvelope({
      applicationId,
      applicationSessionId: "session-brief-1",
      eventId: "research-event-1",
      journalSequence: 1,
      memberRouteKey: "researcher",
      artifactKey: "research-note-1",
      artifactType: "research_note",
      title: "Research Summary",
      summary: "Audience and sources collected.",
      isFinal: false,
      attemptNumber: 1,
      publishedAt: "2026-04-14T19:00:00.000Z",
    });
    const writerEvent = buildArtifactEnvelope({
      applicationId,
      applicationSessionId: "session-brief-1",
      eventId: "writer-event-1",
      journalSequence: 2,
      memberRouteKey: "writer",
      artifactKey: "brief-draft-1",
      artifactType: "final_brief",
      title: "Market Entry Brief",
      summary: "Draft ready for review.",
      isFinal: true,
      attemptNumber: 1,
      publishedAt: "2026-04-14T19:02:00.000Z",
    });

    await expect(engineHostService.invokeApplicationEventHandler(applicationId, researcherEvent)).resolves.toEqual({
      status: "acknowledged",
    });
    await expect(engineHostService.invokeApplicationEventHandler(applicationId, writerEvent)).resolves.toEqual({
      status: "acknowledged",
    });

    const readyForReviewNotification = await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "brief.ready_for_review"
        && (message.notification.payload as { eventId?: string }).eventId === "writer-event-1",
      "brief.ready_for_review",
    );
    expect(readyForReviewNotification).toMatchObject({
      type: "notification",
      notification: {
        applicationId,
        topic: "brief.ready_for_review",
      },
    });

    const listResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.list`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: null }),
      },
    );
    if (listResponse.status !== 200) {
      throw new Error(`Expected Brief Studio list query to succeed, received ${listResponse.status}: ${await listResponse.text()}`);
    }
    expect(await listResponse.json()).toEqual({
      result: {
        briefs: [
          {
            briefId: "brief::session-brief-1",
            applicationSessionId: "session-brief-1",
            title: "Market Entry Brief",
            status: "in_review",
            updatedAt: "2026-04-14T19:02:00.000Z",
          },
        ],
      },
    });

    const detailResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.getDetail`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: {
            briefId: "brief::session-brief-1",
          },
        }),
      },
    );
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toEqual({
      result: {
        brief: {
          briefId: "brief::session-brief-1",
          applicationSessionId: "session-brief-1",
          title: "Market Entry Brief",
          status: "in_review",
          createdAt: "2026-04-14T19:00:00.000Z",
          updatedAt: "2026-04-14T19:02:00.000Z",
          approvedAt: null,
          rejectedAt: null,
          artifacts: [
            {
              briefId: "brief::session-brief-1",
              artifactKind: "researcher",
              artifactKey: "research-note-1",
              artifactType: "research_note",
              title: "Research Summary",
              summary: "Audience and sources collected.",
              artifactRef: {
                kind: "INLINE_JSON",
                mimeType: "application/json",
                value: {
                  title: "Research Summary",
                },
              },
              metadata: null,
              isFinal: false,
              producerMemberRouteKey: "researcher",
              updatedAt: "2026-04-14T19:00:00.000Z",
            },
            {
              briefId: "brief::session-brief-1",
              artifactKind: "writer",
              artifactKey: "brief-draft-1",
              artifactType: "final_brief",
              title: "Market Entry Brief",
              summary: "Draft ready for review.",
              artifactRef: {
                kind: "INLINE_JSON",
                mimeType: "application/json",
                value: {
                  title: "Market Entry Brief",
                },
              },
              metadata: null,
              isFinal: true,
              producerMemberRouteKey: "writer",
              updatedAt: "2026-04-14T19:02:00.000Z",
            },
          ],
          reviewNotes: [],
        },
      },
    });

    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const initialDb = new DatabaseSync(layout.appDatabasePath);
    try {
      const counts = {
        processedEvents: Number(
          (initialDb.prepare("SELECT COUNT(*) AS count FROM processed_events").get() as { count: number }).count,
        ),
        briefs: Number((initialDb.prepare("SELECT COUNT(*) AS count FROM briefs").get() as { count: number }).count),
        artifacts: Number(
          (initialDb.prepare("SELECT COUNT(*) AS count FROM brief_artifacts").get() as { count: number }).count,
        ),
      };
      expect(counts).toEqual({
        processedEvents: 2,
        briefs: 1,
        artifacts: 2,
      });
    } finally {
      initialDb.close();
    }

    await expect(
      engineHostService.invokeApplicationEventHandler(
        applicationId,
        buildArtifactEnvelope({
          applicationId,
          applicationSessionId: "session-brief-1",
          eventId: "writer-event-1",
          journalSequence: 2,
          memberRouteKey: "writer",
          artifactKey: "brief-draft-1",
          artifactType: "final_brief",
          title: "Market Entry Brief",
          summary: "Duplicate delivery should be ignored.",
          isFinal: true,
          attemptNumber: 2,
          publishedAt: "2026-04-14T19:03:00.000Z",
        }),
      ),
    ).resolves.toEqual({ status: "acknowledged" });

    await sleep(200);
    expect(
      notificationMessages.filter(
        (message) =>
          message.type === "notification"
          && message.notification.topic === "brief.ready_for_review",
      ),
    ).toHaveLength(1);

    const dedupeDb = new DatabaseSync(layout.appDatabasePath);
    try {
      const counts = {
        processedEvents: Number(
          (dedupeDb.prepare("SELECT COUNT(*) AS count FROM processed_events").get() as { count: number }).count,
        ),
        briefs: Number((dedupeDb.prepare("SELECT COUNT(*) AS count FROM briefs").get() as { count: number }).count),
        artifacts: Number(
          (dedupeDb.prepare("SELECT COUNT(*) AS count FROM brief_artifacts").get() as { count: number }).count,
        ),
      };
      expect(counts).toEqual({
        processedEvents: 2,
        briefs: 1,
        artifacts: 2,
      });
    } finally {
      dedupeDb.close();
    }

    const addNoteResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/commands/addReviewNote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: {
            briefId: "brief::session-brief-1",
            body: "Please tighten the recommendation section.",
          },
        }),
      },
    );
    expect(addNoteResponse.status).toBe(200);
    const addNoteJson = await addNoteResponse.json() as {
      result: {
        briefId: string;
        noteId: string;
      };
    };
    expect(addNoteJson.result.briefId).toBe("brief::session-brief-1");
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

    const approveResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/commands/approveBrief`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: {
            briefId: "brief::session-brief-1",
          },
        }),
      },
    );
    expect(approveResponse.status).toBe(200);
    expect(await approveResponse.json()).toEqual({
      result: {
        briefId: "brief::session-brief-1",
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

    const approvedDetailResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.getDetail`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: {
            briefId: "brief::session-brief-1",
          },
        }),
      },
    );
    expect(approvedDetailResponse.status).toBe(200);
    const approvedDetailJson = await approvedDetailResponse.json() as {
      result: {
        brief: {
          status: string;
          approvedAt: string | null;
          reviewNotes: Array<{
            noteId: string;
            briefId: string;
            body: string;
            createdAt: string;
          }>;
        };
      };
    };
    expect(approvedDetailJson.result.brief.status).toBe("approved");
    expect(approvedDetailJson.result.brief.approvedAt).toEqual(expect.any(String));
    expect(approvedDetailJson.result.brief.reviewNotes).toEqual([
      expect.objectContaining({
        noteId: addNoteJson.result.noteId,
        briefId: "brief::session-brief-1",
        body: "Please tighten the recommendation section.",
        createdAt: expect.any(String),
      }),
    ]);
  }, 20_000);

  it("rejects unexpected Brief Studio producers without committing projection state", async () => {
    expect(await bundleService.getApplicationById(applicationId)).not.toBeNull();

    const listResponse = await fetch(
      `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/queries/briefs.list`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: null }),
      },
    );
    if (listResponse.status !== 200) {
      throw new Error(
        `Expected imported Brief Studio list query to succeed before unknown-producer guard check, received ${listResponse.status}: ${await listResponse.text()} (applicationIdLength=${applicationId.length})`,
      );
    }

    await expect(
      engineHostService.invokeApplicationEventHandler(
        applicationId,
        buildArtifactEnvelope({
          applicationId,
          applicationSessionId: "session-brief-2",
          eventId: "unexpected-producer-event",
          journalSequence: 1,
          memberRouteKey: "unexpected-member",
          artifactKey: "surprise-artifact",
          artifactType: "research_note",
          title: "Unexpected artifact",
          summary: "Should reject",
          isFinal: false,
          attemptNumber: 1,
          publishedAt: "2026-04-14T19:10:00.000Z",
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
