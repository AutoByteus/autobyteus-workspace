import { randomBytes } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";

/** The stored identity file, `<data>/remote-access/server-instance.json`. */
type StoredNodeIdentityFile = {
  serverInstanceId?: string;
  createdAt?: string;
};

type AppConfigLike = {
  getAppDataDir(): string;
};

const isValidNodeId = (value: unknown): value is string =>
  typeof value === "string" && /^srv_[A-Za-z0-9_-]{32,}$/.test(value);

const createNodeId = (): string =>
  `srv_${randomBytes(24).toString("base64url")}`;

/** This node's ID (`srv_…`), created once and kept for the life of the data directory. */
export class NodeIdentityService {
  private cachedId: string | null = null;

  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "remote-access", "server-instance.json");
  }

  async getNodeId(): Promise<string> {
    if (this.cachedId) {
      return this.cachedId;
    }

    const filePath = this.getFilePath();
    const existing = await readJsonFile<StoredNodeIdentityFile>(filePath, {});
    if (isValidNodeId(existing.serverInstanceId)) {
      this.cachedId = existing.serverInstanceId;
      return this.cachedId;
    }

    const nextId = createNodeId();
    const next: StoredNodeIdentityFile = {
      serverInstanceId: nextId,
      createdAt: new Date().toISOString(),
    };
    await writeJsonFile(filePath, next);
    this.cachedId = nextId;
    return nextId;
  }
}

let singleton: NodeIdentityService | null = null;

export const getNodeIdentityService = (): NodeIdentityService => {
  singleton ??= new NodeIdentityService();
  return singleton;
};

export const resetNodeIdentityServiceForTests = (): void => {
  singleton = null;
};
