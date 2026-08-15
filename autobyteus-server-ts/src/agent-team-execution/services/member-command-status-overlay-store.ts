import { normalizeAgentApiStatus, type AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import type { TeamAgentExecutionBinding } from "../domain/team-agent-execution-binding.js";
import {
  createTeamAgentStatusDetails,
  createTeamAgentStatusEvent,
  createTeamAgentStatusSnapshot,
  type TeamAgentStatusDetails,
  type TeamAgentStatusSnapshot,
} from "../domain/team-agent-status.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";

export class MemberCommandStatusOverlayStore {
  private readonly statuses = new Map<string, TeamAgentStatusDetails>();

  constructor(private readonly options: { publishEvent: (event: TeamRunEvent) => void }) {}

  publishMemberCommandStatus(input: {
    binding: TeamAgentExecutionBinding;
    currentStatus: () => unknown;
    status: "initializing" | "error";
    errorMessage?: string | null;
  }): boolean {
    const current = normalizeAgentApiStatus(input.currentStatus());
    if (input.status === "initializing" && current !== "offline" && current !== "idle") return false;
    const details = createTeamAgentStatusDetails({
      status: input.status,
      trigger: "member_command",
      errorMessage: input.errorMessage ?? null,
    });
    const snapshot = createTeamAgentStatusSnapshot({ execution: input.binding, details });
    const key = this.key(input.binding);
    this.statuses.set(key, details);
    try {
      this.options.publishEvent(createTeamAgentStatusEvent(snapshot));
    } catch (error) {
      if (this.statuses.get(key) === details) this.statuses.delete(key);
      throw error;
    }
    return true;
  }

  getMemberStatusSnapshot(input: {
    binding: TeamAgentExecutionBinding;
    fallback: () => AgentStatusPayload;
  }): TeamAgentStatusSnapshot {
    const overlay = this.statuses.get(this.key(input.binding));
    if (overlay) return createTeamAgentStatusSnapshot({ execution: input.binding, details: overlay });
    const fallback = input.fallback();
    return createTeamAgentStatusSnapshot({
      execution: input.binding,
      details: createTeamAgentStatusDetails({
        status: fallback.status,
      }),
    });
  }

  clearAcceptedLiveStatus(binding: TeamAgentExecutionBinding): boolean {
    const key = this.key(binding);
    return this.statuses.delete(key);
  }

  applyMemberStatusOverlays(snapshots: readonly TeamAgentStatusSnapshot[]): TeamAgentStatusSnapshot[] {
    return snapshots.map((snapshot) => {
      const overlay = this.statuses.get(this.key(snapshot.execution));
      return overlay
        ? createTeamAgentStatusSnapshot({ execution: snapshot.execution, details: overlay })
        : snapshot;
    });
  }

  clear(): void { this.statuses.clear(); }

  private key(binding: TeamAgentExecutionBinding): string {
    return `${binding.rootTeamRunId}\0${binding.agentRunId}\0${binding.memberAddress}`;
  }
}
