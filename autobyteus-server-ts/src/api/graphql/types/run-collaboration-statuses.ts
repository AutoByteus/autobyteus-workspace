import { GraphQLError } from "graphql";
import { GraphQLJSON } from "graphql-scalars";
import { Arg, Field, InputType, Query, Resolver } from "type-graphql";
import {
  listedRunRefDtoSchema,
  RUN_COLLABORATION_STATUSES_MAX_RUNS,
  runCollaborationStatusesDtoSchema,
  type ListedRunRefDto,
} from "@autobyteus/collaboration-stream-contracts";
import { createRootExecutionIdentity } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { getStandaloneAgentRunRootManager } from "../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { getStudioAgentOrgRunService, getStudioRunViewChildren, getStudioTeamRunService } from "../studio-application-api-services.js";

@InputType()
export class ListedRunInput {
  /** `agent`, `agent_team` or `agent_org`. */
  @Field(() => String) kind!: string;
  @Field(() => String) runId!: string;
}

@Resolver()
export class RunCollaborationStatusesResolver {
  /**
   * The history poll of listed runs that are not open, for every kind (autobyteus-426 REQ-009; autobyteus-461 SR-055):
   * each run's activity and the runs on this node it delegated to that its view shows, each by its identity (no launch
   * details; SR-056) with its agents' statuses, from the same tree as the view. Never reads the view; never restores.
   */
  @Query(() => GraphQLJSON)
  async runCollaborationStatuses(@Arg("runs", () => [ListedRunInput]) runs: ListedRunInput[]): Promise<unknown> {
    if (runs.length > RUN_COLLABORATION_STATUSES_MAX_RUNS) {
      throw new GraphQLError(`At most ${RUN_COLLABORATION_STATUSES_MAX_RUNS} runs per status read.`, { extensions: { code: "BAD_USER_INPUT" } });
    }
    const refs = runs.map((run) => listedRunRefDtoSchema.parse({ kind: run.kind, runId: run.runId.trim() }));
    const children = getStudioRunViewChildren();
    return runCollaborationStatusesDtoSchema.parse(await Promise.all(refs.map(async (ref) => ({
      kind: ref.kind, runId: ref.runId, isActive: isActive(ref),
      children: await children.listed(createRootExecutionIdentity({ rootSubjectKind: ref.kind, rootRunId: ref.runId })),
    }))));
  }
}

/** Whether the listed run itself is active (its own root is managed). */
const isActive = (ref: ListedRunRefDto): boolean => {
  switch (ref.kind) {
    case "agent": return getStandaloneAgentRunRootManager().getActive(ref.runId) !== null;
    case "agent_team": return getStudioTeamRunService().getActiveTeamRun(ref.runId) !== null;
    case "agent_org": return getStudioAgentOrgRunService().getActive(ref.runId) !== null;
  }
};
