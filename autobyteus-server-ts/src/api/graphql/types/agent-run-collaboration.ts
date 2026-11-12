import { getStudioRunViewChildren } from "../studio-application-api-services.js";
import { GraphQLJSON } from "graphql-scalars";
import { Arg, Field, Int, ObjectType, Query, Resolver } from "type-graphql";
import { createAgentRootExecutionIdentity, isRootSubjectKind } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { closedTaskExecutionsDigest } from "@autobyteus/collaboration-stream-contracts";
import { GraphQLError } from "graphql";
import { getCollaboratorAdmission } from "../../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { getStandaloneAgentRunRootManager } from "../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { getStandaloneRootMemberViewProjectionService } from "../../../standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import { projectAgentCollaborationView } from "../../../services/agent-streaming/agent-collaboration-view-projector.js";
import { resolveCollaboratorRootPort } from "../services/collaborator-root-port-resolver.js";

@ObjectType()
export class CollaboratorMentionCandidateObject {
  @Field(() => String) kind!: "agent" | "agent_team";
  @Field(() => String) definitionId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  @Field(() => Int, { nullable: true }) memberCount?: number | null;
  @Field(() => String, { nullable: true }) coordinatorName?: string | null;
}

@ObjectType()
export class CollaboratorMentionCandidatesPayload {
  /** `AVAILABLE`, or `UNAVAILABLE_APPLICATION_ROOT` for runs that cannot involve other agents. */
  @Field(() => String) availability!: "AVAILABLE" | "UNAVAILABLE_APPLICATION_ROOT";
  @Field(() => [CollaboratorMentionCandidateObject]) candidates!: CollaboratorMentionCandidateObject[];
}

@ObjectType()
export class AgentRunCollaborationMemberProjectionPayload {
  @Field(() => String) agentRunId!: string;
  @Field(() => String) memberAddress!: string;
  @Field(() => [GraphQLJSON]) conversation!: unknown[];
  @Field(() => [GraphQLJSON]) activities!: unknown[];
  @Field(() => String, { nullable: true }) summary?: string | null;
  @Field(() => String, { nullable: true }) lastActivityAt?: string | null;
  @Field(() => Boolean) hasEarlierActiveTraceEvents!: boolean;
}

/** At most this many runs per status read (the history poll lists the standalone runs it shows). */
export const AGENT_RUN_COLLABORATION_STATUSES_MAX_RUNS = 100;

@ObjectType()
export class AgentRunChildStatusObject {
  @Field(() => String) agentRunId!: string;
  @Field(() => String) memberAddress!: string;
  @Field(() => String) status!: string;
  @Field(() => GraphQLJSON, { nullable: true }) recoverableBlock?: unknown | null;
}

@ObjectType()
export class AgentRunCollaborationStatusesObject {
  @Field(() => String) runId!: string;
  @Field(() => Boolean) isActive!: boolean;
  @Field(() => [AgentRunChildStatusObject]) statuses!: AgentRunChildStatusObject[];
  /** The run's closed-set digest (autobyteus-446, -435): its delegated runs whose Tasks are all closed while they still run. */
  @Field(() => String, { nullable: true, description: "The run's closed-set digest (closedTaskExecutionsDigest): the runs it delegated to whose Tasks are all closed while they still run." })
  closedTaskExecutionsDigest!: string | null;
}

@Resolver()
export class AgentRunCollaborationResolver {
  /**
   * The history poll of listed standalone runs (autobyteus-426 REQ-009, -446; base's shape, autobyteus-461 SR-061 rule 1):
   * each run's own agent's activity, its delegated runs' agents' live statuses and its closed-set digest, from the
   * collaboration tree, never the view. Never restores; a delegated run's status is its own, whether or not its
   * delegator runs (SR-045).
   */
  @Query(() => [AgentRunCollaborationStatusesObject])
  async agentRunCollaborationStatuses(@Arg("runIds", () => [String]) runIds: string[]): Promise<AgentRunCollaborationStatusesObject[]> {
    if (runIds.length > AGENT_RUN_COLLABORATION_STATUSES_MAX_RUNS) {
      throw new GraphQLError(`At most ${AGENT_RUN_COLLABORATION_STATUSES_MAX_RUNS} runs per status read.`, { extensions: { code: "BAD_USER_INPUT" } });
    }
    const children = getStudioRunViewChildren();
    const roots = getStandaloneAgentRunRootManager();
    return Promise.all(runIds.map(async (runIdInput) => {
      const runId = runIdInput.trim();
      const { statuses, closedTaskExecutions } = await children.poll(createAgentRootExecutionIdentity(runId));
      return {
        runId,
        isActive: roots.getActive(runId)?.isHostLive() ?? false,
        closedTaskExecutionsDigest: closedTaskExecutionsDigest(closedTaskExecutions),
        statuses: statuses.map((status) => ({ agentRunId: status.agentRunId, memberAddress: status.memberAddress, status: status.status, recoverableBlock: null })),
      };
    }));
  }

  /**
   * The Agent-root view of a standalone run: the live root snapshot when one is active, else the
   * stored package with every child offline. Null when the run has no package. Never restores.
   */
  @Query(() => GraphQLJSON, { nullable: true })
  async agentRunCollaboration(@Arg("runId", () => String) runId: string): Promise<unknown> {
    const inspection = await getStandaloneAgentRunRootManager().getInspection(runId);
    if (!inspection) return null;
    const run = { rootSubjectKind: "agent" as const, rootRunId: inspection.hostRunId };
    const children = getStudioRunViewChildren();
    const { rows, statuses } = await children.read(run);
    return projectAgentCollaborationView({ ...inspection, rows, childStatuses: statuses });
  }

  @Query(() => AgentRunCollaborationMemberProjectionPayload)
  agentRunCollaborationMemberProjection(
    @Arg("hostRunId", () => String) hostRunId: string,
    @Arg("memberAddress", () => String) memberAddress: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<AgentRunCollaborationMemberProjectionPayload> {
    return getStandaloneRootMemberViewProjectionService().getProjection(hostRunId, memberAddress, agentRunId);
  }

  /**
   * `@` menu options for a live run's root, from the one server-owned candidate policy. An Agent
   * root answers for one focused agent (`focusedAgentRunId`, required for `agent`); Team and Org
   * roots answer per root and ignore it.
   */
  @Query(() => CollaboratorMentionCandidatesPayload)
  async collaboratorMentionCandidates(
    @Arg("rootSubjectKind", () => String) rootSubjectKind: string,
    @Arg("rootRunId", () => String) rootRunId: string,
    @Arg("focusedAgentRunId", () => String, { nullable: true }) focusedAgentRunId?: string | null,
  ): Promise<CollaboratorMentionCandidatesPayload> {
    if (!isRootSubjectKind(rootSubjectKind)) throw new Error(`Unknown root kind '${rootSubjectKind}'.`);
    const port = await resolveCollaboratorRootPort(rootSubjectKind, rootRunId, focusedAgentRunId);
    if (!port) throw new Error(`Run '${rootRunId}' was not found.`);
    const list = await getCollaboratorAdmission().policy.listCandidates(port);
    return {
      availability: list.availability,
      candidates: list.candidates.map((candidate) => candidate.kind === "agent"
        ? { ...candidate, memberCount: null, coordinatorName: null }
        : { ...candidate }),
    };
  }
}
