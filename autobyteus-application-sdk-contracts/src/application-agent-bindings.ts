import type { ApplicationExecutionResourceRef } from "./execution-resources.js";

export type ApplicationAgentBindingStatus =
  | "ATTACHED"
  | "TERMINATING"
  | "TERMINATED"
  | "FAILED"
  | "ORPHANED";

type ApplicationAgentBindingFields = {
  bindingId: string;
  applicationId: string;
  launchRequestId: string;
  status: ApplicationAgentBindingStatus;
  executionResourceRef: ApplicationExecutionResourceRef;
  createdAt: string;
  updatedAt: string;
  terminatedAt: string | null;
  lastErrorMessage: string | null;
};

export type ApplicationAgentBinding = ApplicationAgentBindingFields & {
  runtime: {
    subject: "AGENT_RUN";
    agentRunId: string;
    definitionId: string;
    members: [];
  };
};

export type ApplicationAgentTeamBindingMember = {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  runtimeKind: "AGENT" | "AGENT_TEAM_MEMBER";
};

export type ApplicationAgentTeamBinding = ApplicationAgentBindingFields & {
  runtime: {
    subject: "TEAM_RUN";
    teamRunId: string;
    definitionId: string;
    members: ApplicationAgentTeamBindingMember[];
  };
};

export type ApplicationAgentBindingListFilter = {
  status?: ApplicationAgentBindingStatus | null;
};

export type ApplicationAgentTarget =
  | { kind: "AGENT_RUN" }
  | { kind: "AGENT_TEAM_RUN" }
  | { kind: "AGENT_TEAM_MEMBER"; agentRunId: string };

export type ApplicationAgentTargetAddress = {
  bindingId: string;
  target: ApplicationAgentTarget;
};

export type ApplicationRuntimeInputContextFile = {
  uri: string;
  fileType?: string | null;
  fileName?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ApplicationAgentInput = {
  text: string;
  contextFiles?: ApplicationRuntimeInputContextFile[] | null;
  metadata?: Record<string, unknown> | null;
};

export type ApplicationExecutionProducerRuntimeKind = "AGENT" | "AGENT_TEAM_MEMBER";

export type ApplicationExecutionProducer = {
  agentRunId: string;
  displayName: string | null;
  runtimeKind: ApplicationExecutionProducerRuntimeKind;
};

export type ApplicationExecutionContext = Readonly<{
  applicationId: string;
  bindingId: string;
  producer: ApplicationExecutionProducer;
}>;
