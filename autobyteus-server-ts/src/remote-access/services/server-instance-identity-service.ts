import { randomBytes } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";

type ServerInstanceIdentityFile = {
  serverInstanceId?: string;
  createdAt?: string;
};

type AppConfigLike = {
  getAppDataDir(): string;
};

const isValidServerInstanceId = (value: unknown): value is string =>
  typeof value === "string" && /^srv_[A-Za-z0-9_-]{32,}$/.test(value);

const createServerInstanceId = (): string =>
  `srv_${randomBytes(24).toString("base64url")}`;

export class ServerInstanceIdentityService {
  private cachedId: string | null = null;

  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "remote-access", "server-instance.json");
  }

  async getServerInstanceId(): Promise<string> {
    if (this.cachedId) {
      return this.cachedId;
    }

    const filePath = this.getFilePath();
    const existing = await readJsonFile<ServerInstanceIdentityFile>(filePath, {});
    if (isValidServerInstanceId(existing.serverInstanceId)) {
      this.cachedId = existing.serverInstanceId;
      return this.cachedId;
    }

    const nextId = createServerInstanceId();
    const next: ServerInstanceIdentityFile = {
      serverInstanceId: nextId,
      createdAt: new Date().toISOString(),
    };
    await writeJsonFile(filePath, next);
    this.cachedId = nextId;
    return nextId;
  }
}

let singleton: ServerInstanceIdentityService | null = null;

export const getServerInstanceIdentityService = (): ServerInstanceIdentityService => {
  singleton ??= new ServerInstanceIdentityService();
  return singleton;
};

export const resetServerInstanceIdentityServiceForTests = (): void => {
  singleton = null;
};
