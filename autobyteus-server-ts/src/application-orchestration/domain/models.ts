import type {
  ApplicationExecutionEvent,
  ApplicationExecutionProducer,
  ApplicationAgentBinding,
  ApplicationAgentBindingStatus,
  ApplicationAgentTeamBinding,
  ApplicationAgentTeamBindingMember,
  ApplicationExecutionResourceRef,
} from "@autobyteus/application-sdk-contracts";

export const APPLICATION_EXECUTION_CONTEXT_KEY = "application_execution_context" as const;

export type { ApplicationExecutionContext } from "@autobyteus/application-sdk-contracts";

export type ApplicationExecutionEventPayload =
  { reason?: string | null; errorMessage?: string | null };

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

export type BoundRunRuntimeDescriptor =
  | { runtimeSubject: "AGENT_RUN"; agentRunId: string }
  | { runtimeSubject: "TEAM_RUN"; teamRunId: string };

export type ApplicationAgentBindingRecord = {
  bindingId: string;
  applicationId: string;
  launchRequestId: string;
  status: ApplicationAgentBindingStatus;
  executionResourceRef: ApplicationExecutionResourceRef;
  runtime: {
    subject: "AGENT_RUN";
    agentRunId: string;
    definitionId: string;
    members: [];
  } | {
    subject: "TEAM_RUN";
    teamRunId: string;
    definitionId: string;
    members: ApplicationAgentTeamBindingMember[];
  };
  createdAt: string;
  updatedAt: string;
  terminatedAt: string | null;
  lastErrorMessage: string | null;
};

export const toPublicApplicationAgentBinding = (
  record: ApplicationAgentBindingRecord,
): ApplicationAgentBinding | ApplicationAgentTeamBinding => {
  const common = {
    bindingId: record.bindingId,
    applicationId: record.applicationId,
    launchRequestId: record.launchRequestId,
    status: record.status,
    executionResourceRef: structuredClone(record.executionResourceRef),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    terminatedAt: record.terminatedAt,
    lastErrorMessage: record.lastErrorMessage,
  };
  return record.runtime.subject === "AGENT_RUN"
    ? { ...common, runtime: { subject: "AGENT_RUN", agentRunId: record.runtime.agentRunId, definitionId: record.runtime.definitionId, members: [] } }
    : { ...common, runtime: { ...record.runtime, subject: "TEAM_RUN", members: structuredClone(record.runtime.members) } };
};
export type PersistedBindingRecord = ApplicationAgentBindingRecord;
