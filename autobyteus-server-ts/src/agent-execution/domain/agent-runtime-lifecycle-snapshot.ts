import type { CompactionRecoveryBlockDto } from "@autobyteus/agent-presentation-contracts";
export type AgentRuntimeCurrentTurn =
  | { kind: "NONE" }
  | { kind: "IDENTIFIED"; turnId: string }
  | { kind: "ANONYMOUS" };

export type AgentRuntimeLifecycleSnapshot = {
  recoverableBlock?: CompactionRecoveryBlockDto | null;
  availability: "active" | "offline";
  phase: "initializing" | "idle" | "running" | "error";
  currentTurn: AgentRuntimeCurrentTurn;
};

export const offlineAgentRuntimeLifecycleSnapshot = (): AgentRuntimeLifecycleSnapshot => ({
  availability: "offline",
  phase: "idle",
  currentTurn: { kind: "NONE" },
});
