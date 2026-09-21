import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentPresentationEvent } from "../../agent-collaboration/execution/events/agent-presentation-event.js";
import {
  AgentRunPresentationAdapter,
  type AgentRunPresentationAdaptationResult,
} from "../../agent-collaboration/execution/events/collaboration-agent-presentation-adapter.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamAgentEvent } from "../domain/team-agent-event.js";

export type TeamAgentEventAdaptationResult =
  | Readonly<{ kind: "publish"; event: TeamAgentEvent }>
  | Readonly<{ kind: "filtered_collaboration_duplicate" }>
  | Readonly<{ kind: "rejected"; code: "TEAM_AGENT_EVENT_ADMISSION_FAILED"; message: string }>;

export type ResolveTeamMemberIdentityByAgentRunId = (
  agentRunId: string,
) => CollaborationMemberExecutionIdentity | null;

export const toTeamAgentEvent = (
  event: AgentPresentationEvent,
  execution: CollaborationMemberExecutionIdentity,
): TeamAgentEvent => {
  if (event.eventType === "MEMBER_INPUT_MESSAGE") {
    throw new Error("Team member input uses its existing dedicated Team message branch.");
  }
  if (execution.root.rootSubjectKind !== "agent_team") {
    throw new Error("A Team presentation event requires an AgentTeam root identity.");
  }
  if (event.eventType === "TOKEN_USAGE_UPDATED") {
    const summary = event.details.runSummaryAfterEvent;
    return Object.freeze({
      ...event,
      details: Object.freeze({
        ...event.details,
        runSummaryAfterEvent: summary
          ? Object.freeze({ ...summary, root_team_run_id: execution.root.rootRunId })
          : null,
      }),
    });
  }
  return event as TeamAgentEvent;
};

/** Team compatibility adapter over the root-neutral presentation admission boundary. */
export class TeamAgentEventAdapter {
  private readonly shared: AgentRunPresentationAdapter;

  constructor(private readonly resolveIdentity: ResolveTeamMemberIdentityByAgentRunId) {
    this.shared = new AgentRunPresentationAdapter(resolveIdentity);
  }

  adapt(event: AgentRunEvent): TeamAgentEventAdaptationResult {
    const result: AgentRunPresentationAdaptationResult = this.shared.adapt(event);
    if (result.kind === "filtered_collaboration_duplicate") return result;
    if (result.kind === "rejected") return Object.freeze({
      kind: "rejected",
      code: "TEAM_AGENT_EVENT_ADMISSION_FAILED",
      message: result.message,
    });
    const identity = this.resolveIdentity(event.runId);
    if (!identity) return Object.freeze({
      kind: "rejected",
      code: "TEAM_AGENT_EVENT_ADMISSION_FAILED",
      message: `AgentRun '${event.runId}' does not resolve in the root TeamRun.`,
    });
    return Object.freeze({ kind: "publish", event: toTeamAgentEvent(result.event, identity) });
  }
}
