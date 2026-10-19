import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import type { EmbeddingReadiness } from "../../../embeddings/embedding-index.js";
import { getProjectTaskSearchService, type ProjectTaskIndexStatus } from "../../../projects/search/project-task-search-service.js";
import { withProjectErrors } from "./projects.js";

export enum ProjectTaskMatchKind { EXACT = "EXACT", MEANING = "MEANING" }
export enum MeaningSearchState { READY = "READY", PREPARING = "PREPARING", UNAVAILABLE = "UNAVAILABLE" }
export enum MeaningSearchPhase { DOWNLOADING = "DOWNLOADING", LOADING = "LOADING", INDEXING = "INDEXING" }
registerEnumType(ProjectTaskMatchKind, { name: "ProjectTaskMatchKind" });
registerEnumType(MeaningSearchState, { name: "MeaningSearchState" });
registerEnumType(MeaningSearchPhase, { name: "MeaningSearchPhase" });
export enum ProjectTaskIndexState {
  NOT_INDEXED = "NOT_INDEXED", WAITING = "WAITING", INDEXING = "INDEXING", READY = "READY", NEEDS_UPDATE = "NEEDS_UPDATE", UNAVAILABLE = "UNAVAILABLE",
}
registerEnumType(ProjectTaskIndexState, { name: "ProjectTaskIndexState" });

/**
 * One Project's index for the active model (Settings → Embedding). `done`/`total`: Tasks of the current run while
 * indexing; `total`: Tasks for Ready and Not indexed, Tasks to index while waiting; `changed`: for Needs update.
 */
@ObjectType()
export class ProjectTaskIndex {
  @Field(() => String) projectId!: string;
  @Field(() => String) name!: string;
  @Field(() => ProjectTaskIndexState) state!: ProjectTaskIndexState;
  @Field(() => Int, { nullable: true }) done!: number | null;
  @Field(() => Int, { nullable: true }) total!: number | null;
  @Field(() => Int, { nullable: true }) changed!: number | null;
}

const INDEX_STATES: Record<ProjectTaskIndexStatus["state"], ProjectTaskIndexState> = {
  notIndexed: ProjectTaskIndexState.NOT_INDEXED, waiting: ProjectTaskIndexState.WAITING, indexing: ProjectTaskIndexState.INDEXING,
  ready: ProjectTaskIndexState.READY, needsUpdate: ProjectTaskIndexState.NEEDS_UPDATE, unavailable: ProjectTaskIndexState.UNAVAILABLE,
};
const toProjectTaskIndex = (status: ProjectTaskIndexStatus): ProjectTaskIndex => ({
  projectId: status.projectId, name: status.name, state: INDEX_STATES[status.state],
  done: status.state === "indexing" ? status.done : null,
  total: status.state === "unavailable" ? null : status.total,
  changed: status.state === "needsUpdate" ? status.changed : null,
});

@ObjectType()
export class ProjectTaskSearchMatch {
  @Field(() => String) taskId!: string;
  @Field(() => ProjectTaskMatchKind) match!: ProjectTaskMatchKind;
}

/** Meaning-search readiness; while downloading `done`/`total` count bytes, while indexing they count Tasks. */
@ObjectType()
export class MeaningSearchStatus {
  @Field(() => MeaningSearchState) state!: MeaningSearchState;
  @Field(() => MeaningSearchPhase, { nullable: true }) phase!: MeaningSearchPhase | null;
  @Field(() => Int, { nullable: true }) done!: number | null;
  @Field(() => Int, { nullable: true }) total!: number | null;
  @Field(() => String, { nullable: true }) reason!: string | null;
}

@ObjectType()
export class ProjectTaskSearchResult {
  /** Best-first: exact matches, then meaning matches. The board places them in their status lanes. */
  @Field(() => [ProjectTaskSearchMatch]) matches!: ProjectTaskSearchMatch[];
  @Field(() => MeaningSearchStatus) meaningSearch!: MeaningSearchStatus;
}

const toMeaningSearchStatus = (readiness: EmbeddingReadiness): MeaningSearchStatus => {
  if (readiness.state === "ready") return { state: MeaningSearchState.READY, phase: null, done: null, total: null, reason: null };
  if (readiness.state === "unavailable") return { state: MeaningSearchState.UNAVAILABLE, phase: null, done: null, total: null, reason: readiness.reason };
  return { state: MeaningSearchState.PREPARING, phase: readiness.phase.toUpperCase() as MeaningSearchPhase, done: readiness.done, total: readiness.total, reason: null };
};

/**
 * Project Task search transport: the board's search (it never waits for meaning search to be ready; the board polls),
 * and Settings → Embedding's Project indexes (a read-only status and explicit index actions).
 */
@Resolver()
export class ProjectTaskSearchResolver {
  /** Every Project's index state for the active model, alphabetical. Read-only: starts no download or indexing. */
  @Query(() => [ProjectTaskIndex])
  async projectTaskIndexes(): Promise<ProjectTaskIndex[]> {
    return withProjectErrors(async () => (await getProjectTaskSearchService().indexStatus()).map(toProjectTaskIndex));
  }

  /** Index now: the Project's missing or changed Tasks (prepares the model if needed). */
  @Mutation(() => Boolean)
  async indexProjectTasks(@Arg("projectId", () => String) projectId: string): Promise<boolean> {
    await withProjectErrors(() => getProjectTaskSearchService().indexProject(projectId));
    return true;
  }

  /** Rebuild: drops the Project's vectors for the active model, then indexes every Task. */
  @Mutation(() => Boolean)
  async rebuildProjectTaskIndex(@Arg("projectId", () => String) projectId: string): Promise<boolean> {
    await withProjectErrors(() => getProjectTaskSearchService().rebuildProject(projectId));
    return true;
  }

  /** Index now for every Project that is Not indexed or Needs update; returns how many were started. */
  @Mutation(() => Int)
  async indexAllProjectTasks(): Promise<number> {
    return withProjectErrors(() => getProjectTaskSearchService().indexAllProjects());
  }

  @Query(() => ProjectTaskSearchResult)
  async searchProjectTasks(
    @Arg("projectId", () => String) projectId: string,
    @Arg("query", () => String) query: string,
  ): Promise<ProjectTaskSearchResult> {
    return withProjectErrors(async () => {
      const result = await getProjectTaskSearchService().search(projectId, query);
      return {
        matches: result.matches.map(({ task, match }) => ({ taskId: task.taskId, match: match === "exact" ? ProjectTaskMatchKind.EXACT : ProjectTaskMatchKind.MEANING })),
        meaningSearch: toMeaningSearchStatus(result.meaningSearch),
      };
    });
  }
}
