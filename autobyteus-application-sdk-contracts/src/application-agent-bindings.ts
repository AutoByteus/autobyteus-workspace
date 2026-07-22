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
    runId: string;
    definitionId: string;
    members: [];
  };
};

export type ApplicationAgentTeamBindingMember = {
  memberName: string;
  memberRouteKey: string;
  displayName: string;
  teamPath: string[];
  runId: string;
  runtimeKind: "AGENT" | "AGENT_TEAM_MEMBER";
};

export type ApplicationAgentTeamBinding = ApplicationAgentBindingFields & {
  runtime: {
    subject: "TEAM_RUN";
    runId: string;
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
  | { kind: "AGENT_TEAM_MEMBER"; memberRouteKey: string };

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
  runId: string;
  memberRouteKey: string;
  memberName: string | null;
  displayName: string | null;
  runtimeKind: ApplicationExecutionProducerRuntimeKind;
  teamPath: string[];
};
