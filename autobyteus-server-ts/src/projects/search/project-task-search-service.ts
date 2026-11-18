import type {
  CollectionIndexStatus, EmbeddingIndex, EmbeddingReadiness, EmbeddingSearchResult, ItemFingerprints,
} from "../../embeddings/embedding-index.js";
import type { ProjectTaskView, TaskLocation } from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import { isTerminalTaskStatus } from "../domain/task-status.js";

export type ProjectTaskMatchKind = "exact" | "meaning";
export type ProjectTaskSearchMatch = { task: ProjectTaskView; match: ProjectTaskMatchKind };
export type ProjectTaskSearchResult = { matches: ProjectTaskSearchMatch[]; meaningSearch: EmbeddingReadiness };
export type ProjectTaskSearchOptions = {
  /** Most matches returned (default: every exact match plus the meaning matches). */
  limit?: number;
  /** Wait up to this long for meaning search to be ready (agents); 0 answers at once (the board). */
  waitForReadyMs?: number;
};

/** One Project's index for the active model (Settings → Embedding), read-only. */
export type ProjectTaskIndexStatus = { projectId: string; name: string } & CollectionIndexStatus;

/** The cleanup port the Task and Project services call after a committed delete. Never throws, never waits. */
export type ProjectTaskSearchCleanup = {
  forgetTask(projectId: string, taskId: string): void;
  forgetProject(projectId: string): void;
};

/** The post-commit Task marks search follows (a share of the Task service's `ProjectChangeMarks`). Never throw. */
export type ProjectTaskSearchMarks = {
  taskChanged(location: TaskLocation): void;
  taskRemoved(location: TaskLocation): void;
};

type Dependencies = {
  /** Every Project (the Project service's authority). */
  listProjects: () => Promise<Array<{ projectId: string; name: string }>>;
  /** The Project's current Tasks (the Task service's authority); fails with PROJECT_NOT_FOUND for an unknown Project. */
  listTasks: (projectId: string) => Promise<ProjectTaskView[]>;
  /** The embedding index, resolved at use (nothing of the embedding layer is touched at startup). */
  index: () => Pick<EmbeddingIndex, "search" | "sync" | "collectionStatus" | "removeItems" | "dropCollection"
    | "fingerprintItems" | "fingerprintsAreCurrent" | "activeModelOnDisk">;
  /** Wait after a Task write before its Project is indexed (writes inside the wait join that run). Default 3 s. */
  indexAfterWriteMs?: number;
};

/** Up to this many meaning matches, as the relevance rule allows (REQ-003). */
const MEANING_LIMIT = 20;
const INDEX_AFTER_WRITE_MS = 3_000;
const collectionOf = (projectId: string): string => `project-tasks/${projectId}`;
const reasonOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
/** Open Tasks first, then most recently updated: the order the index embeds them in. */
const indexingOrder = (a: ProjectTaskView, b: ProjectTaskView): number =>
  Number(isTerminalTaskStatus(a.status)) - Number(isTerminalTaskStatus(b.status)) || b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId);
/** A Project's collection items: each Task's description, in indexing order. */
const itemsOf = (tasks: readonly ProjectTaskView[]) => [...tasks].sort(indexingOrder).map((task) => ({ id: task.taskId, text: task.description }));

/**
 * Project Task search policy: the collection of each Project (its Tasks' descriptions), the exact tier
 * (case-insensitive containment in the description or a comment), the meaning tier from the embedding index, their merge and
 * order, the bounded readiness wait for agents, and index cleanup after deletes. Every Task is read fresh from the
 * Task service, so deleted Tasks never appear and statuses are current.
 *
 * Settings' index status caches **inputs, never results**: per Project, the fingerprints of its Tasks for the active
 * model, re-read when a post-commit mark makes the Project dirty, when it has none, or after a model switch. The
 * status itself is computed fresh at every read. The same marks index a Project in the background a few seconds after
 * a Task write, when the active model is already on disk (REQ-011).
 */
export class ProjectTaskSearchService implements ProjectTaskSearchCleanup, ProjectTaskSearchMarks {
  private readonly inputs = new Map<string, ItemFingerprints>();
  private readonly dirty = new Set<string>();
  private readonly pendingIndexing = new Map<string, ReturnType<typeof setTimeout>>();
  private disposed = false;

  constructor(private readonly deps: Dependencies) {}

  async search(projectId: string, query: string, options: ProjectTaskSearchOptions = {}): Promise<ProjectTaskSearchResult> {
    const text = query.trim();
    if (!text) throw new ProjectError("TASK_SEARCH_QUERY_REQUIRED", "Search text is required.");
    const tasks = await this.deps.listTasks(projectId);
    const needle = text.toLocaleLowerCase();
    // Exact: the title, the description or one of the comments contains the query (meaning items stay descriptions).
    const exact = tasks.filter((task) => [task.title, task.description, ...task.comments.map((comment) => comment.text)].some((text) => text.toLocaleLowerCase().includes(needle)));
    const meaning = await this.meaningSearch(projectId, tasks, text, exact, options.waitForReadyMs ?? 0);
    const byId = new Map(tasks.map((task) => [task.taskId, task]));
    const exactIds = new Set(exact.map((task) => task.taskId));
    const score = (task: ProjectTaskView) => meaning.scores[task.taskId] ?? Number.NEGATIVE_INFINITY;
    const matches: ProjectTaskSearchMatch[] = [
      ...[...exact].sort((a, b) => score(b) - score(a) || b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId))
        .map((task) => ({ task, match: "exact" as const })),
      ...meaning.matches.flatMap(({ id }) => {
        const task = byId.get(id);
        return task && !exactIds.has(id) ? [{ task, match: "meaning" as const }] : [];
      }),
    ];
    return { matches: options.limit === undefined ? matches : matches.slice(0, options.limit), meaningSearch: meaning.readiness };
  }

  /**
   * Every Project's index state for the active model, alphabetical, computed fresh. Read-only: nothing is scheduled.
   * Only dirty Projects (or all of them after a model switch) read their Tasks; the others reuse their fingerprints.
   */
  async indexStatus(): Promise<ProjectTaskIndexStatus[]> {
    const projects = [...await this.deps.listProjects()].sort((a, b) => a.name.localeCompare(b.name) || a.projectId.localeCompare(b.projectId));
    const live = new Set(projects.map((project) => project.projectId));
    for (const projectId of this.inputs.keys()) if (!live.has(projectId)) this.inputs.delete(projectId);
    const index = this.deps.index();
    return Promise.all(projects.map(async ({ projectId, name }) => ({
      projectId, name, ...index.collectionStatus(collectionOf(projectId), await this.fingerprintsOf(projectId, index)),
    })));
  }

  /** Indexes the Project's missing or changed Tasks (preparing the model first if needed). */
  async indexProject(projectId: string): Promise<void> {
    this.deps.index().sync(collectionOf(projectId), itemsOf(await this.deps.listTasks(projectId)));
  }

  /** Drops the Project's vectors for the active model, then indexes every Task (DEC-006). */
  async rebuildProject(projectId: string): Promise<void> {
    const items = itemsOf(await this.deps.listTasks(projectId));
    const collection = collectionOf(projectId);
    this.deps.index().dropCollection(collection);
    this.deps.index().sync(collection, items);
  }

  /** Index now for every Project that is Not indexed or Needs update, chosen from a fresh status; returns how many. */
  async indexAllProjects(): Promise<number> {
    const due = (await this.indexStatus()).filter((project) => project.state === "notIndexed" || project.state === "needsUpdate");
    for (const project of due) await this.indexProject(project.projectId);
    return due.length;
  }

  /** A committed Task write: its Project's fingerprints are stale, and it is indexed soon if the model is on disk. */
  taskChanged(location: TaskLocation): void {
    if (location.projectId === null) return;
    this.dirty.add(location.projectId);
    this.scheduleIndexAfterWrite(location.projectId);
  }

  taskRemoved(location: TaskLocation): void {
    if (location.projectId !== null) this.dirty.add(location.projectId);
  }

  /** Host shutdown: pending background runs are dropped. */
  dispose(): void {
    this.disposed = true;
    for (const timer of this.pendingIndexing.values()) clearTimeout(timer);
    this.pendingIndexing.clear();
  }

  forgetTask(projectId: string, taskId: string): void {
    this.forget(() => this.deps.index().removeItems(collectionOf(projectId), [taskId]), { projectId, taskId });
  }

  forgetProject(projectId: string): void {
    this.inputs.delete(projectId);
    this.dirty.delete(projectId);
    clearTimeout(this.pendingIndexing.get(projectId));
    this.pendingIndexing.delete(projectId);
    this.forget(() => this.deps.index().dropCollection(collectionOf(projectId)), { projectId });
  }

  /** The Project's Tasks as fingerprints for the active model: kept unless dirty, missing, or for another model. */
  private async fingerprintsOf(projectId: string, index: ReturnType<Dependencies["index"]>): Promise<ItemFingerprints> {
    const kept = this.inputs.get(projectId);
    if (kept && !this.dirty.has(projectId) && index.fingerprintsAreCurrent(kept)) return kept;
    return (await this.readProject(projectId, index)).fingerprints;
  }

  /** Reads the Project's Tasks and keeps their fingerprints (the Project is clean afterwards). */
  private async readProject(projectId: string, index: ReturnType<Dependencies["index"]>) {
    // Cleared before the read: a write committed during it marks the Project dirty again for the next read.
    this.dirty.delete(projectId);
    const items = itemsOf(await this.deps.listTasks(projectId));
    const fingerprints = index.fingerprintItems(items);
    this.inputs.set(projectId, fingerprints);
    return { items, fingerprints };
  }

  /**
   * REQ-011: index the Project in the background a few seconds after a write (writes meanwhile join the run), only when
   * the active model's files are on disk, checked again when the run starts (a write never starts a download). The
   * writer never waits and never sees a failure.
   */
  private scheduleIndexAfterWrite(projectId: string): void {
    if (this.disposed || this.pendingIndexing.has(projectId)) return;
    try {
      if (!this.deps.index().activeModelOnDisk()) return;
    } catch (error) {
      console.warn("PROJECT_TASK_INDEX_AFTER_WRITE_FAILED", { projectId, error: reasonOf(error) });
      return;
    }
    const timer = setTimeout(() => {
      this.pendingIndexing.delete(projectId);
      void this.indexAfterWrite(projectId);
    }, this.deps.indexAfterWriteMs ?? INDEX_AFTER_WRITE_MS);
    timer.unref?.();
    this.pendingIndexing.set(projectId, timer);
  }

  private async indexAfterWrite(projectId: string): Promise<void> {
    try {
      const index = this.deps.index();
      if (this.disposed || !index.activeModelOnDisk()) return;
      // Most marks change no description (status, dependency and assignment commits): with nothing to index, nothing
      // is synced, so no job is made and no model is loaded (CR-003). Unlike Index now, which prepares on purpose.
      const { items, fingerprints } = await this.readProject(projectId, index);
      const collection = collectionOf(projectId);
      const { state } = index.collectionStatus(collection, fingerprints);
      if (state === "ready" || state === "unavailable") return;
      index.sync(collection, items);
    } catch (error) {
      // A Project deleted inside the wait has nothing left to index.
      if (error instanceof ProjectError && error.code === "PROJECT_NOT_FOUND") return;
      console.warn("PROJECT_TASK_INDEX_AFTER_WRITE_FAILED", { projectId, error: reasonOf(error) });
    }
  }

  /** Meaning search never fails a search: an index error leaves exact matches with an `unavailable` state. */
  private async meaningSearch(projectId: string, tasks: ProjectTaskView[], text: string, exact: ProjectTaskView[], waitForReadyMs: number)
    : Promise<EmbeddingSearchResult> {
    try {
      return await this.deps.index().search(collectionOf(projectId), itemsOf(tasks), text, {
        limit: MEANING_LIMIT, waitForReadyMs, scoreIds: exact.map((task) => task.taskId),
      });
    } catch (error) {
      console.warn("PROJECT_TASK_MEANING_SEARCH_FAILED", { projectId, error: reasonOf(error) });
      return { matches: [], scores: {}, readiness: { state: "unavailable", reason: reasonOf(error) } };
    }
  }

  private forget(removal: () => void, subject: Record<string, string>): void {
    try {
      removal();
    } catch (error) {
      console.warn("PROJECT_TASK_SEARCH_CLEANUP_FAILED", { ...subject, error: reasonOf(error) });
    }
  }
}

let instance: ProjectTaskSearchService | null = null;
/** Called once by the process composition, which supplies the Project and Task services' reads and the embedding index. */
export const initializeProjectTaskSearchService = (deps: Dependencies): ProjectTaskSearchService => {
  if (instance) throw new Error("The process ProjectTaskSearchService is already initialized.");
  return instance = new ProjectTaskSearchService(deps);
};
/** The process instance (GraphQL and the agent tool); fails fast before the composition ran. */
export const getProjectTaskSearchService = (): ProjectTaskSearchService => {
  if (!instance) throw new Error("The process ProjectTaskSearchService is not initialized.");
  return instance;
};
export const releaseProjectTaskSearchService = (): void => {
  instance?.dispose();
  instance = null;
};
/**
 * The Task and Project services' default cleanup port: forwards to the process instance, and does nothing before the
 * composition initialized it (no index can hold the Project's Tasks then).
 */
export const processProjectTaskSearchCleanup: ProjectTaskSearchCleanup = {
  forgetTask: (projectId, taskId) => instance?.forgetTask(projectId, taskId),
  forgetProject: (projectId) => instance?.forgetProject(projectId),
};
/** The Task service's post-commit marks for search: forwards to the process instance; nothing before it exists. */
export const processProjectTaskSearchMarks: ProjectTaskSearchMarks = {
  taskChanged: (location) => instance?.taskChanged(location),
  taskRemoved: (location) => instance?.taskRemoved(location),
};
