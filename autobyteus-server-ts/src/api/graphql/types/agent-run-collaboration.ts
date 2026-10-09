import { GraphQLJSON } from "graphql-scalars";
import { Arg, Field, Int, ObjectType, Query, Resolver } from "type-graphql";
import { isRootSubjectKind } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { getCollaboratorAdmission } from "../../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { getStandaloneAgentRunRootManager } from "../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { getStandaloneRootMemberViewProjectionService } from "../../../standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import { projectAgentCollaborationView } from "../../../services/agent-streaming/agent-collaboration-view-projector.js";
import { resolveCollaboratorRootPort } from "../services/collaborator-root-port-resolver.js";
import { EventMonitorActiveTracePageObject } from "./event-monitor-active-trace-page.js";

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
  /** `AVAILABLE`, or `UNAVAILABLE_APPLICATION_ROOT` for runs that cannot host collaborators. */
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

@Resolver()
export class AgentRunCollaborationResolver {
  /**
   * The Agent-root view of a standalone run: the live root snapshot when one is active, else the
   * stored package with every child offline. Null when the run has no package. Never restores.
   */
  @Query(() => GraphQLJSON, { nullable: true })
  async agentRunCollaboration(@Arg("runId", () => String) runId: string): Promise<unknown> {
    const inspection = await getStandaloneAgentRunRootManager().getInspection(runId);
    return inspection ? projectAgentCollaborationView(inspection) : null;
  }

  @Query(() => AgentRunCollaborationMemberProjectionPayload)
  agentRunCollaborationMemberProjection(
    @Arg("hostRunId", () => String) hostRunId: string,
    @Arg("memberAddress", () => String) memberAddress: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<AgentRunCollaborationMemberProjectionPayload> {
    return getStandaloneRootMemberViewProjectionService().getProjection(hostRunId, memberAddress, agentRunId);
  }

  @Query(() => EventMonitorActiveTracePageObject)
  agentRunCollaborationMemberEventMonitorActiveTracePage(
    @Arg("hostRunId", () => String) hostRunId: string,
    @Arg("memberAddress", () => String) memberAddress: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("beforeCursor", () => String, { nullable: true }) beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePageObject> {
    return getStandaloneRootMemberViewProjectionService().getActiveTracePage(hostRunId, memberAddress, agentRunId, beforeCursor);
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
