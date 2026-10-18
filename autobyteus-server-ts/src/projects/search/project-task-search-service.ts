import type { EmbeddingIndex, EmbeddingReadiness, EmbeddingSearchResult } from "../../embeddings/embedding-index.js";
import type { ProjectTaskView } from "../domain/models.js";
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

/** The cleanup port the Task and Project services call after a committed delete. Never throws, never waits. */
export type ProjectTaskSearchCleanup = {
  forgetTask(projectId: string, taskId: string): void;
  forgetProject(projectId: string): void;
};

type Dependencies = {
  /** The Project's current Tasks (the Task service's authority); fails with PROJECT_NOT_FOUND for an unknown Project. */
  listTasks: (projectId: string) => Promise<ProjectTaskView[]>;
  /** The embedding index, resolved at use (nothing of the embedding layer is touched at startup). */
  index: () => Pick<EmbeddingIndex, "search" | "removeItems" | "dropCollection">;
};

/** Up to this many meaning matches, as the relevance rule allows (REQ-003). */
const MEANING_LIMIT = 20;
const collectionOf = (projectId: string): string => `project-tasks/${projectId}`;
const reasonOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
/** Open Tasks first, then most recently updated: the order the index embeds them in. */
const indexingOrder = (a: ProjectTaskView, b: ProjectTaskView): number =>
  Number(isTerminalTaskStatus(a.status)) - Number(isTerminalTaskStatus(b.status)) || b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId);

/**
 * Project Task search policy: the collection of each Project (its Tasks' descriptions), the exact tier (today's
 * case-insensitive description containment, REQ-002), the meaning tier from the embedding index, their merge and
 * order, the bounded readiness wait for agents, and index cleanup after deletes. Every Task is read fresh from the
 * Task service, so deleted Tasks never appear and statuses are current.
 */
export class ProjectTaskSearchService implements ProjectTaskSearchCleanup {
  constructor(private readonly deps: Dependencies) {}

  async search(projectId: string, query: string, options: ProjectTaskSearchOptions = {}): Promise<ProjectTaskSearchResult> {
    const text = query.trim();
    if (!text) throw new ProjectError("TASK_SEARCH_QUERY_REQUIRED", "Search text is required.");
    const tasks = await this.deps.listTasks(projectId);
    const needle = text.toLocaleLowerCase();
    const exact = tasks.filter((task) => task.description.toLocaleLowerCase().includes(needle));
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

  forgetTask(projectId: string, taskId: string): void {
    this.forget(() => this.deps.index().removeItems(collectionOf(projectId), [taskId]), { projectId, taskId });
  }

  forgetProject(projectId: string): void {
    this.forget(() => this.deps.index().dropCollection(collectionOf(projectId)), { projectId });
  }

  /** Meaning search never fails a search: an index error leaves exact matches with an `unavailable` state. */
  private async meaningSearch(projectId: string, tasks: ProjectTaskView[], text: string, exact: ProjectTaskView[], waitForReadyMs: number)
    : Promise<EmbeddingSearchResult> {
    try {
      const items = [...tasks].sort(indexingOrder).map((task) => ({ id: task.taskId, text: task.description }));
      return await this.deps.index().search(collectionOf(projectId), items, text, {
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
/** Called once by the process composition, which supplies the Task service's `listTasks` and the embedding index. */
export const initializeProjectTaskSearchService = (deps: Dependencies): ProjectTaskSearchService => {
  if (instance) throw new Error("The process ProjectTaskSearchService is already initialized.");
  return instance = new ProjectTaskSearchService(deps);
};
/** The process instance (GraphQL and the agent tool); fails fast before the composition ran. */
export const getProjectTaskSearchService = (): ProjectTaskSearchService => {
  if (!instance) throw new Error("The process ProjectTaskSearchService is not initialized.");
  return instance;
};
export const releaseProjectTaskSearchService = (): void => { instance = null; };
/**
 * The Task and Project services' default cleanup port: forwards to the process instance, and does nothing before the
 * composition initialized it (no index can hold the Project's Tasks then).
 */
export const processProjectTaskSearchCleanup: ProjectTaskSearchCleanup = {
  forgetTask: (projectId, taskId) => instance?.forgetTask(projectId, taskId),
  forgetProject: (projectId) => instance?.forgetProject(projectId),
};
