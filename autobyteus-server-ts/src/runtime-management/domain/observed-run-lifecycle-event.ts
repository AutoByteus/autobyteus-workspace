import type { ApplicationRunBindingRuntimeSubject } from "@autobyteus/application-sdk-contracts";

export type ObservedRunLifecyclePhase = "ATTACHED" | "TERMINATED" | "FAILED";

export type ObservedRunLifecycleEvent = {
  runtimeSubject: ApplicationRunBindingRuntimeSubject;
  runId: string;
  phase: ObservedRunLifecyclePhase;
  occurredAt: string;
  errorMessage?: string | null;
};
