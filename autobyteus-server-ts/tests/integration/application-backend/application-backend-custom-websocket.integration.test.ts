import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationBackendApiGatewayService } from "../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { createApplicationEngineTestRuntime } from "./application-engine-test-runtime.js";
import {
  createApplicationBackendMountTransport,
} from "../../../../autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.js";
import { createApplicationClient } from "../../../../autobyteus-application-frontend-sdk/src/application-client.js";
import type {
  ApplicationBackendWebSocketConnection,
  ApplicationBackendWebSocketCloseEvent,
} from "../../../../autobyteus-application-frontend-sdk/src/application-backend-websocket-connection.js";
import type { ApplicationWebSocketFrame } from "@autobyteus/application-sdk-contracts";

const gatewayState = vi.hoisted(() => ({
  service: null as ApplicationBackendApiGatewayService | null,
}));

vi.mock("../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js")
  >("../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js");
  return {
    ...actual,
    getApplicationBackendApiGatewayService: () => {
      if (!gatewayState.service) throw new Error("Integration test API gateway was not initialized.");
      return gatewayState.service;
    },
  };
});

import { registerApplicationBackendWebsocket } from "../../../src/api/websocket/application-backends.js";

const APPLICATION_ID = "custom-websocket-app";
const DISABLED_APPLICATION_ID = "custom-websocket-disabled";

const createBundle = (
  applicationRootPath: string,
  applicationId: string,
  webSockets: boolean,
): ApplicationBundle => ({
  id: applicationId,
  localApplicationId: applicationId,
  packageId: "integration-fixture",
  name: "Custom WebSocket Integration",
  description: "Exercises the real custom application WebSocket worker path",
  iconAssetPath: null,
  entryHtmlAssetPath: `/application-bundles/${applicationId}/assets/ui/index.html`,
  runtimeTarget: {
    kind: "AGENT",
    localId: "sample-agent",
    definitionId: "sample-agent-definition",
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
      backendDefinitionContractVersion: "6",
      frontendSdkContractVersion: "6",
    },
    supportedExposures: {
      queries: false,
      commands: false,
      routes: false,
      graphql: false,
      notifications: false,
      eventHandlers: false,
      webSockets,
    },
    migrationsDirPath: null,
    migrationsDirRelativePath: null,
    assetsDirPath: null,
    assetsDirRelativePath: null,
  },
});

const waitFor = async (predicate: () => boolean | Promise<boolean>, label: string): Promise<void> => {
  const deadline = Date.now() + 7_500;
  while (!await predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const waitForClose = (connection: ApplicationBackendWebSocketConnection) =>
  new Promise<ApplicationBackendWebSocketCloseEvent>((resolve) => connection.onClose(resolve));

describe("Application backend custom WebSocket integration", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let app: FastifyInstance;
  let baseUrl: string;
  let engineRuntime: ReturnType<typeof createApplicationEngineTestRuntime>;
  const sockets: ApplicationBackendWebSocketConnection[] = [];

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-custom-websocket-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", APPLICATION_ID);
    await fs.mkdir(path.join(applicationRootPath, "backend", "dist"), { recursive: true });
    await fs.mkdir(path.join(applicationRootPath, "ui"), { recursive: true });
    await fs.writeFile(path.join(applicationRootPath, "ui", "index.html"), "<!doctype html><html></html>", "utf8");
    await fs.writeFile(
      path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
      `import { appendFileSync } from 'node:fs'

export default {
  definitionContractVersion: '6',
  webSocketRoutes: [{
    path: '/rooms/:roomId',
    async open(request, session, context) {
      if (request.params.roomId === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      await session.send(JSON.stringify({
        kind: 'opened',
        path: request.path,
        params: request.params,
        query: request.query,
        requestContext: context.requestContext,
      }))
      await session.send(new Uint8Array([7, 8]))
      return {
        async onMessage(frame) {
          if (frame.kind === 'text') {
            await session.send('echo:' + frame.text)
            return
          }
          await session.send(new Uint8Array(Array.from(frame.data, (value) => value + 1)))
        },
        onClose(event) {
          appendFileSync(
            context.storage.logsPath + '/ws-close.log',
            JSON.stringify({ roomId: request.params.roomId, event }) + '\\n',
          )
        },
      }
    },
  }],
}
`,
      "utf8",
    );

    const bundleService = {
      getApplicationById: vi.fn(async (applicationId: string) => {
        if (applicationId === APPLICATION_ID) {
          return createBundle(applicationRootPath, applicationId, true);
        }
        if (applicationId === DISABLED_APPLICATION_ID) {
          return createBundle(applicationRootPath, applicationId, false);
        }
        return null;
      }),
    };
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      applicationBundleService: bundleService as never,
    });
    engineRuntime = createApplicationEngineTestRuntime({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });
    gatewayState.service = engineRuntime.backendGateway;

    app = fastify();
    await app.register(websocket);
    await registerApplicationBackendWebsocket(app, {
      gateway: gatewayState.service,
      lifecycle: { awaitReady: async () => undefined },
    } as never);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected an ephemeral TCP address.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.close();
    await engineRuntime.engineLauncher.stop(APPLICATION_ID).catch(() => undefined);
    await engineRuntime.engineLauncher.stop(DISABLED_APPLICATION_ID).catch(() => undefined);
    engineRuntime.backendGateway.dispose();
    await app.close();
    gatewayState.service = null;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const createClient = (applicationId: string) => {
    const transport = createApplicationBackendMountTransport({
      backendBaseUrl: `${baseUrl}/rest/applications/${applicationId}/backend`,
      backendWebSocketBaseUrl:
        `${baseUrl.replace("http://", "ws://")}/ws/applications/${applicationId}/backend/routes`,
      applicationWebSocketFactory: (url) => new WebSocket(url) as never,
    });
    return createApplicationClient({ applicationId, transport });
  };

  it("round-trips readiness-hidden text and binary frames through the real Gateway and child worker", async () => {
    const connection = createClient(APPLICATION_ID).backend.connectWebSocket("/rooms/room one", {
      query: { view: ["compact", "full"], tag: "integration" },
    });
    sockets.push(connection);
    const messages: ApplicationWebSocketFrame[] = [];
    connection.onMessage((message) => messages.push(message));

    await connection.ready;
    expect(connection.state).toBe("open");
    await waitFor(() => messages.length === 2, "backend frames accepted during open");
    expect(messages[0]).toEqual({
      kind: "text",
      text: JSON.stringify({
        kind: "opened",
        path: "/rooms/room one",
        params: { roomId: "room one" },
        query: { view: ["compact", "full"], tag: "integration" },
        requestContext: { applicationId: APPLICATION_ID },
      }),
    });
    expect(messages[1]).toEqual({ kind: "binary", data: Uint8Array.from([7, 8]) });

    await connection.send("hello");
    await connection.send(Uint8Array.from([1, 2, 3]));
    await waitFor(() => messages.length === 4, "ordered custom WebSocket echoes");
    expect(messages.slice(2)).toEqual([
      { kind: "text", text: "echo:hello" },
      { kind: "binary", data: Uint8Array.from([2, 3, 4]) },
    ]);

    const close = waitForClose(connection);
    connection.close(1000, "finished");
    await expect(close).resolves.toMatchObject({ code: 1000, reason: "finished" });
    await waitFor(async () => {
      const logPath = path.join(tempRoot, "applications", APPLICATION_ID, "logs", "ws-close.log");
      const contents = await fs.readFile(logPath, "utf8").catch(() => "");
      return contents.split("\n").filter((line) => line.includes('"roomId":"room one"')).length === 1;
    }, "exactly-once worker close callback");
  }, 20_000);

  it("rejects early raw frames and disabled exposure before opening the worker path", async () => {
    const raw = new WebSocket(
      `${baseUrl.replace("http://", "ws://")}/ws/applications/${APPLICATION_ID}/backend/routes/rooms/slow`,
    );
    const rawClose = new Promise<{ code: number; reason: string }>((resolve, reject) => {
      raw.once("open", () => raw.send("too early"));
      raw.once("error", reject);
      raw.once("close", (code, reason) => resolve({ code, reason: String(reason) }));
    });
    await expect(rawClose).resolves.toMatchObject({ code: 1002 });

    const openSpy = vi.spyOn(engineRuntime.engineController, "openApplicationWebSocket");
    const disabled = createClient(DISABLED_APPLICATION_ID).backend.connectWebSocket("/rooms/disabled");
    sockets.push(disabled);
    await expect(disabled.ready).rejects.toMatchObject({
      code: "CONNECTION_REJECTED",
      message: "The application backend WebSocket connection was rejected.",
      recoverable: true,
    });
    expect(openSpy).not.toHaveBeenCalledWith(DISABLED_APPLICATION_ID, expect.anything());
  }, 20_000);

  it("maps a real worker stop to one safe frontend error and close", async () => {
    const connection = createClient(APPLICATION_ID).backend.connectWebSocket("/rooms/worker-stop");
    sockets.push(connection);
    const errors: Array<{ code: string }> = [];
    connection.onError((error) => errors.push(error));
    const close = waitForClose(connection);
    await connection.ready;

    await engineRuntime.engineLauncher.stop(APPLICATION_ID);
    await expect(close).resolves.toMatchObject({ code: 1012 });
    await waitFor(() => errors.length === 1, "one frontend worker-stop error");
    expect(errors.map((error) => error.code)).toEqual(["BACKEND_UNAVAILABLE"]);
    expect(connection.state).toBe("closed");
  }, 20_000);
});
