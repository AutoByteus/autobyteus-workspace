import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { normalizeAgentApiStatus, type AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TeamExecutionAddress } from "../domain/team-execution-address.js";
import { serializeTeamExecutionAddress } from "../domain/team-execution-address.js";
import { TeamRunEventSourceType, type TeamRunAgentEventPayload, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { buildAgentMemberCommandStartStatusEvent, buildAgentMemberCommandStatusPayload } from "./team-member-command-start-status-events.js";

export type MemberCommandStatusIdentity = {
  executionAddress: TeamExecutionAddress;
  displayName: string;
  agentRunId: string;
};

export class MemberCommandStatusOverlayStore {
  private readonly statuses = new Map<string, AgentStatusPayload>();
  constructor(private readonly options: { getTeamRunId: () => string | null; publishEvent: (event: TeamRunEvent) => void }) {}

  publishMemberCommandStatus(input: {
    runtimeKind: RuntimeKind;
    memberContext: MemberCommandStatusIdentity;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    currentStatus: () => unknown;
    status: "initializing" | "error";
    errorMessage?: string | null;
  }): boolean {
    const current = normalizeAgentApiStatus(input.currentStatus());
    if (input.status === "initializing" && current !== "offline" && current !== "idle") return false;
    const teamRunId = this.options.getTeamRunId();
    if (!teamRunId) return false;
    const eventInput = {
      teamRunId,
      runtimeKind: input.runtimeKind,
      executionAddress: input.memberContext.executionAddress,
      displayName: input.memberContext.displayName,
      agentRunId: input.memberContext.agentRunId,
      taskAgentInstance: input.taskAgentInstance ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    };
    this.statuses.set(serializeTeamExecutionAddress(input.memberContext.executionAddress), buildAgentMemberCommandStatusPayload(eventInput));
    this.options.publishEvent(buildAgentMemberCommandStartStatusEvent(eventInput));
    return true;
  }

  getMemberStatusSnapshot(input: { memberContext: MemberCommandStatusIdentity; fallback: () => AgentStatusPayload }): AgentStatusPayload {
    return this.statuses.get(serializeTeamExecutionAddress(input.memberContext.executionAddress)) ?? input.fallback();
  }

  applyMemberStatusOverlays(snapshots: AgentStatusPayload[]): AgentStatusPayload[] {
    return snapshots.map((snapshot) => snapshot.execution_address
      ? this.statuses.get(serializeTeamExecutionAddress(snapshot.execution_address)) ?? snapshot
      : snapshot);
  }

  recordReplacementEvents(events: readonly TeamRunEvent[]): boolean {
    let changed = false;
    for (const event of events) {
      if (event.eventSourceType !== TeamRunEventSourceType.AGENT) continue;
      const payload = event.data as TeamRunAgentEventPayload;
      if (payload.agentEvent.eventType !== AgentRunEventType.AGENT_STATUS) continue;
      changed = this.statuses.delete(serializeTeamExecutionAddress(event.executionAddress)) || changed;
    }
    return changed;
  }

  clear(): void { this.statuses.clear(); }
}
