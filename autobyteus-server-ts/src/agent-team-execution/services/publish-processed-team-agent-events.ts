import type { AgentRunContext, RuntimeAgentRunContext } from "../../agent-execution/domain/agent-run-context.js";
import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { getDefaultAgentRunEventPipeline } from "../../agent-execution/events/default-agent-run-event-pipeline.js";
import type { AgentRunEventPipeline } from "../../agent-execution/events/agent-run-event-pipeline.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../domain/team-run-event.js";
import { buildMemberRouteKeyFromPath } from "../domain/team-run-member-identity.js";

export const publishProcessedTeamAgentEvents = async (input: {
  teamRunId: string;
  runContext: AgentRunContext<unknown | null>;
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRunId: string;
  agentEvents: readonly AgentRunEvent[];
  publishTeamEvent: (event: TeamRunEvent) => void;
  pipeline?: AgentRunEventPipeline;
  sourcePath?: string[] | null;
  subTeamNodeName?: string | null;
}): Promise<void> => {
  if (input.agentEvents.length === 0) {
    return;
  }

  const sourcePath = input.sourcePath?.length ? [...input.sourcePath] : [input.memberName];
  const memberRouteKey = buildMemberRouteKeyFromPath(sourcePath);
  const processedEvents = await (input.pipeline ?? getDefaultAgentRunEventPipeline()).process({
    runContext: input.runContext as AgentRunContext<RuntimeAgentRunContext>,
    events: input.agentEvents,
  });

  for (const agentEvent of processedEvents) {
    const teamEvent: TeamRunEvent = {
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: input.teamRunId,
      sourcePath,
      data: {
        runtimeKind: input.runtimeKind,
        memberName: input.memberName,
        memberRunId: input.memberRunId,
        memberPath: sourcePath,
        memberRouteKey,
        agentEvent,
      } satisfies TeamRunAgentEventPayload,
    };
    if (input.subTeamNodeName !== undefined) {
      teamEvent.subTeamNodeName = input.subTeamNodeName;
    }
    input.publishTeamEvent(teamEvent);
  }
};
