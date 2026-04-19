import type {
  ApplicationExecutionEvent,
  ApplicationExecutionProducer,
  ApplicationRunBindingRuntimeSubject,
  ApplicationRunBindingSummary,
  PublishArtifactInputV1,
} from "@autobyteus/application-sdk-contracts";

export const APPLICATION_EXECUTION_CONTEXT_KEY = "application_execution_context" as const;

export type ApplicationExecutionContext = {
  applicationId: string;
  bindingId: string;
  producer: ApplicationExecutionProducer;
};

export type ApplicationExecutionEventPayload =
  | PublishArtifactInputV1
  | { reason?: string | null; errorMessage?: string | null };

export type ApplicationExecutionEventJournalEvent = ApplicationExecutionEvent<ApplicationExecutionEventPayload>;

export type ApplicationExecutionEventJournalRecord = {
  event: ApplicationExecutionEventJournalEvent;
  ackedAt: string | null;
  lastDispatchAttemptNumber: number;
  lastDispatchedAt: string | null;
  lastErrorKind: string | null;
  lastErrorMessage: string | null;
  nextAttemptAfter: string | null;
};

export type ApplicationRunLookupRecord = {
  runId: string;
  applicationId: string;
  bindingId: string;
};

export type BoundRunRuntimeDescriptor = {
  runtimeSubject: ApplicationRunBindingRuntimeSubject;
  runId: string;
};

export type PersistedBindingRecord = ApplicationRunBindingSummary;
