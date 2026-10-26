import { randomBytes } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";

/** The stored identity file, `<data>/remote-access/node-identity.json`. */
type NodeIdentityFile = {
  nodeId?: string;
  createdAt?: string;
};

type AppConfigLike = {
  getAppDataDir(): string;
};

export const NODE_IDENTITY_FILE_NAME = "node-identity.json";
export const NODE_IDENTITY_NOT_MIGRATED = "NODE_IDENTITY_NOT_MIGRATED";
export const NODE_IDENTITY_NOT_MIGRATED_TEXT = "This node's identity is waiting for its data migration.";

/**
 * This node's identity is held back: its stored identity file may still be in its released shape (autobyteus-290
 * SM-1, capability `node_identity`). Every reader of the node ID meets this one error and states it; nothing creates
 * a new identity meanwhile (REQ-913).
 */
export class NodeIdentityNotMigratedError extends Error {
  readonly code = NODE_IDENTITY_NOT_MIGRATED;

  constructor() {
    super(NODE_IDENTITY_NOT_MIGRATED_TEXT);
    this.name = "NodeIdentityNotMigratedError";
  }
}

/**
 * The `node_identity` capability. Pending until the startup owner (`startup/app-data-capability-readiness.ts`) applies
 * the migration runner's answer.
 */
let nodeIdentityReady = false;

export const configureNodeIdentityCapability = (ready: boolean): void => {
  nodeIdentityReady = ready;
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
    return path.join(this.config.getAppDataDir(), "remote-access", NODE_IDENTITY_FILE_NAME);
  }

  /** Throws `NodeIdentityNotMigratedError` while the identity is held back; it never creates or writes one then. */
  async getNodeId(): Promise<string> {
    if (!nodeIdentityReady) {
      throw new NodeIdentityNotMigratedError();
    }
    if (this.cachedId) {
      return this.cachedId;
    }

    const filePath = this.getFilePath();
    const existing = await readJsonFile<NodeIdentityFile>(filePath, {});
    if (isValidNodeId(existing.nodeId)) {
      this.cachedId = existing.nodeId;
      return this.cachedId;
    }

    const nextId = createNodeId();
    const next: NodeIdentityFile = {
      nodeId: nextId,
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
