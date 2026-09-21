import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import {
  createCollaborationAgentStatusSnapshot,
  type CollaborationAgentStatusSnapshot,
} from "../domain/collaboration-agent-execution-event.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";

export class ConfiguredAgentStatusOverlay {
  private snapshot: CollaborationAgentStatusSnapshot | null = null;
  constructor(
    private readonly identity: CollaborationMemberExecutionIdentity,
    private readonly publish: (snapshot: CollaborationAgentStatusSnapshot) => void,
  ) {}

  set(status: "initializing" | "error", current: unknown, errorMessage?: string | null): boolean {
    if (status === "initializing" && current !== "offline" && current !== "idle") return false;
    const snapshot = createCollaborationAgentStatusSnapshot({
      execution: this.identity,
      status,
      trigger: "member_command",
      errorMessage,
    });
    this.snapshot = snapshot;
    try { this.publish(snapshot); }
    catch (error) { if (this.snapshot === snapshot) this.snapshot = null; throw error; }
    return true;
  }

  get(fallback: () => AgentStatusPayload): CollaborationAgentStatusSnapshot {
    return this.snapshot ?? createCollaborationAgentStatusSnapshot({
      execution: this.identity,
      status: fallback().status,
    });
  }

  clear(): void { this.snapshot = null; }
}
