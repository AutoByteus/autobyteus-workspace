import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import { canonicalizeWorkspaceRootPath } from "./workspace-path-utils.js";

type WorkspaceRegistryRecord = Record<string, string>;

export interface WorkspaceRegistryEntry {
  workspaceId: string;
  workspaceRootPath: string;
}

export const FILESYSTEM_WORKSPACE_ID_PREFIX = "agent_ws_";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class WorkspaceRegistryStore {
  private loaded = false;
  private readonly entries = new Map<string, string>();

  private getRegistryFilePath(): string {
    return path.join(appConfigProvider.config.getAppDataDir(), "workspaces.json");
  }

  private async ensureRegistryLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    const filePath = this.getRegistryFilePath();
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as WorkspaceRegistryRecord;
      for (const [workspaceId, rootPath] of Object.entries(parsed)) {
        if (typeof workspaceId !== "string" || typeof rootPath !== "string") {
          continue;
        }
        try {
          this.entries.set(workspaceId, canonicalizeWorkspaceRootPath(rootPath));
        } catch {
          // Ignore malformed persisted entries.
        }
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (code !== "ENOENT") {
        logger.warn(`Failed reading workspace registry store: ${String(error)}`);
      }
    }
  }

  private async persistRegistry(): Promise<void> {
    const filePath = this.getRegistryFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const payload = JSON.stringify(Object.fromEntries(this.entries), null, 2);
    await fs.writeFile(filePath, `${payload}\n`, "utf-8");
  }

  async listEntries(): Promise<WorkspaceRegistryEntry[]> {
    await this.ensureRegistryLoaded();
    return Array.from(this.entries.entries())
      .map(([workspaceId, workspaceRootPath]) => ({ workspaceId, workspaceRootPath }))
      .sort((a, b) => a.workspaceRootPath.localeCompare(b.workspaceRootPath));
  }

  async upsertEntry(workspaceId: string, rootPath: string): Promise<WorkspaceRegistryEntry> {
    await this.ensureRegistryLoaded();
    const normalizedWorkspaceId = workspaceId.trim();
    if (!normalizedWorkspaceId) {
      throw new Error("workspaceId is required for workspace registry entries.");
    }
    const workspaceRootPath = canonicalizeWorkspaceRootPath(rootPath);
    if (this.entries.get(normalizedWorkspaceId) !== workspaceRootPath) {
      this.entries.set(normalizedWorkspaceId, workspaceRootPath);
      await this.persistRegistry();
    }
    return { workspaceId: normalizedWorkspaceId, workspaceRootPath };
  }

  async deleteEntry(workspaceId: string): Promise<WorkspaceRegistryEntry | null> {
    await this.ensureRegistryLoaded();
    const normalizedWorkspaceId = workspaceId.trim();
    const workspaceRootPath = this.entries.get(normalizedWorkspaceId) ?? null;
    if (!workspaceRootPath) {
      return null;
    }
    this.entries.delete(normalizedWorkspaceId);
    await this.persistRegistry();
    return { workspaceId: normalizedWorkspaceId, workspaceRootPath };
  }

  async getRootPathByWorkspaceId(workspaceId: string): Promise<string | null> {
    await this.ensureRegistryLoaded();
    return this.entries.get(workspaceId.trim()) ?? null;
  }

  async findEntryByRootPath(rootPath: string): Promise<WorkspaceRegistryEntry | null> {
    await this.ensureRegistryLoaded();
    const workspaceRootPath = canonicalizeWorkspaceRootPath(rootPath);
    for (const [workspaceId, candidateRootPath] of this.entries.entries()) {
      if (candidateRootPath === workspaceRootPath) {
        return { workspaceId, workspaceRootPath: candidateRootPath };
      }
    }
    return null;
  }
}

export const buildFilesystemWorkspaceId = (rootPath: string): string => {
  const digest = createHash("sha256").update(canonicalizeWorkspaceRootPath(rootPath)).digest("hex");
  return `${FILESYSTEM_WORKSPACE_ID_PREFIX}${digest}`;
};
