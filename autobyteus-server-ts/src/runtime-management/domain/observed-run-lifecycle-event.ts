import type { ApplicationAgentBindingRecord } from "../../application-orchestration/domain/models.js";

export type ObservedRunLifecyclePhase = "ATTACHED" | "TERMINATED" | "FAILED";

export type ObservedRunLifecycleEvent = {
  runtimeSubject: ApplicationAgentBindingRecord["runtime"]["subject"];
  runId: string;
  phase: ObservedRunLifecyclePhase;
  occurredAt: string;
  errorMessage?: string | null;
};
