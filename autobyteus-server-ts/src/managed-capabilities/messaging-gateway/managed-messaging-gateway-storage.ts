import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MessagingGatewayInstallerService } from "./messaging-gateway-installer-service.js";
import {
  createDefaultManagedMessagingPersistedState,
  createDefaultManagedMessagingProviderConfig,
  normalizeManagedMessagingPersistedState,
  normalizeManagedMessagingProviderConfig,
  type ManagedMessagingPersistedState,
  type ManagedMessagingProviderConfig,
} from "./types.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPackageJsonPath = path.resolve(
  serviceDir,
  "..",
  "..",
  "..",
  "package.json",
);

export class ManagedMessagingGatewayStorage {
  constructor(
    private readonly deps: {
      installerService: MessagingGatewayInstallerService;
      packageJsonPath?: string;
    },
  ) {}

  async ensureRoots(): Promise<void> {
    await Promise.all([
      fs.mkdir(path.dirname(this.getStatePath()), { recursive: true }),
      fs.mkdir(path.dirname(this.getProviderConfigPath()), { recursive: true }),
      fs.mkdir(path.dirname(this.getRuntimeEnvPath()), { recursive: true }),
    ]);
  }

  async readProviderConfig(): Promise<ManagedMessagingProviderConfig> {
    try {
      const raw = await fs.readFile(this.getProviderConfigPath(), "utf8");
      return normalizeManagedMessagingProviderConfig(JSON.parse(raw));
    } catch {
      return createDefaultManagedMessagingProviderConfig();
    }
  }

  async writeProviderConfig(
    config: ManagedMessagingProviderConfig,
  ): Promise<void> {
    await fs.writeFile(
      this.getProviderConfigPath(),
      `${JSON.stringify(config, null, 2)}\n`,
      "utf8",
    );
  }

  async readState(): Promise<ManagedMessagingPersistedState> {
    try {
      const raw = await fs.readFile(this.getStatePath(), "utf8");
      return normalizeManagedMessagingPersistedState(JSON.parse(raw));
    } catch {
      return createDefaultManagedMessagingPersistedState();
    }
  }

  async writeState(
    patch: Partial<ManagedMessagingPersistedState>,
  ): Promise<void> {
    const next = {
      ...(await this.readState()),
      ...patch,
      lastUpdatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.getStatePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  async writeRuntimeEnv(env: NodeJS.ProcessEnv): Promise<void> {
    await fs.writeFile(this.getRuntimeEnvPath(), serializeEnv(env), "utf8");
  }

  getStatePath(): string {
    return path.join(
      this.deps.installerService.getManagedRoot(),
      "state",
      "managed-gateway-state.json",
    );
  }

  getProviderConfigPath(): string {
    return path.join(
      this.deps.installerService.getConfigRoot(),
      "provider-config.json",
    );
  }

  getRuntimeEnvPath(): string {
    return path.join(this.deps.installerService.getConfigRoot(), "gateway.env");
  }

  async readServerVersion(): Promise<string> {
    const raw = await fs.readFile(this.getPackageJsonPath(), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    if (!parsed.version) {
      throw new Error("autobyteus-server-ts package version is missing.");
    }
    return parsed.version;
  }

  private getPackageJsonPath(): string {
    return this.deps.packageJsonPath ?? defaultPackageJsonPath;
  }
}

const serializeEnv = (env: NodeJS.ProcessEnv): string =>
  `${Object.entries(env)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("\n")}\n`;
