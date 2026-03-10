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

describe("Managed messaging gateway GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDir: string;
  let dataDir: string;
  let releaseDir: string;
  let manifestPath: string;
  let artifactServer: http.Server;
  let artifactBaseUrl: string;
  let healthyArchivePath: string;

  beforeAll(async () => {
    process.env.MANAGED_MESSAGING_GATEWAY_HEALTH_STARTUP_TIMEOUT_MS = "10000";

    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;

    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "managed-messaging-gateway-"));
    dataDir = path.join(tempDir, "data");
    releaseDir = path.join(tempDir, "release-assets");
    await fsp.mkdir(dataDir, { recursive: true });
    await fsp.mkdir(releaseDir, { recursive: true });

    const envPath = path.join(dataDir, ".env");
    await fsp.writeFile(
      envPath,
      "AUTOBYTEUS_SERVER_HOST=http://localhost:60634\n",
      "utf8",
    );

    appConfigProvider.config.setCustomAppDataDir(dataDir);
    appConfigProvider.config.initialize();

    healthyArchivePath = await createFakeGatewayArchive(releaseDir, {
      artifactVersion: "0.1.0",
      mode: "healthy",
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
    seedInternalServerBaseUrl({ host: "0.0.0.0", port: 8000 });
  });

  afterAll(async () => {
    delete process.env.MANAGED_MESSAGING_GATEWAY_HEALTH_STARTUP_TIMEOUT_MS;
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

  it("downloads, installs, starts, and reports managed gateway status", async () => {
    await execGraphql(
      `
        mutation SaveConfig($input: JSONObject!) {
          saveManagedMessagingGatewayProviderConfig(input: $input) {
            enabled
            lifecycleState
            providerConfig
          }
        }
      `,
      {
        input: {
          wecomWebhookToken: "wecom-secret",
          wecomAppAccounts: [
            { accountId: "wecom-acct", label: "WeCom Main", mode: "APP" },
          ],
          discordBotToken: "discord-token",
          discordAccountId: "discord-acct",
          telegramBotToken: "telegram-token",
          telegramAccountId: "telegram-acct",
          whatsappBusinessSecret: "wa-secret",
        },
      },
    );

    const enabled = await execGraphql<{
      enableManagedMessagingGateway: {
        enabled: boolean;
        lifecycleState: string;
        activeVersion: string | null;
        runtimeRunning: boolean;
      };
    }>(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          enabled
          lifecycleState
          activeVersion
          runtimeRunning
        }
      }
    `);

    expect(enabled.enableManagedMessagingGateway.enabled).toBe(true);
    expect(enabled.enableManagedMessagingGateway.lifecycleState).toBe("RUNNING");
    expect(enabled.enableManagedMessagingGateway.activeVersion).toBe("0.1.0");
    expect(enabled.enableManagedMessagingGateway.runtimeRunning).toBe(true);

    const status = await execGraphql<{
      managedMessagingGatewayStatus: {
        enabled: boolean;
        lifecycleState: string;
        activeVersion: string | null;
        bindPort: number | null;
        providerConfig: Record<string, unknown>;
        installedVersions: string[];
        supportedProviders: string[];
        excludedProviders: string[];
        diagnostics: Record<string, unknown>;
        runtimeReliabilityStatus: Record<string, unknown> | null;
        providerStatusByProvider: Record<string, Record<string, unknown>>;
      };
    }>(`
      query ManagedGatewayStatus {
        managedMessagingGatewayStatus {
          enabled
          lifecycleState
          activeVersion
          bindPort
          providerConfig
          installedVersions
          supportedProviders
          excludedProviders
          diagnostics
          runtimeReliabilityStatus
          providerStatusByProvider
        }
      }
    `);

    expect(status.managedMessagingGatewayStatus.enabled).toBe(true);
    expect(status.managedMessagingGatewayStatus.lifecycleState).toBe("RUNNING");
    expect(status.managedMessagingGatewayStatus.bindPort).toBeTypeOf("number");
    expect(status.managedMessagingGatewayStatus.providerConfig.whatsappBusinessEnabled).toBe(true);
    expect(status.managedMessagingGatewayStatus.providerConfig.wecomAppEnabled).toBe(true);
    expect(status.managedMessagingGatewayStatus.providerConfig.discordEnabled).toBe(true);
    expect(status.managedMessagingGatewayStatus.providerConfig.telegramEnabled).toBe(true);
    expect(status.managedMessagingGatewayStatus.providerConfig.telegramPollingEnabled).toBe(true);
    expect(status.managedMessagingGatewayStatus.providerConfig.telegramWebhookEnabled).toBe(false);
    expect(status.managedMessagingGatewayStatus.installedVersions).toContain("0.1.0");
    expect(status.managedMessagingGatewayStatus.supportedProviders).toEqual([
      "WHATSAPP",
      "WECOM",
      "DISCORD",
      "TELEGRAM",
    ]);
    expect(status.managedMessagingGatewayStatus.excludedProviders).toContain(
      "WECHAT",
    );
    expect(status.managedMessagingGatewayStatus.runtimeReliabilityStatus).toMatchObject({
      runtime: { state: "HEALTHY" },
    });
    expect(
      status.managedMessagingGatewayStatus.providerStatusByProvider.DISCORD
        ?.accountId,
    ).toBe("discord-acct");
    expect(
      status.managedMessagingGatewayStatus.providerStatusByProvider.TELEGRAM
        ?.effectivelyEnabled,
    ).toBe(true);

    const archiveName = path.basename(healthyArchivePath);
    const cachedArchivePath = path.join(
      dataDir,
      "download",
      "messaging-gateway",
      archiveName,
    );
    expect(fs.existsSync(cachedArchivePath)).toBe(true);

    const installEntrypoint = path.join(
      dataDir,
      "extensions",
      "messaging-gateway",
      "versions",
      "0.1.0",
      "dist",
      "index.js",
    );
    expect(fs.existsSync(installEntrypoint)).toBe(true);

    const runtimeEnv = await fsp.readFile(
      path.join(
        dataDir,
        "extensions",
        "messaging-gateway",
        "config",
        "gateway.env",
      ),
      "utf8",
    );
    expect(runtimeEnv).toContain("GATEWAY_TELEGRAM_POLLING_ENABLED=true");
    expect(runtimeEnv).toContain("GATEWAY_TELEGRAM_WEBHOOK_ENABLED=false");
    expect(runtimeEnv).toContain("GATEWAY_SERVER_BASE_URL=http://127.0.0.1:8000");
    expect(runtimeEnv).not.toContain("GATEWAY_SERVER_BASE_URL=http://localhost:60634");
    expect(appConfigProvider.config.getBaseUrl()).toBe("http://localhost:60634");
  }, 30_000);

  it("propagates managed gateway shared secrets into the runtime env", async () => {
    process.env.CHANNEL_GATEWAY_SHARED_SECRET = "gateway-shared-secret";
    process.env.CHANNEL_CALLBACK_SHARED_SECRET = "callback-shared-secret";

    try {
      await execGraphql(`
        mutation EnableManagedGateway {
          enableManagedMessagingGateway {
            lifecycleState
            runtimeRunning
          }
        }
      `);

      const envPath = path.join(
        dataDir,
        "extensions",
        "messaging-gateway",
        "config",
        "gateway.env",
      );
      const runtimeEnv = await fsp.readFile(envPath, "utf8");
      expect(runtimeEnv).toContain(
        "GATEWAY_SERVER_SHARED_SECRET=gateway-shared-secret",
      );
      expect(runtimeEnv).toContain(
        "GATEWAY_SERVER_CALLBACK_SHARED_SECRET=callback-shared-secret",
      );
      expect(runtimeEnv).toContain(
        "GATEWAY_ALLOW_INSECURE_SERVER_CALLBACKS=false",
      );
    } finally {
      delete process.env.CHANNEL_GATEWAY_SHARED_SECRET;
      delete process.env.CHANNEL_CALLBACK_SHARED_SECRET;
    }
  });

  it("writes the seeded runtime-only port when it differs from the public URL port", async () => {
    seedInternalServerBaseUrl({ host: "127.0.0.1", port: 29695 });

    await execGraphql(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          lifecycleState
        }
      }
    `);

    const runtimeEnv = await fsp.readFile(
      path.join(
        dataDir,
        "extensions",
        "messaging-gateway",
        "config",
        "gateway.env",
      ),
      "utf8",
    );

    expect(runtimeEnv).toContain("GATEWAY_SERVER_BASE_URL=http://127.0.0.1:29695");
    expect(runtimeEnv).not.toContain("GATEWAY_SERVER_BASE_URL=http://127.0.0.1:8000");
    expect(appConfigProvider.config.getBaseUrl()).toBe("http://localhost:60634");
  });

  it("fails explicitly when the runtime-only internal server base url is not seeded", async () => {
    delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];

    await expect(
      execGraphql(`
        mutation EnableManagedGateway {
          enableManagedMessagingGateway {
            lifecycleState
          }
        }
      `),
    ).rejects.toThrow(/AUTOBYTEUS_INTERNAL_SERVER_BASE_URL/);
  });

  it("proxies WeCom accounts and Discord peer candidates through the server-owned boundary", async () => {
    await execGraphql(
      `
        mutation SaveConfig($input: JSONObject!) {
          saveManagedMessagingGatewayProviderConfig(input: $input) {
            lifecycleState
          }
        }
      `,
      {
        input: {
          wecomWebhookToken: "wecom-secret",
          wecomAppAccounts: [
            { accountId: "wecom-acct", label: "WeCom Main", mode: "APP" },
          ],
          discordBotToken: "discord-token",
          discordAccountId: "discord-acct",
        },
      },
    );
    await execGraphql(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          lifecycleState
        }
      }
    `);

    const accounts = await execGraphql<{
      managedMessagingGatewayWeComAccounts: Array<{
        accountId: string;
        label: string;
        mode: string;
      }>;
    }>(`
      query ManagedWeComAccounts {
        managedMessagingGatewayWeComAccounts {
          accountId
          label
          mode
        }
      }
    `);

    expect(accounts.managedMessagingGatewayWeComAccounts).toEqual([
      {
        accountId: "wecom-acct",
        label: "WeCom Main",
        mode: "APP",
      },
    ]);

    const peerCandidates = await execGraphql<{
      managedMessagingGatewayPeerCandidates: {
        accountId: string | null;
        items: Array<{ peerId: string; displayName: string | null }>;
      };
    }>(`
      query DiscordPeerCandidates {
        managedMessagingGatewayPeerCandidates(provider: "DISCORD", includeGroups: true, limit: 10) {
          accountId
          items {
            peerId
            displayName
          }
        }
      }
    `);

    expect(peerCandidates.managedMessagingGatewayPeerCandidates.accountId).toBe(
      "discord-acct",
    );
    expect(peerCandidates.managedMessagingGatewayPeerCandidates.items).toEqual([
      {
        peerId: "discord-peer-1",
        displayName: "Discord Peer 1",
      },
    ]);
  });

  it("disables the managed gateway without leaving the runtime running", async () => {
    await execGraphql(`
      mutation EnableManagedGateway {
        enableManagedMessagingGateway {
          lifecycleState
        }
      }
    `);

    const disabled = await execGraphql<{
      disableManagedMessagingGateway: {
        enabled: boolean;
        lifecycleState: string;
        runtimeRunning: boolean;
      };
    }>(`
      mutation DisableManagedGateway {
        disableManagedMessagingGateway {
          enabled
          lifecycleState
          runtimeRunning
        }
      }
    `);

    expect(disabled.disableManagedMessagingGateway.enabled).toBe(false);
    expect(disabled.disableManagedMessagingGateway.lifecycleState).toBe("DISABLED");
    expect(disabled.disableManagedMessagingGateway.runtimeRunning).toBe(false);
  });
});
