import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrl,
} from "../../../src/config/server-runtime-endpoints.js";
import {
  __resetManagedMessagingGatewayServiceForTests,
} from "../../../src/managed-capabilities/messaging-gateway/defaults.js";
import {
  createFakeGatewayArchive,
  writeManifest,
} from "./managed-messaging-gateway-e2e-fixtures.js";

describe("Managed messaging gateway recovery GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDir: string;
  let dataDir: string;
  let releaseDir: string;
  let manifestPath: string;
  let artifactServer: http.Server;
  let artifactBaseUrl: string;

  beforeAll(async () => {
    process.env.MANAGED_MESSAGING_GATEWAY_HEALTH_STARTUP_TIMEOUT_MS = "10000";
    process.env.MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS = "50";
    process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS = "50";
    process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_ATTEMPTS = "3";
    process.env.MANAGED_MESSAGING_GATEWAY_SUPERVISION_INTERVAL_MS = "100";
    process.env.MANAGED_MESSAGING_GATEWAY_HEARTBEAT_STALE_AFTER_MS = "500";

    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;

    tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "managed-messaging-gateway-recovery-"),
    );
    dataDir = path.join(tempDir, "data");
    releaseDir = path.join(tempDir, "release-assets");
    await fsp.mkdir(dataDir, { recursive: true });
    await fsp.mkdir(releaseDir, { recursive: true });

    await fsp.writeFile(
      path.join(dataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8899\n",
      "utf8",
    );

    appConfigProvider.config.setCustomAppDataDir(dataDir);
    appConfigProvider.config.initialize();

    await createFakeGatewayArchive(releaseDir, {
      artifactVersion: "0.1.0",
      mode: "healthy",
    });
    await createFakeGatewayArchive(releaseDir, {
      artifactVersion: "0.1.1",
      mode: "stale_then_healthy",
    });

    artifactServer = http.createServer((request, response) => {
      const requestPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      const filePath = path.join(releaseDir, path.basename(requestPath));
      if (!fs.existsSync(filePath)) {
        response.statusCode = 404;
        response.end("not found");
        return;
      }
      fs.createReadStream(filePath).pipe(response);
    });
    await new Promise<void>((resolve) => {
      artifactServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = artifactServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind artifact server.");
    }
    artifactBaseUrl = `http://127.0.0.1:${address.port}`;

    manifestPath = path.join(tempDir, "manifest.json");
    await writeManifest(manifestPath, {
      serverVersion: "0.1.1",
      releaseTag: "v-test-recovery",
      artifactVersion: "0.1.0",
      baseUrl: artifactBaseUrl,
    });
    process.env.MANAGED_MESSAGING_GATEWAY_MANIFEST_PATH = manifestPath;

    schema = await buildGraphqlSchema();
  });

  beforeEach(async () => {
    await __resetManagedMessagingGatewayServiceForTests();
    await fsp.rm(path.join(dataDir, "extensions", "messaging-gateway"), {
      recursive: true,
      force: true,
    });
    await fsp.rm(path.join(dataDir, "download", "messaging-gateway"), {
      recursive: true,
      force: true,
    });
    await fsp.rm(path.join(dataDir, "logs", "messaging-gateway"), {
      recursive: true,
      force: true,
    });
    await writeManifest(manifestPath, {
      serverVersion: "0.1.1",
      releaseTag: "v-test-recovery",
      artifactVersion: "0.1.0",
      baseUrl: artifactBaseUrl,
    });
    seedInternalServerBaseUrl({ host: "0.0.0.0", port: 8000 });
  });

  afterEach(async () => {
    await __resetManagedMessagingGatewayServiceForTests();
    await delay(100);
  });

  afterAll(async () => {
    delete process.env.MANAGED_MESSAGING_GATEWAY_HEALTH_STARTUP_TIMEOUT_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_ATTEMPTS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_SUPERVISION_INTERVAL_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_HEARTBEAT_STALE_AFTER_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_MANIFEST_PATH;
    delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    await __resetManagedMessagingGatewayServiceForTests();
    await new Promise<void>((resolve, reject) => {
      artifactServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    if (process.env.KEEP_MANAGED_MESSAGING_E2E_TMP !== "1") {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  }, 30_000);

  const execGraphql = async <T>(
    source: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("restarts the managed gateway after an unexpected process exit", async () => {
    const enabled = await execGraphql<{
      enableManagedMessagingGateway: {
        enabled: boolean;
        lifecycleState: string;
        pid: number | null;
        runtimeRunning: boolean;
      };
    }>(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          enabled
          lifecycleState
          pid
          runtimeRunning
        }
      }
    `);

    expect(enabled.enableManagedMessagingGateway.enabled).toBe(true);
    expect(enabled.enableManagedMessagingGateway.lifecycleState).toBe("RUNNING");
    expect(enabled.enableManagedMessagingGateway.runtimeRunning).toBe(true);
    expect(enabled.enableManagedMessagingGateway.pid).toBeTypeOf("number");

    const originalPid = enabled.enableManagedMessagingGateway.pid as number;
    process.kill(originalPid, "SIGKILL");

    const recovered = await waitFor(async () => {
      const status = await execGraphql<{
        managedMessagingGatewayStatus: {
          lifecycleState: string;
          runtimeRunning: boolean;
          pid: number | null;
          message: string | null;
        };
      }>(`
        query ManagedGatewayStatus {
          managedMessagingGatewayStatus {
            lifecycleState
            runtimeRunning
            pid
            message
          }
        }
      `);
      const gatewayStatus = status.managedMessagingGatewayStatus;
      if (
        gatewayStatus.lifecycleState !== "RUNNING" ||
        gatewayStatus.runtimeRunning !== true ||
        typeof gatewayStatus.pid !== "number" ||
        gatewayStatus.pid === originalPid
      ) {
        return null;
      }
      return gatewayStatus;
    }, 15_000);

    expect(recovered.pid).not.toBe(originalPid);
    expect(recovered.runtimeRunning).toBe(true);
  }, 20_000);

  it("restarts the managed gateway when heartbeat supervision detects a stale runtime", async () => {
    await writeManifest(manifestPath, {
      serverVersion: "0.1.1",
      releaseTag: "v-test-stale",
      artifactVersion: "0.1.1",
      baseUrl: artifactBaseUrl,
    });

    const enabled = await execGraphql<{
      enableManagedMessagingGateway: {
        enabled: boolean;
        lifecycleState: string;
        activeVersion: string | null;
        pid: number | null;
        runtimeRunning: boolean;
      };
    }>(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          enabled
          lifecycleState
          activeVersion
          pid
          runtimeRunning
        }
      }
    `);

    expect(enabled.enableManagedMessagingGateway.enabled).toBe(true);
    expect(enabled.enableManagedMessagingGateway.lifecycleState).toBe("RUNNING");
    expect(enabled.enableManagedMessagingGateway.activeVersion).toBe("0.1.1");
    expect(enabled.enableManagedMessagingGateway.runtimeRunning).toBe(true);
    expect(enabled.enableManagedMessagingGateway.pid).toBeTypeOf("number");

    const originalPid = enabled.enableManagedMessagingGateway.pid as number;

    const recovered = await waitFor(async () => {
      const status = await execGraphql<{
        managedMessagingGatewayStatus: {
          lifecycleState: string;
          runtimeRunning: boolean;
          activeVersion: string | null;
          pid: number | null;
          message: string | null;
          runtimeReliabilityStatus: Record<string, unknown> | null;
        };
      }>(`
        query ManagedGatewayStatus {
          managedMessagingGatewayStatus {
            lifecycleState
            runtimeRunning
            activeVersion
            pid
            message
            runtimeReliabilityStatus
          }
        }
      `);
      const gatewayStatus = status.managedMessagingGatewayStatus;
      if (
        gatewayStatus.lifecycleState !== "RUNNING" ||
        gatewayStatus.runtimeRunning !== true ||
        gatewayStatus.activeVersion !== "0.1.1" ||
        typeof gatewayStatus.pid !== "number" ||
        !hasFreshRuntimeHeartbeats(gatewayStatus.runtimeReliabilityStatus)
      ) {
        return null;
      }
      return gatewayStatus;
    }, 20_000);

    expect(typeof recovered.pid).toBe("number");
    expect(recovered.runtimeRunning).toBe(true);
    expect(recovered.activeVersion).toBe("0.1.1");
    expect(
      recovered.pid !== originalPid || hasFreshRuntimeHeartbeats(recovered.runtimeReliabilityStatus),
    ).toBe(true);
  }, 25_000);
});

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async <T>(
  fn: () => Promise<T | null>,
  timeoutMs = 5_000,
  intervalMs = 100,
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await fn();
    if (value !== null) {
      return value;
    }
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for condition after ${timeoutMs}ms.`);
};

const hasFreshRuntimeHeartbeats = (
  payload: Record<string, unknown> | null,
  freshnessWindowMs = 5_000,
): boolean => {
  const runtime = asRecord(payload?.runtime);
  const locks = asRecord(runtime?.locks);
  const inbox = asRecord(locks?.inbox);
  const outbox = asRecord(locks?.outbox);

  return [
    asNullableString(runtime?.updatedAt),
    asNullableString(inbox?.lastHeartbeatAt),
    asNullableString(outbox?.lastHeartbeatAt),
  ].every((value) => isFreshTimestamp(value, freshnessWindowMs));
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const isFreshTimestamp = (
  value: string | null,
  freshnessWindowMs: number,
): boolean => {
  if (!value) {
    return false;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return false;
  }
  return Date.now() - parsed <= freshnessWindowMs;
};
