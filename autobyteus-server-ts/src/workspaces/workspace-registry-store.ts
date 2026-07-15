import { createHash } from "node:crypto";
import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import {
  loadWorkspaceRegistryFile,
  persistWorkspaceRegistryFileAtomically,
  validateRegistryMutation,
  type RegistryMutationValidation,
} from "./workspace-registry-file-persistence.js";
import { canonicalizeWorkspaceRootPath } from "./workspace-path-utils.js";

export interface WorkspaceRegistryEntry {
  workspaceId: string;
  workspaceRootPath: string;
}

export const FILESYSTEM_WORKSPACE_ID_PREFIX = "agent_ws_";

export class WorkspaceRegistryStore {
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private mutationQueue: Promise<unknown> = Promise.resolve();
  private entries = new Map<string, string>();

  private getRegistryFilePath(): string {
    return path.join(appConfigProvider.config.getAppDataDir(), "workspaces.json");
  }

  private async ensureRegistryLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (!this.loadPromise) {
      this.loadPromise = this.loadRegistryFromDisk().then((entries) => {
        this.entries = entries;
        this.loaded = true;
      });
    }

    try {
      await this.loadPromise;
    } catch (error) {
      this.loadPromise = null;
      throw error;
    }
  }

  private async loadRegistryFromDisk(): Promise<Map<string, string>> {
    return loadWorkspaceRegistryFile(this.getRegistryFilePath());
  }

  private async withSerializedMutation<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.mutationQueue.then(operation, operation);
    this.mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async persistRegistryAtomically(
    nextEntries: Map<string, string>,
    validation: RegistryMutationValidation,
  ): Promise<void> {
    await persistWorkspaceRegistryFileAtomically(
      this.getRegistryFilePath(),
      nextEntries,
      validation,
    );
  }

  private commitEntries(nextEntries: Map<string, string>): void {
    this.entries = nextEntries;
  }

  async listEntries(): Promise<WorkspaceRegistryEntry[]> {
    await this.ensureRegistryLoaded();
    return Array.from(this.entries.entries())
      .map(([workspaceId, workspaceRootPath]) => ({ workspaceId, workspaceRootPath }))
      .sort((a, b) => a.workspaceRootPath.localeCompare(b.workspaceRootPath));
  }

  async upsertEntry(workspaceId: string, rootPath: string): Promise<WorkspaceRegistryEntry> {
    return this.withSerializedMutation(async () => {
      await this.ensureRegistryLoaded();
      const normalizedWorkspaceId = workspaceId.trim();
      if (!normalizedWorkspaceId) {
        throw new Error("workspaceId is required for workspace registry entries.");
      }
      const workspaceRootPath = canonicalizeWorkspaceRootPath(rootPath);
      if (this.entries.get(normalizedWorkspaceId) === workspaceRootPath) {
        return { workspaceId: normalizedWorkspaceId, workspaceRootPath };
      }

      const nextEntries = new Map(this.entries);
      nextEntries.set(normalizedWorkspaceId, workspaceRootPath);
      const validation: RegistryMutationValidation = {
        kind: "upsert",
        workspaceId: normalizedWorkspaceId,
      };
      validateRegistryMutation(this.entries, nextEntries, validation, "in-memory state");
      await this.persistRegistryAtomically(nextEntries, validation);
      this.commitEntries(nextEntries);
      return { workspaceId: normalizedWorkspaceId, workspaceRootPath };
    });
  }

  async deleteEntry(workspaceId: string): Promise<WorkspaceRegistryEntry | null> {
    return this.withSerializedMutation(async () => {
      await this.ensureRegistryLoaded();
      const normalizedWorkspaceId = workspaceId.trim();
      const workspaceRootPath = this.entries.get(normalizedWorkspaceId) ?? null;
      if (!workspaceRootPath) {
        return null;
      }

      const nextEntries = new Map(this.entries);
      nextEntries.delete(normalizedWorkspaceId);
      const validation: RegistryMutationValidation = {
        kind: "delete",
        workspaceId: normalizedWorkspaceId,
      };
      validateRegistryMutation(this.entries, nextEntries, validation, "in-memory state");
      await this.persistRegistryAtomically(nextEntries, validation);
      this.commitEntries(nextEntries);
      return { workspaceId: normalizedWorkspaceId, workspaceRootPath };
    });
  }

  async deleteEntriesByRootPath(
    rootPath: string,
    reason: string,
  ): Promise<WorkspaceRegistryEntry[]> {
    return this.withSerializedMutation(async () => {
      await this.ensureRegistryLoaded();
      const workspaceRootPath = canonicalizeWorkspaceRootPath(rootPath);
      const removedEntries: WorkspaceRegistryEntry[] = [];
      const nextEntries = new Map(this.entries);
      for (const [workspaceId, candidateRootPath] of this.entries.entries()) {
        if (candidateRootPath !== workspaceRootPath) {
          continue;
        }
        nextEntries.delete(workspaceId);
        removedEntries.push({ workspaceId, workspaceRootPath: candidateRootPath });
      }

      if (!removedEntries.length) {
        return [];
      }

      const validation: RegistryMutationValidation = {
        kind: "deleteByRootPath",
        workspaceRootPath,
        reason,
      };
      validateRegistryMutation(this.entries, nextEntries, validation, "in-memory state");
      await this.persistRegistryAtomically(nextEntries, validation);
      this.commitEntries(nextEntries);
      return removedEntries;
    });
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
