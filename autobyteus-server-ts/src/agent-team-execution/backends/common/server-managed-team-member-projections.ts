import type { AgentRunEvent } from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../../domain/team-run-event.js";

export type ServerManagedMemberProjectionContext = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
};

export const buildServerManagedMemberStatusSnapshots = <
  TMember extends ServerManagedMemberProjectionContext,
>(
  memberContexts: readonly TMember[],
  resolveSnapshot: (memberContext: TMember) => AgentStatusPayload,
): AgentStatusPayload[] =>
  memberContexts.map((memberContext) => ({
    ...resolveSnapshot(memberContext),
    agent_name: memberContext.memberName,
    agent_id: memberContext.memberRunId,
    member_route_key: memberContext.memberRouteKey,
    member_path: memberContext.memberPath,
    source_route_key: memberContext.memberRouteKey,
    source_path: memberContext.memberPath,
  }));

export const buildServerManagedTeamAgentEvent = (input: {
  teamRunId: string;
  runtimeKind: RuntimeKind;
  memberContext: ServerManagedMemberProjectionContext;
  agentEvent: AgentRunEvent;
}): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  teamRunId: input.teamRunId,
  sourcePath: input.memberContext.memberPath,
  data: {
    runtimeKind: input.runtimeKind,
    memberName: input.memberContext.memberName,
    memberRunId: input.memberContext.memberRunId,
    memberPath: input.memberContext.memberPath,
    memberRouteKey: input.memberContext.memberRouteKey,
    agentEvent: input.agentEvent,
  } satisfies TeamRunAgentEventPayload,
});
