import { ProjectError } from "../domain/project-errors.js";
import { projectRunRootKey, type ProjectRunRoot } from "../domain/project-runs.js";
import { ProjectRunStore } from "../stores/project-run-store.js";

type ProjectLookup = Readonly<{ getProject(projectId: string): Promise<Readonly<{ projectId: string; name: string }> | null> }>;

/**
 * The one owner of the runs started under each Project (projects-left-navigation, SR-009): `project_runs.json` per
 * Project and its in-memory view, loaded once at composition before any run is admitted or restored. It is the only
 * writer of the file. A run is recorded once, before its own records; an entry whose run was never created (a failed
 * creation) or was deleted is harmless: readers join entries with the runs that exist.
 */
export class ProjectRunService {
  private readonly runsByProject = new Map<string, ProjectRunRoot[]>();
  private readonly projectOfRun = new Map<string, string>();
  private readonly chains = new Map<string, Promise<unknown>>();
  private loading: Promise<void> | null = null;

  constructor(
    private readonly store: ProjectRunStore,
    private readonly projects: ProjectLookup,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Reads every Project's file once; an unreadable file lists no started runs for that Project and is logged once. */
  load(): Promise<void> {
    this.loading ??= (async () => {
      for (const projectId of await this.store.list()) {
        try {
          for (const entry of (await this.store.read(projectId)).runs) this.index(projectId, entry.root);
        } catch (error) {
          console.warn("PROJECT_RUNS_UNAVAILABLE", { projectId, message: error instanceof Error ? error.message : String(error) });
        }
      }
    })();
    return this.loading;
  }

  /**
   * Records that the run is started under the Project, before the run's own records are written (DS-001, DS-002).
   * Refuses an unknown Project with `PROJECT_NOT_FOUND`; a run already recorded under another Project is refused too.
   */
  async recordStart(projectId: string, root: ProjectRunRoot): Promise<void> {
    await this.load();
    if (!(await this.projects.getProject(projectId))) {
      throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
    }
    const recorded = this.projectOfRun.get(projectRunRootKey(root));
    if (recorded === projectId) return;
    if (recorded) throw new Error(`Run '${root.runId}' is already started under Project '${recorded}'.`);
    await this.serialize(projectId, async () => {
      await this.store.append(projectId, root, this.now().toISOString());
      this.index(projectId, root);
    });
  }

  /** The runs started under the Project, oldest first; `PROJECT_NOT_FOUND` when the Project does not exist. */
  async startedRunsOf(projectId: string): Promise<readonly ProjectRunRoot[]> {
    await this.load();
    if (!(await this.projects.getProject(projectId))) {
      throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
    }
    return [...this.runsByProject.get(projectId) ?? []];
  }

  /** The Project a run was started under, with its current name; null when none or the Project was deleted. */
  async contextOfRun(root: ProjectRunRoot): Promise<Readonly<{ projectId: string; name: string }> | null> {
    await this.load();
    const projectId = this.projectOfRun.get(projectRunRootKey(root));
    if (!projectId) return null;
    const project = await this.projects.getProject(projectId);
    return project ? { projectId: project.projectId, name: project.name } : null;
  }

  private index(projectId: string, root: ProjectRunRoot): void {
    const key = projectRunRootKey(root);
    if (this.projectOfRun.has(key)) return;
    this.projectOfRun.set(key, projectId);
    this.runsByProject.set(projectId, [...this.runsByProject.get(projectId) ?? [], root]);
  }

  /** In-process ordering of the appends to one Project's file. */
  private serialize<T>(projectId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(projectId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.chains.set(projectId, next.then(() => undefined, () => undefined));
    return next;
  }
}
