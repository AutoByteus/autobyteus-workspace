import path from 'node:path';
import { appConfigProvider } from '../../config/app-config-provider.js';
import { readJsonFile, updateJsonFile } from '../../persistence/file/store-utils.js';
import { ProjectError } from '../domain/project-errors.js';
import type { Project } from '../domain/models.js';
import { type ProjectState } from '../domain/project-task-execution.js';
import { parseProjectState, serializeProjectState } from './project-state-schema.js';
/** Sole physical authority. Metadata operations preserve retained lifetime history. */
export class ProjectStore {
  constructor(private readonly config: { getAppDataDir(): string } = appConfigProvider.config) {}
  getFilePath(): string { return path.join(this.config.getAppDataDir(), 'projects', 'projects.json'); }
  async readState(): Promise<ProjectState> {
    try { return parseProjectState(await readJsonFile<unknown>(this.getFilePath(), [])); }
    catch (error) {
      if (error instanceof ProjectError) throw error;
      throw new ProjectError('PROJECT_STATE_UNAVAILABLE', `Cannot read current Project authority; preserve and inspect the Project data. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async listRecords(): Promise<Project[]> { return (await this.readState()).projects; }
  async updateState(updater: (state: ProjectState) => ProjectState | Promise<ProjectState>,
    onCommitted?: (state: ProjectState) => void): Promise<ProjectState> {
    let committed: ProjectState | undefined;
    try {
      let validated: ProjectState;
      await updateJsonFile<unknown>(this.getFilePath(), [], async raw => {
        const physical = serializeProjectState(await updater(parseProjectState(raw)));
        validated = parseProjectState(physical);
        return physical;
      }, () => {
        // Validated before replacement; no decoding or I/O at observed commit.
        committed = validated; onCommitted?.(validated);
      });
      return committed!;
    } catch (error) {
      if (!committed) {
        if (error instanceof SyntaxError) throw new ProjectError('PROJECT_STATE_UNAVAILABLE', `Invalid Project JSON; preserve and inspect the Project data. ${error.message}`);
        throw error;
      }
      console.warn('Project state committed; lock finalization failed.', error);
      return committed;
    }
  }
  async updateRecords(updater: (records: Project[]) => Project[] | Promise<Project[]>): Promise<Project[]> {
    return (await this.updateState(async state => ({ ...state, projects: await updater(state.projects) }))).projects;
  }
}
let singleton: ProjectStore | null = null;
export const getProjectStore = (): ProjectStore => singleton ??= new ProjectStore();
export const resetProjectStoreForTests = (): void => { singleton = null; };
