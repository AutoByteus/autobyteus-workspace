import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { appConfigProvider } from "../../config/app-config-provider.js";

const IDENTITY_FILE_NAME = "node-identity.v1.json";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const normalized = baseUrl.trim();
  const parsed = new URL(normalized);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
};

export type NodeSelfIdentity = {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
};

type PersistedNodeIdentity = {
  nodeId: string;
  nodeName: string;
  createdAtIso: string;
};

export class NodeIdentityService {
  private cached: NodeSelfIdentity | null = null;

  resolveSelfIdentity(): NodeSelfIdentity {
    if (this.cached) {
      return this.cached;
    }

    const baseUrl = this.resolveBaseUrl();
    const envNodeName = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_NAME);
    const defaultNodeName = normalizeOptionalString(os.hostname()) ?? "AutoByteus Node";
    const nodeName = envNodeName ?? defaultNodeName;

    const envNodeId = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID);
    const persisted = this.readPersistedIdentity();
    const nodeId = envNodeId ?? persisted?.nodeId ?? `node-${randomUUID()}`;
    const persistedNodeName = envNodeName ?? persisted?.nodeName ?? nodeName;

    this.persistIdentity({
      nodeId,
      nodeName: persistedNodeName,
      createdAtIso: persisted?.createdAtIso ?? new Date().toISOString(),
    });

    process.env.AUTOBYTEUS_NODE_ID ??= nodeId;
    process.env.AUTOBYTEUS_NODE_NAME ??= persistedNodeName;

    this.cached = {
      nodeId,
      nodeName: persistedNodeName,
      baseUrl,
    };

    return this.cached;
  }

  private resolveBaseUrl(): string {
    const configuredBaseUrl = normalizeOptionalString(process.env.AUTOBYTEUS_SERVER_HOST);
    if (configuredBaseUrl) {
      return normalizeBaseUrl(configuredBaseUrl);
    }

    try {
      return normalizeBaseUrl(appConfigProvider.config.getBaseUrl());
    } catch {
      return "http://localhost:8000";
    }
  }

  private getIdentityFilePath(): string {
    const appDataDir = appConfigProvider.config.getAppDataDir();
    return path.join(appDataDir, IDENTITY_FILE_NAME);
  }

  private readPersistedIdentity(): PersistedNodeIdentity | null {
    const filePath = this.getIdentityFilePath();
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as PersistedNodeIdentity;
      const nodeId = normalizeOptionalString(parsed?.nodeId);
      const nodeName = normalizeOptionalString(parsed?.nodeName);
      if (!nodeId || !nodeName) {
        return null;
      }
      return {
        nodeId,
        nodeName,
        createdAtIso: normalizeOptionalString(parsed?.createdAtIso) ?? new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private persistIdentity(identity: PersistedNodeIdentity): void {
    const filePath = this.getIdentityFilePath();
    fs.writeFileSync(filePath, `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  }
}

let cachedNodeIdentityService: NodeIdentityService | null = null;

export const getNodeIdentityService = (): NodeIdentityService => {
  if (!cachedNodeIdentityService) {
    cachedNodeIdentityService = new NodeIdentityService();
  }
  return cachedNodeIdentityService;
};

export const resetNodeIdentityServiceForTests = (): void => {
  cachedNodeIdentityService = null;
};
