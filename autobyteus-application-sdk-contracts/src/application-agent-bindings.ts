import type { ApplicationExecutionResourceRef } from "./execution-resources.js";
import type { ApplicationAgentMemberAddress } from "./application-agent-member-address.js";

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

export type ApplicationAgentTeamBindingMember = Readonly<{
  memberAddress: ApplicationAgentMemberAddress;
  displayName: string;
  agentRunId: string;
}>;

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

export type ApplicationAgentTargetAddress = Readonly<{
  bindingId: string;
  memberAddress: ApplicationAgentMemberAddress | null;
}>;

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

export type ApplicationExecutionProducer = Readonly<{
  agentRunId: string;
  displayName: string | null;
}>;

export type ApplicationExecutionContext = Readonly<{
  applicationId: string;
  bindingId: string;
  producer: ApplicationExecutionProducer;
}>;
