import { Arg, Field, Int, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import type { EmbeddingReadiness } from "../../../embeddings/embedding-index.js";
import { getProjectTaskSearchService } from "../../../projects/search/project-task-search-service.js";
import { withProjectErrors } from "./projects.js";

export enum ProjectTaskMatchKind { EXACT = "EXACT", MEANING = "MEANING" }
export enum MeaningSearchState { READY = "READY", PREPARING = "PREPARING", UNAVAILABLE = "UNAVAILABLE" }
export enum MeaningSearchPhase { DOWNLOADING = "DOWNLOADING", LOADING = "LOADING", INDEXING = "INDEXING" }
registerEnumType(ProjectTaskMatchKind, { name: "ProjectTaskMatchKind" });
registerEnumType(MeaningSearchState, { name: "MeaningSearchState" });
registerEnumType(MeaningSearchPhase, { name: "MeaningSearchPhase" });

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

/** Board transport for Project Task search; it never waits for meaning search to be ready (the board polls). */
@Resolver()
export class ProjectTaskSearchResolver {
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
