import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  __resetManagedMessagingGatewayServiceForTests,
} from "../../../src/managed-capabilities/messaging-gateway/defaults.js";
import {
  createFakeGatewayArchive,
  writeManifest,
} from "./managed-messaging-gateway-e2e-fixtures.js";

describe("Managed messaging gateway update GraphQL e2e", () => {
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

    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;

    tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "managed-messaging-gateway-update-"),
    );
    dataDir = path.join(tempDir, "data");
    releaseDir = path.join(tempDir, "release-assets");
    await fsp.mkdir(dataDir, { recursive: true });
    await fsp.mkdir(releaseDir, { recursive: true });

    const envPath = path.join(dataDir, ".env");
    await fsp.writeFile(
      envPath,
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
      mode: "healthy",
    });
    await createFakeGatewayArchive(releaseDir, {
      artifactVersion: "0.2.0",
      mode: "failing",
    });

    artifactServer = http.createServer((request, response) => {
      const requestPath = new URL(request.url ?? "/", "http://127.0.0.1")
        .pathname;
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
      releaseTag: "v-test-1",
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
      releaseTag: "v-test-1",
      artifactVersion: "0.1.0",
      baseUrl: artifactBaseUrl,
    });
  });

  afterAll(async () => {
    delete process.env.MANAGED_MESSAGING_GATEWAY_HEALTH_STARTUP_TIMEOUT_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_MANIFEST_PATH;
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
  });

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

  it("updates to a newer runtime while preserving the disabled state", async () => {
    await execGraphql(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          lifecycleState
        }
      }
    `);
    await execGraphql(`
      mutation DisableManagedGateway {
        disableManagedMessagingGateway {
          lifecycleState
        }
      }
    `);

    await writeManifest(manifestPath, {
      serverVersion: "0.1.1",
      releaseTag: "v-test-1-1",
      artifactVersion: "0.1.1",
      baseUrl: artifactBaseUrl,
    });

    const updated = await execGraphql<{
      updateManagedMessagingGateway: {
        enabled: boolean;
        lifecycleState: string;
        activeVersion: string | null;
        runtimeRunning: boolean;
        installedVersions: string[];
      };
    }>(`
      mutation UpdateManagedGateway {
        updateManagedMessagingGateway {
          enabled
          lifecycleState
          activeVersion
          runtimeRunning
          installedVersions
        }
      }
    `);

    expect(updated.updateManagedMessagingGateway.enabled).toBe(false);
    expect(updated.updateManagedMessagingGateway.lifecycleState).toBe("DISABLED");
    expect(updated.updateManagedMessagingGateway.activeVersion).toBe("0.1.1");
    expect(updated.updateManagedMessagingGateway.runtimeRunning).toBe(false);
    expect(updated.updateManagedMessagingGateway.installedVersions).toContain(
      "0.1.1",
    );

    const installEntrypoint = path.join(
      dataDir,
      "extensions",
      "messaging-gateway",
      "versions",
      "0.1.1",
      "dist",
      "index.js",
    );
    expect(fs.existsSync(installEntrypoint)).toBe(true);
  }, 30_000);

  it("restarts the managed runtime when update is requested on the latest compatible version", async () => {
    await execGraphql(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          lifecycleState
          activeVersion
        }
      }
    `);

    await __resetManagedMessagingGatewayServiceForTests();

    const beforeUpdate = await execGraphql<{
      managedMessagingGatewayStatus: {
        enabled: boolean;
        activeVersion: string | null;
        runtimeRunning: boolean;
      };
    }>(`
      query ManagedGatewayStatusBeforeUpdate {
        managedMessagingGatewayStatus {
          enabled
          activeVersion
          runtimeRunning
        }
      }
    `);

    expect(beforeUpdate.managedMessagingGatewayStatus.enabled).toBe(true);
    expect(beforeUpdate.managedMessagingGatewayStatus.activeVersion).toBe("0.1.0");
    expect(beforeUpdate.managedMessagingGatewayStatus.runtimeRunning).toBe(false);

    const updated = await execGraphql<{
      updateManagedMessagingGateway: {
        enabled: boolean;
        lifecycleState: string;
        activeVersion: string | null;
        runtimeRunning: boolean;
      };
    }>(`
      mutation UpdateManagedGateway {
        updateManagedMessagingGateway {
          enabled
          lifecycleState
          activeVersion
          runtimeRunning
        }
      }
    `);

    expect(updated.updateManagedMessagingGateway.enabled).toBe(true);
    expect(updated.updateManagedMessagingGateway.lifecycleState).toBe("RUNNING");
    expect(updated.updateManagedMessagingGateway.activeVersion).toBe("0.1.0");
    expect(updated.updateManagedMessagingGateway.runtimeRunning).toBe(true);
  }, 30_000);

  it("rolls back to the previous active version when update activation fails", async () => {
    await execGraphql(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          lifecycleState
          activeVersion
        }
      }
    `);

    await writeManifest(manifestPath, {
      serverVersion: "0.1.1",
      releaseTag: "v-test-2",
      artifactVersion: "0.2.0",
      baseUrl: artifactBaseUrl,
    });

    const updated = await execGraphql<{
      updateManagedMessagingGateway: {
        lifecycleState: string;
        activeVersion: string | null;
        lastError: string | null;
        message: string | null;
        runtimeRunning: boolean;
      };
    }>(`
      mutation UpdateManagedGateway {
        updateManagedMessagingGateway {
          lifecycleState
          activeVersion
          lastError
          message
          runtimeRunning
        }
      }
    `);

    expect(updated.updateManagedMessagingGateway.lifecycleState).toBe("RUNNING");
    expect(updated.updateManagedMessagingGateway.activeVersion).toBe("0.1.0");
    expect(updated.updateManagedMessagingGateway.runtimeRunning).toBe(true);
    expect(updated.updateManagedMessagingGateway.message).toContain(
      "previous version was restored",
    );
  }, 30_000);
});
