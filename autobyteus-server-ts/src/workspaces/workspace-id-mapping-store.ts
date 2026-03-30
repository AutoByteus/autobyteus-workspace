import { createHash } from "node:crypto";
import fs from 'node:fs/promises';
import path from 'node:path';
import { appConfigProvider } from '../config/app-config-provider.js';
import { canonicalizeWorkspaceRootPath } from './workspace-path-utils.js';

type WorkspaceIdMappingRecord = Record<string, string>;

export const FILESYSTEM_WORKSPACE_ID_PREFIX = "agent_ws_";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class WorkspaceIdMappingStore {
  private loaded = false;
  private readonly entries = new Map<string, string>();

  private getMappingFilePath(): string {
    return path.join(appConfigProvider.config.getAppDataDir(), 'workspaces.json');
  }

  private async ensureMappingsLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    const filePath = this.getMappingFilePath();
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as WorkspaceIdMappingRecord;
      for (const [workspaceId, rootPath] of Object.entries(parsed)) {
        if (typeof workspaceId !== 'string' || typeof rootPath !== 'string') {
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
      if (code !== 'ENOENT') {
        logger.warn(`Failed reading workspace ID mapping store: ${String(error)}`);
      }
    }
  }

  private async persistMappings(): Promise<void> {
    const filePath = this.getMappingFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const payload = JSON.stringify(Object.fromEntries(this.entries), null, 2);
    await fs.writeFile(filePath, `${payload}\n`, 'utf-8');
  }

  async saveWorkspaceIdMapping(workspaceId: string, rootPath: string): Promise<void> {
    await this.ensureMappingsLoaded();
    const canonicalRootPath = canonicalizeWorkspaceRootPath(rootPath);
    if (this.entries.get(workspaceId) === canonicalRootPath) {
      return;
    }
    this.entries.set(workspaceId, canonicalRootPath);
    await this.persistMappings();
  }

  async getRootPathByWorkspaceId(workspaceId: string): Promise<string | null> {
    await this.ensureMappingsLoaded();
    return this.entries.get(workspaceId) ?? null;
  }
}

export const buildFilesystemWorkspaceId = (rootPath: string): string => {
  const digest = createHash("sha256").update(rootPath).digest("hex");
  return `${FILESYSTEM_WORKSPACE_ID_PREFIX}${digest}`;
};
