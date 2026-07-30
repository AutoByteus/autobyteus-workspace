import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationBackendNotificationHub } from "../../../src/application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import { buildStandaloneApplicationServerComposition } from "../../../src/compositions/build-standalone-application-server-composition.js";
import { resolveStandaloneApplicationHostConfig } from "../../../src/standalone-application-host/config/standalone-application-host-config.js";
import { StandaloneApplicationSelectionService } from "../../../src/standalone-application-host/services/standalone-application-selection-service.js";
import {
  createAgentToolsMcpProcessAuthority,
  type AgentToolsMcpProcessAuthority,
} from "../../../src/agent-tools/mcp/agent-tools-mcp-process-authority.js";

const BRIEF_PACKAGE_ROOT = path.resolve(
  process.cwd(),
  "..",
  "applications/brief-studio/dist/importable-package",
);

const hashTree = async (root: string): Promise<string> => {
  const hash = createHash("sha256");
  const visit = async (directory: string): Promise<void> => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
      hash.update(`${entry.isDirectory() ? "D" : "F"}:${relativePath}\0`);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else {
        hash.update(await fs.readFile(absolutePath));
      }
    }
  };
  await visit(root);
  return hash.digest("hex");
};

const waitForSocketClose = async (socket: WebSocket): Promise<{ code: number; reason: string }> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for WebSocket close.")), 5_000);
    socket.once("close", (code, reason) => {
      clearTimeout(timer);
      resolve({ code, reason: reason.toString() });
    });
    socket.once("error", () => {
      // Rejected upgrade/connection failures still converge through close.
    });
  });

const waitForSocketMessage = async (socket: WebSocket): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for WebSocket message.")), 5_000);
    socket.once("message", (value) => {
      clearTimeout(timer);
      resolve(JSON.parse(String(value)));
    });
    socket.once("error", reject);
  });

describe("standalone application selection and composition", () => {
  const apps: Array<Awaited<ReturnType<typeof buildStandaloneApplicationServerComposition>>> = [];
  const processAuthorities: AgentToolsMcpProcessAuthority[] = [];

  afterEach(async () => {
    await Promise.allSettled(apps.splice(0).map((app) => app.close()));
    for (const authority of processAuthorities.splice(0)) {
      authority.close();
    }
  });

  it("selects one current package, exposes only its confined surface, and leaves package bytes immutable", async () => {
    const initialDigest = await hashTree(BRIEF_PACKAGE_ROOT);
    const config = resolveStandaloneApplicationHostConfig({
      packageRoot: BRIEF_PACKAGE_ROOT,
      localApplicationId: "brief-studio",
      appDataDir: path.join(BRIEF_PACKAGE_ROOT, "..", ".ignored-test-data"),
      port: 0,
    });
    const { selection } = await new StandaloneApplicationSelectionService().resolve(config);
    expect(selection).toMatchObject({
      packageId: "standalone",
      localApplicationId: "brief-studio",
    });
    expect(selection.applicationId).toMatch(/^bundle-app__/);
    expect(path.relative(BRIEF_PACKAGE_ROOT, selection.entryHtmlPath)).toBe(
      path.join("applications", "brief-studio", "ui", "index.html"),
    );

    const lifecycle = {
      getState: vi.fn(() => "ready"),
      getFailure: vi.fn(() => null),
      awaitReady: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const gateway = {
      ensureApplicationReady: vi.fn(async (applicationId: string) => ({
        applicationId,
        state: "ready",
        ready: true,
      })),
      invokeApplicationQuery: vi.fn(async (
        applicationId: string,
        queryName: string,
        requestContext: { applicationId: string },
        input: unknown,
      ) => ({ applicationId, queryName, requestContext, input })),
      invokeApplicationCommand: vi.fn(),
      executeApplicationGraphql: vi.fn(),
      routeApplicationRequest: vi.fn(),
      connectApplicationWebSocket: vi.fn(),
    };
    const notificationHub = new ApplicationBackendNotificationHub();
    const agentToolsProcessAuthority = createAgentToolsMcpProcessAuthority({
      generalProcessPublication: {
        publishManyForRun: vi.fn(async () => []),
      },
    });
    processAuthorities.push(agentToolsProcessAuthority);
    const app = await buildStandaloneApplicationServerComposition({
      selection,
      graph: {
        lifecycle,
        backendGateway: gateway,
        notificationHub,
        agentCommunicationService: { connect: vi.fn() },
      } as never,
      loggingConfig: {
        pinoLogLevel: "silent",
        httpAccessLogMode: "off",
        includeNoisyHttpAccessRoutes: false,
        scopedLogLevelOverrides: [],
      },
      agentToolsRouteDependencies:
        agentToolsProcessAuthority.routeDependencies,
    });
    apps.push(app);

    const root = await app.inject({ method: "GET", url: "/" });
    expect(root.statusCode).toBe(200);
    expect(root.headers["content-type"]).toContain("text/html");
    expect(root.body).toContain("Brief Studio");

    const asset = await app.inject({ method: "GET", url: "/styles.css" });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers["content-type"]).toContain("text/css");

    const navigation = await app.inject({
      method: "GET",
      url: "/briefs/brief-1",
      headers: { accept: "text/html" },
    });
    expect(navigation.statusCode).toBe(200);
    expect(navigation.body).toBe(root.body);

    for (const url of [
      "/_autobyteus/unrelated",
      "/_autobyteus/graphql",
      "/graphql",
      "/rest/health",
      "/api/admin",
    ]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode, url).toBe(404);
    }
    const apiStyleMissingAsset = await app.inject({
      method: "GET",
      url: "/missing-route",
      headers: { accept: "application/json" },
    });
    expect(apiStyleMissingAsset.statusCode).toBe(404);

    const bootstrap = await app.inject({ method: "GET", url: "/_autobyteus/bootstrap" });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toEqual({
      contractVersion: "1",
      application: {
        applicationId: selection.applicationId,
        localApplicationId: "brief-studio",
        packageId: "standalone",
        name: "Brief Studio",
      },
      transportPaths: {
        backendBasePath: "/_autobyteus/backend",
        backendNotificationsPath: "/_autobyteus/backend/notifications",
        backendWebSocketBasePath: null,
        agentCommunicationWebSocketBasePath: "/_autobyteus/agent",
      },
    });

    const unauthenticatedAgentToolsMcp = await app.inject({
      method: "POST",
      url: "/mcp/agent-tools/missing-session",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "standalone-composition-test", version: "1" },
        },
      },
    });
    expect(unauthenticatedAgentToolsMcp.statusCode).toBe(401);
    expect(unauthenticatedAgentToolsMcp.json()).toMatchObject({
      error: "unauthorized",
    });

    const query = await app.inject({
      method: "POST",
      url: "/_autobyteus/backend/queries/briefs.list",
      payload: { input: { includeArchived: false } },
    });
    expect(query.statusCode).toBe(200);
    expect(query.json()).toEqual({
      result: {
        applicationId: selection.applicationId,
        queryName: "briefs.list",
        requestContext: { applicationId: selection.applicationId },
        input: { includeArchived: false },
      },
    });
    expect(gateway.invokeApplicationQuery).toHaveBeenCalledWith(
      selection.applicationId,
      "briefs.list",
      { applicationId: selection.applicationId },
      { includeArchived: false },
    );

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected an IP listen address.");
    }
    const host = `127.0.0.1:${address.port}`;
    const allowedSocket = new WebSocket(`ws://${host}/_autobyteus/backend/notifications`, {
      headers: { origin: `http://${host}` },
    });
    expect(await waitForSocketMessage(allowedSocket)).toEqual({
      type: "connected",
      applicationId: selection.applicationId,
    });
    allowedSocket.close();

    const rejectedSocket = new WebSocket(`ws://${host}/_autobyteus/backend/notifications`, {
      headers: { origin: "http://127.0.0.1:1" },
    });
    expect(await waitForSocketClose(rejectedSocket)).toEqual({
      code: 1008,
      reason: "Standalone application WebSocket rejected",
    });

    await app.close();
    apps.splice(apps.indexOf(app), 1);
    expect(lifecycle.stop).toHaveBeenCalledTimes(1);
    expect(await hashTree(BRIEF_PACKAGE_ROOT)).toBe(initialDigest);
  }, 20_000);

  it("fails before composition for invalid roots and missing explicit selections", async () => {
    await expect(
      new StandaloneApplicationSelectionService().resolve(
        resolveStandaloneApplicationHostConfig({
          packageRoot: path.join(BRIEF_PACKAGE_ROOT, "missing"),
          localApplicationId: "brief-studio",
          appDataDir: path.join(BRIEF_PACKAGE_ROOT, "..", ".ignored-test-data"),
        }),
      ),
    ).rejects.toThrow("Standalone package root is not a directory");

    await expect(
      new StandaloneApplicationSelectionService().resolve(
        resolveStandaloneApplicationHostConfig({
          packageRoot: BRIEF_PACKAGE_ROOT,
          localApplicationId: "missing-app",
          appDataDir: path.join(BRIEF_PACKAGE_ROOT, "..", ".ignored-test-data"),
        }),
      ),
    ).rejects.toThrow("Standalone application 'missing-app' was not found");

    expect(() => resolveStandaloneApplicationHostConfig({
      packageRoot: BRIEF_PACKAGE_ROOT,
      localApplicationId: "",
      appDataDir: path.join(BRIEF_PACKAGE_ROOT, "..", ".ignored-test-data"),
    })).toThrow("localApplicationId is required");
  });
});
