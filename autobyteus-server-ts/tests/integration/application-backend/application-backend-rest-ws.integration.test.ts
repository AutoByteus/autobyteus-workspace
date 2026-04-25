import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationEngineHostService } from "../../../src/application-engine/services/application-engine-host-service.js";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";
import {
  ApplicationNotificationStreamService,
  type ApplicationNotificationStreamMessage,
} from "../../../src/application-backend-gateway/streaming/application-notification-stream-service.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../src/api/fastify-runtime-config.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";

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

const APPLICATION_ID = "app-1";

const createBundle = (applicationRootPath: string): ApplicationBundle => ({
  id: APPLICATION_ID,
  localApplicationId: "sample-app",
  packageId: "test-package",
  name: "Sample App",
  description: "Sample application backend validation fixture",
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
      frontendSdkContractVersion: "3",
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

describe("Application backend REST/WS integration", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let app: FastifyInstance;
  let baseUrl: string;
  let engineHostService: ApplicationEngineHostService;
  let notificationSocket: WebSocket | null;
  let notificationMessages: ApplicationNotificationStreamMessage[];

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-application-backend-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "sample-app");
    await fs.mkdir(path.join(applicationRootPath, "backend", "dist"), { recursive: true });
    await fs.mkdir(path.join(applicationRootPath, "ui"), { recursive: true });
    await fs.writeFile(path.join(applicationRootPath, "ui", "index.html"), "<!doctype html><html></html>", "utf8");
    await fs.writeFile(
      path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
      `import { DatabaseSync } from 'node:sqlite'

const ensureTables = (storage) => {
  const db = new DatabaseSync(storage.appDatabasePath)
  try {
    db.exec(\`
      CREATE TABLE IF NOT EXISTS handled_events (
        event_id TEXT PRIMARY KEY,
        attempt_number INTEGER NOT NULL,
        family TEXT NOT NULL
      );
    \`)
  } finally {
    db.close()
  }
}

export default {
  definitionContractVersion: '2',
  lifecycle: {
    onStart(ctx) {
      ensureTables(ctx.storage)
    },
  },
  queries: {
    'tickets.get': async (input, ctx) => {
      ensureTables(ctx.storage)
      const db = new DatabaseSync(ctx.storage.appDatabasePath)
      try {
        const handledEvents = db.prepare(
          'SELECT event_id AS eventId, attempt_number AS attemptNumber, family FROM handled_events ORDER BY event_id ASC'
        ).all()
        await ctx.publishNotification('query.called', {
          input,
          requestContext: ctx.requestContext,
        })
        return {
          input,
          requestContext: ctx.requestContext,
          appDatabasePath: ctx.storage.appDatabasePath,
          handledEvents,
        }
      } finally {
        db.close()
      }
    },
  },
  commands: {
    'tickets.create': async (input, ctx) => {
      await ctx.publishNotification('command.called', {
        input,
        requestContext: ctx.requestContext,
      })
      return {
        ok: true,
        input,
        requestContext: ctx.requestContext,
      }
    },
  },
  routes: [
    {
      method: 'GET',
      path: '/tickets/:id',
      handler: async (request, ctx) => {
        await ctx.publishNotification('route.called', {
          params: request.params,
          query: request.query,
          requestContext: ctx.requestContext,
        })
        return {
          status: 200,
          headers: {
            'x-ticket-id': request.params.id,
          },
          body: {
            params: request.params,
            query: request.query,
            requestContext: ctx.requestContext,
          },
        }
      },
    },
  ],
  graphql: {
    async execute(request, ctx) {
      await ctx.publishNotification('graphql.called', {
        operationName: request.operationName ?? null,
        requestContext: ctx.requestContext,
      })
      return {
        query: request.query,
        variables: request.variables ?? null,
        requestContext: ctx.requestContext,
      }
    },
  },
  eventHandlers: {
    async artifact(envelope, ctx) {
      ensureTables(ctx.storage)
      const db = new DatabaseSync(ctx.storage.appDatabasePath)
      try {
        db.prepare(
          'INSERT OR REPLACE INTO handled_events (event_id, attempt_number, family) VALUES (?, ?, ?)'
        ).run(
          envelope.event.eventId,
          envelope.delivery.attemptNumber,
          envelope.event.family,
        )
      } finally {
        db.close()
      }
      await ctx.publishNotification('event.called', {
        eventId: envelope.event.eventId,
        attemptNumber: envelope.delivery.attemptNumber,
      })
    },
  },
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
    await engineHostService.stopApplicationEngine(APPLICATION_ID);
    await app.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
    applicationBackendState.gatewayService = null;
    applicationBackendState.notificationStreamService = null;
  });

  it("starts the app worker through the REST boundary and streams backend notifications over websocket", async () => {
    notificationSocket = new WebSocket(
      `${baseUrl.replace("http://", "ws://")}/ws/applications/${APPLICATION_ID}/backend/notifications`,
    );
    notificationSocket.on("message", (raw) => {
      notificationMessages.push(JSON.parse(String(raw)) as ApplicationNotificationStreamMessage);
    });
    await waitForSocketOpen(notificationSocket);

    const connectedMessage = await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) => message.type === "connected" && message.applicationId === APPLICATION_ID,
      "connected",
    );
    expect(connectedMessage).toEqual({
      type: "connected",
      applicationId: APPLICATION_ID,
    });

    const stoppedStatusResponse = await fetch(`${baseUrl}/rest/applications/${APPLICATION_ID}/backend/status`);
    expect(stoppedStatusResponse.status).toBe(200);
    expect(await stoppedStatusResponse.json()).toEqual({
      applicationId: APPLICATION_ID,
      state: "stopped",
      ready: false,
      startedAt: null,
      lastFailure: null,
      exposures: null,
    });

    const queryResponse = await fetch(
      `${baseUrl}/rest/applications/${APPLICATION_ID}/backend/queries/tickets.get`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestContext: {
            applicationId: APPLICATION_ID,
          },
          input: {
            ticketId: "t-1",
          },
        }),
      },
    );
    expect(queryResponse.status).toBe(200);
    const queryJson = await queryResponse.json() as {
      result: {
        input: { ticketId: string };
        requestContext: { applicationId: string };
        appDatabasePath: string;
        handledEvents: unknown[];
      };
    };
    expect(queryJson.result).toMatchObject({
      input: { ticketId: "t-1" },
      requestContext: {
        applicationId: APPLICATION_ID,
      },
      handledEvents: [],
    });
    expect(queryJson.result.appDatabasePath).toContain(path.join("applications", "app-1", "db", "app.sqlite"));

    const queryNotification = await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "query.called"
        && (message.notification.payload as { requestContext?: { applicationId?: string } }).requestContext
          ?.applicationId === APPLICATION_ID,
      "query.called",
    );
    expect(queryNotification).toMatchObject({
      type: "notification",
      notification: {
        applicationId: APPLICATION_ID,
        topic: "query.called",
      },
    });

    const commandResponse = await fetch(
      `${baseUrl}/rest/applications/${APPLICATION_ID}/backend/commands/tickets.create`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          input: {
            title: "Create ticket",
          },
        }),
      },
    );
    expect(commandResponse.status).toBe(200);
    expect(await commandResponse.json()).toEqual({
      result: {
        ok: true,
        input: {
          title: "Create ticket",
        },
        requestContext: {
          applicationId: APPLICATION_ID,
        },
      },
    });

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "command.called"
        && (message.notification.payload as { requestContext?: { applicationId?: string } }).requestContext
          ?.applicationId === APPLICATION_ID,
      "command.called",
    );

    const routeResponse = await fetch(
      `${baseUrl}/rest/applications/${APPLICATION_ID}/backend/routes/tickets/t-9?draft=true`,
    );
    expect(routeResponse.status).toBe(200);
    expect(routeResponse.headers.get("x-ticket-id")).toBe("t-9");
    expect(await routeResponse.json()).toEqual({
      params: { id: "t-9" },
      query: {
        draft: "true",
      },
      requestContext: {
        applicationId: APPLICATION_ID,
      },
    });

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "route.called"
        && (message.notification.payload as { requestContext?: { applicationId?: string } }).requestContext
          ?.applicationId === APPLICATION_ID,
      "route.called",
    );

    const graphqlResponse = await fetch(
      `${baseUrl}/rest/applications/${APPLICATION_ID}/backend/graphql`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestContext: {
            applicationId: APPLICATION_ID,
          },
          request: {
            query: "query Ping($id: ID!) { ping(id: $id) }",
            operationName: "Ping",
            variables: {
              id: "g-1",
            },
          },
        }),
      },
    );
    expect(graphqlResponse.status).toBe(200);
    expect(await graphqlResponse.json()).toEqual({
      result: {
        query: "query Ping($id: ID!) { ping(id: $id) }",
        variables: {
          id: "g-1",
        },
        requestContext: {
          applicationId: APPLICATION_ID,
        },
      },
    });

    await waitForMessage(
      notificationMessages,
      notificationSocket,
      (message) =>
        message.type === "notification"
        && message.notification.topic === "graphql.called"
        && (message.notification.payload as { requestContext?: { applicationId?: string } }).requestContext
          ?.applicationId === APPLICATION_ID,
      "graphql.called",
    );

    const readyStatusResponse = await fetch(`${baseUrl}/rest/applications/${APPLICATION_ID}/backend/status`);
    expect(readyStatusResponse.status).toBe(200);
    expect(await readyStatusResponse.json()).toEqual({
      applicationId: APPLICATION_ID,
      state: "ready",
      ready: true,
      startedAt: expect.any(String),
      lastFailure: null,
      exposures: {
        supportedExposures: {
          queries: true,
          commands: true,
          routes: true,
          graphql: true,
          notifications: true,
          eventHandlers: true,
        },
        queries: ["tickets.get"],
        commands: ["tickets.create"],
        routes: [{ method: "GET", path: "/tickets/:id" }],
        graphql: true,
        notifications: true,
        eventHandlers: [],
      },
    });
  }, 20_000);

  it("keeps the REST boundary app-scoped by taking application identity from the route, not the body", async () => {
    const response = await fetch(
      `${baseUrl}/rest/applications/${APPLICATION_ID}/backend/commands/tickets.create`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestContext: {
            applicationId: "other-app",
          },
          input: {
            title: "Hello",
          },
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: {
        ok: true,
        input: {
          title: "Hello",
        },
        requestContext: {
          applicationId: APPLICATION_ID,
        },
      },
    });
  });
});
