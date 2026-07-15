import { appConfigProvider } from "../config/app-config-provider.js";
import { FileSystemWorkspace } from "./filesystem-workspace.js";
import { SkillWorkspace } from "./skill-workspace.js";
import { TempWorkspace } from "./temp-workspace.js";
import type { WorkspaceInput } from "./workspace-input.js";
import {
  FILESYSTEM_WORKSPACE_ID_PREFIX,
  WorkspaceRegistryStore,
  type WorkspaceRegistryEntry,
} from "./workspace-registry-store.js";
import { WorkspaceRemovalGuard } from "./workspace-removal-guard.js";
import { canonicalizeWorkspaceRootPath } from "./workspace-path-utils.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export interface RemoveWorkspaceResult {
  success: boolean;
  message: string;
  workspaceId: string;
  workspaceRootPath: string | null;
}

export class WorkspaceManager {
  private static instance: WorkspaceManager | null = null;
  private activeWorkspaces: Map<string, FileSystemWorkspace> = new Map();
  private readonly workspaceRegistryStore: WorkspaceRegistryStore;
  private readonly workspaceRemovalGuard: WorkspaceRemovalGuard;

  static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  private constructor() {
    this.workspaceRegistryStore = new WorkspaceRegistryStore();
    this.workspaceRemovalGuard = new WorkspaceRemovalGuard(
      undefined,
      undefined,
      (workspaceId) => this.activeWorkspaces.get(workspaceId)?.getBasePath() ?? null,
    );
  }

  async createWorkspace(config: WorkspaceInput): Promise<FileSystemWorkspace> {
    const rootPathValue = config.rootPath;
    logger.info(`Creating new workspace for rootPath: ${String(rootPathValue)}`);
    const normalizedRootPath = canonicalizeWorkspaceRootPath(rootPathValue);
    if (this.isConfiguredTempWorkspaceRoot(normalizedRootPath)) {
      logger.info("Resolved configured temp workspace root to TempWorkspace.");
      await this.cleanupConfiguredTempRootRegistryEntries(normalizedRootPath);
      return this.getOrCreateTempWorkspace();
    }

    const workspace = new FileSystemWorkspace({
      ...config,
      rootPath: normalizedRootPath,
    });

    const existingById = this.activeWorkspaces.get(workspace.workspaceId);
    if (existingById) {
      if (existingById.getBasePath() !== workspace.getBasePath()) {
        const message = `Workspace ID collision: ${workspace.workspaceId}`;
        logger.error(message);
        throw new Error(message);
      }
      await this.workspaceRegistryStore.upsertEntry(
        existingById.workspaceId,
        existingById.getBasePath(),
      );
      logger.info(`Reusing registered workspace ID: ${existingById.workspaceId}`);
      return existingById;
    }

    this.activeWorkspaces.set(workspace.workspaceId, workspace);
    await this.workspaceRegistryStore.upsertEntry(
      workspace.workspaceId,
      workspace.getBasePath(),
    );
    logger.info(`Created and registered workspace ID: ${workspace.workspaceId}`);

    return workspace;
  }

  async ensureWorkspaceByRootPath(rootPath: string): Promise<FileSystemWorkspace> {
    const normalizedRootPath = canonicalizeWorkspaceRootPath(rootPath);
    if (this.isConfiguredTempWorkspaceRoot(normalizedRootPath)) {
      logger.info("Resolved configured temp workspace root to TempWorkspace.");
      await this.cleanupConfiguredTempRootRegistryEntries(normalizedRootPath);
      return this.getOrCreateTempWorkspace();
    }
    const config = { rootPath: normalizedRootPath };
    return this.createWorkspace(config);
  }

  async getOrCreateWorkspace(workspaceId: string): Promise<FileSystemWorkspace> {
    const existing = this.activeWorkspaces.get(workspaceId);
    if (existing) {
      return existing;
    }

    if (workspaceId === TempWorkspace.TEMP_WORKSPACE_ID) {
      return this.getOrCreateTempWorkspace();
    }

    if (workspaceId.startsWith("skill_ws_")) {
      try {
        const skillName = workspaceId.replace("skill_ws_", "");
        logger.info(`Creating on-demand SkillWorkspace for: ${skillName}`);

        const skillWorkspace = await SkillWorkspace.create(skillName);
        this.activeWorkspaces.set(workspaceId, skillWorkspace);
        return skillWorkspace;
      } catch (error) {
        logger.error(`Failed to create skill workspace ${workspaceId}: ${String(error)}`);
        throw new Error(`Failed to create skill workspace '${workspaceId}'`);
      }
    }

    const filesystemRootPath = await this.workspaceRegistryStore.getRootPathByWorkspaceId(
      workspaceId,
    );
    if (filesystemRootPath) {
      return this.ensureWorkspaceByRootPath(filesystemRootPath);
    }

    throw new Error(`Workspace '${workspaceId}' not found`);
  }

  async listRegisteredFilesystemWorkspaces(): Promise<FileSystemWorkspace[]> {
    await this.cleanupConfiguredTempRootRegistryEntries();
    const entries = await this.workspaceRegistryStore.listEntries();
    return entries.map((entry) => this.workspaceFromRegistryEntry(entry));
  }

  async listVisibleWorkspaces(): Promise<FileSystemWorkspace[]> {
    const registeredWorkspaces = await this.listRegisteredFilesystemWorkspaces();
    const registeredIds = new Set(registeredWorkspaces.map((workspace) => workspace.workspaceId));
    const transientActiveWorkspaces = Array.from(this.activeWorkspaces.values()).filter(
      (workspace) => !registeredIds.has(workspace.workspaceId),
    );
    return [...registeredWorkspaces, ...transientActiveWorkspaces];
  }

  async getRegisteredWorkspaceRootPath(workspaceId: string): Promise<string | null> {
    if (!workspaceId.trim().startsWith(FILESYSTEM_WORKSPACE_ID_PREFIX)) {
      return null;
    }
    return this.workspaceRegistryStore.getRootPathByWorkspaceId(workspaceId);
  }

  async getWorkspaceRootPathForHistory(workspaceId: string): Promise<string | null> {
    const normalizedWorkspaceId = workspaceId.trim();
    if (!normalizedWorkspaceId) {
      return null;
    }

    const registeredRootPath = await this.getRegisteredWorkspaceRootPath(normalizedWorkspaceId);
    if (registeredRootPath) {
      return registeredRootPath;
    }

    if (normalizedWorkspaceId === TempWorkspace.TEMP_WORKSPACE_ID) {
      const tempWorkspace = await this.getOrCreateTempWorkspace();
      return tempWorkspace.getBasePath();
    }

    return null;
  }

  async removeRegisteredWorkspace(workspaceId: string): Promise<RemoveWorkspaceResult> {
    const normalizedWorkspaceId = workspaceId.trim();
    if (!normalizedWorkspaceId.startsWith(FILESYSTEM_WORKSPACE_ID_PREFIX)) {
      return {
        success: false,
        message: "Only registered filesystem workspaces can be removed.",
        workspaceId: normalizedWorkspaceId,
        workspaceRootPath: null,
      };
    }

    const workspaceRootPath = await this.workspaceRegistryStore.getRootPathByWorkspaceId(
      normalizedWorkspaceId,
    );
    if (!workspaceRootPath) {
      return {
        success: false,
        message: "Workspace is not registered.",
        workspaceId: normalizedWorkspaceId,
        workspaceRootPath: null,
      };
    }

    const guardResult = await this.workspaceRemovalGuard.checkWorkspaceCanBeRemoved({
      workspaceId: normalizedWorkspaceId,
      workspaceRootPath,
    });
    if (guardResult.blocked) {
      return {
        success: false,
        message: guardResult.message ?? "Stop active runs before removing this workspace.",
        workspaceId: normalizedWorkspaceId,
        workspaceRootPath,
      };
    }

    for (const [activeWorkspaceId, activeWorkspace] of Array.from(this.activeWorkspaces.entries())) {
      if (!this.workspaceMatchesRoot(activeWorkspace, workspaceRootPath)) {
        continue;
      }
      await activeWorkspace.close();
      this.activeWorkspaces.delete(activeWorkspaceId);
    }
    await this.workspaceRegistryStore.deleteEntry(normalizedWorkspaceId);

    return {
      success: true,
      message: "Workspace removed from Workspaces. Files, memories, and run history were not deleted.",
      workspaceId: normalizedWorkspaceId,
      workspaceRootPath,
    };
  }

  async getOrCreateTempWorkspace(): Promise<TempWorkspace> {
    const configuredTempRootPath = this.getConfiguredTempWorkspaceRootPath();
    const cachedTempWorkspace = this.activeWorkspaces.get(TempWorkspace.TEMP_WORKSPACE_ID);
    if (
      cachedTempWorkspace instanceof TempWorkspace
      && this.workspaceMatchesRoot(cachedTempWorkspace, configuredTempRootPath)
    ) {
      logger.debug("Returning cached temp workspace");
      await this.cleanupConfiguredTempRootRegistryEntries(configuredTempRootPath);
      return cachedTempWorkspace;
    }

    if (cachedTempWorkspace) {
      logger.warn(
        `Replacing cached temp workspace because configured temp root changed to ${configuredTempRootPath}.`,
      );
      await cachedTempWorkspace.close();
      this.activeWorkspaces.delete(TempWorkspace.TEMP_WORKSPACE_ID);
    }

    await this.cleanupConfiguredTempRootRegistryEntries(configuredTempRootPath);
    logger.info(`Creating temp workspace at: ${configuredTempRootPath}`);

    const tempWorkspace = new TempWorkspace(configuredTempRootPath);
    this.activeWorkspaces.set(TempWorkspace.TEMP_WORKSPACE_ID, tempWorkspace);
    logger.info(`Temp workspace created and cached with ID: ${TempWorkspace.TEMP_WORKSPACE_ID}`);

    return tempWorkspace;
  }

  getWorkspaceById(workspaceId: string): FileSystemWorkspace | undefined {
    return this.activeWorkspaces.get(workspaceId);
  }

  getAllWorkspaces(): FileSystemWorkspace[] {
    return Array.from(this.activeWorkspaces.values());
  }

  private workspaceFromRegistryEntry(entry: WorkspaceRegistryEntry): FileSystemWorkspace {
    const existing = this.activeWorkspaces.get(entry.workspaceId);
    if (existing?.getBasePath() === entry.workspaceRootPath) {
      return existing;
    }
    return new FileSystemWorkspace({
      workspaceId: entry.workspaceId,
      rootPath: entry.workspaceRootPath,
    });
  }

  private workspaceMatchesRoot(
    workspace: FileSystemWorkspace,
    workspaceRootPath: string,
  ): boolean {
    try {
      return canonicalizeWorkspaceRootPath(workspace.getBasePath()) === workspaceRootPath;
    } catch {
      return false;
    }
  }

  private getConfiguredTempWorkspaceRootPath(): string {
    return canonicalizeWorkspaceRootPath(appConfigProvider.config.getTempWorkspaceDir());
  }

  private isConfiguredTempWorkspaceRoot(workspaceRootPath: string): boolean {
    return workspaceRootPath === this.getConfiguredTempWorkspaceRootPath();
  }

  private async cleanupConfiguredTempRootRegistryEntries(
    configuredTempRootPath = this.getConfiguredTempWorkspaceRootPath(),
  ): Promise<void> {
    const removedEntries = await this.workspaceRegistryStore.deleteEntriesByRootPath(
      configuredTempRootPath,
      "configured temp workspace root cleanup",
    );
    if (!removedEntries.length) {
      return;
    }

    logger.info(
      `Removed ${removedEntries.length} persisted filesystem registry entr${
        removedEntries.length === 1 ? "y" : "ies"
      } for the configured temp workspace root.`,
    );

    for (const entry of removedEntries) {
      const activeWorkspace = this.activeWorkspaces.get(entry.workspaceId);
      if (!activeWorkspace || !this.workspaceMatchesRoot(activeWorkspace, configuredTempRootPath)) {
        continue;
      }
      await activeWorkspace.close();
      this.activeWorkspaces.delete(entry.workspaceId);
    }
  }
}

let cachedWorkspaceManager: WorkspaceManager | null = null;

export const getWorkspaceManager = (): WorkspaceManager => {
  if (!cachedWorkspaceManager) {
    cachedWorkspaceManager = WorkspaceManager.getInstance();
  }
  return cachedWorkspaceManager;
};
