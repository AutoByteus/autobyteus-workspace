import path from 'node:path';
import { appConfigProvider } from '../config/app-config-provider.js';
import { FileSystemWorkspace } from './filesystem-workspace.js';
import { SkillWorkspace } from './skill-workspace.js';
import { TempWorkspace } from './temp-workspace.js';
import type { WorkspaceInput } from './workspace-input.js';
import { WorkspaceIdMappingStore } from './workspace-id-mapping-store.js';

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class WorkspaceManager {
  private static instance: WorkspaceManager | null = null;
  private activeWorkspaces: Map<string, FileSystemWorkspace> = new Map();
  private readonly workspaceIdMappingStore: WorkspaceIdMappingStore;

  static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  private constructor() {
    this.workspaceIdMappingStore = new WorkspaceIdMappingStore();
  }

  async createWorkspace(config: WorkspaceInput): Promise<FileSystemWorkspace> {
    const rootPathValue = config.rootPath;
    logger.info(`Creating new workspace for rootPath: ${String(rootPathValue)}`);
    const workspace = new FileSystemWorkspace(config);

    const existingById = this.activeWorkspaces.get(workspace.workspaceId);
    if (existingById) {
      if (existingById.getBasePath() === workspace.getBasePath()) {
        logger.info(`Reusing existing workspace ID: ${existingById.workspaceId}`);
        return existingById;
      }
      const message = `Workspace ID collision: ${workspace.workspaceId}`;
      logger.error(message);
      throw new Error(message);
    }

    await workspace.initialize();
    this.activeWorkspaces.set(workspace.workspaceId, workspace);
    await this.workspaceIdMappingStore.saveWorkspaceIdMapping(
      workspace.workspaceId,
      workspace.getBasePath(),
    );
    logger.info(`Created and registered workspace ID: ${workspace.workspaceId}`);

    return workspace;
  }

  async ensureWorkspaceByRootPath(rootPath: string): Promise<FileSystemWorkspace> {
    const normalizedRootPath = path.normalize(path.resolve(rootPath.trim()));
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

    if (workspaceId.startsWith('skill_ws_')) {
      try {
        const skillName = workspaceId.replace('skill_ws_', '');
        logger.info(`Creating on-demand SkillWorkspace for: ${skillName}`);

        const skillWorkspace = await SkillWorkspace.create(skillName);
        await skillWorkspace.initialize();
        this.activeWorkspaces.set(workspaceId, skillWorkspace);
        return skillWorkspace;
      } catch (error) {
        logger.error(`Failed to create skill workspace ${workspaceId}: ${String(error)}`);
        throw new Error(`Failed to create skill workspace '${workspaceId}'`);
      }
    }

    const filesystemRootPath = await this.workspaceIdMappingStore.getRootPathByWorkspaceId(
      workspaceId,
    );
    if (filesystemRootPath) {
      return this.ensureWorkspaceByRootPath(filesystemRootPath);
    }

    throw new Error(`Workspace '${workspaceId}' not found`);
  }

  async getOrCreateTempWorkspace(): Promise<TempWorkspace> {
    if (this.activeWorkspaces.has(TempWorkspace.TEMP_WORKSPACE_ID)) {
      logger.debug('Returning cached temp workspace');
      return this.activeWorkspaces.get(TempWorkspace.TEMP_WORKSPACE_ID) as TempWorkspace;
    }

    const config = appConfigProvider.config;
    const tempDir = config.getTempWorkspaceDir();
    logger.info(`Creating temp workspace at: ${tempDir}`);

    const tempWorkspace = new TempWorkspace(String(tempDir));
    await tempWorkspace.initialize();

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
}

let cachedWorkspaceManager: WorkspaceManager | null = null;

export const getWorkspaceManager = (): WorkspaceManager => {
  if (!cachedWorkspaceManager) {
    cachedWorkspaceManager = WorkspaceManager.getInstance();
  }
  return cachedWorkspaceManager;
};
