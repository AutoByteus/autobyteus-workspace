import type { ApplicationExecutionResourceSlotDeclaration } from "./manifests.js";

export type ApplicationExecutionResourceKind = "AGENT" | "AGENT_TEAM";
export type ApplicationExecutionResourceSource = "bundle" | "shared";

export type ApplicationExecutionResourceRef =
  | {
      source: "bundle";
      kind: "AGENT";
      localId: string;
    }
  | {
      source: "bundle";
      kind: "AGENT_TEAM";
      localId: string;
    }
  | {
      source: "shared";
      kind: "AGENT";
      definitionId: string;
    }
  | {
      source: "shared";
      kind: "AGENT_TEAM";
      definitionId: string;
    };

export type ApplicationExecutionResourceSummary = {
  source: ApplicationExecutionResourceSource;
  kind: ApplicationExecutionResourceKind;
  localId: string | null;
  definitionId: string;
  name: string;
  applicationId: string | null;
};

export type ApplicationConfiguredAgentLaunchProfile = {
  kind: "AGENT";
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  workspaceRootPath?: string | null;
};

export type ApplicationConfiguredTeamLaunchDefaults = {
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  workspaceRootPath?: string | null;
};

export type ApplicationConfiguredTeamMemberProfile = {
  memberRouteKey: string;
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
};

export type ApplicationConfiguredTeamLaunchProfile = {
  kind: "AGENT_TEAM";
  defaults: ApplicationConfiguredTeamLaunchDefaults | null;
  memberProfiles: ApplicationConfiguredTeamMemberProfile[];
};

export type ApplicationConfiguredLaunchProfile =
  | ApplicationConfiguredAgentLaunchProfile
  | ApplicationConfiguredTeamLaunchProfile;

export type ApplicationConfiguredExecutionResource = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  launchProfile?: ApplicationConfiguredLaunchProfile | null;
};

export type ApplicationExecutionResourceConfigurationIssueCode =
  | "INVALID_RESOURCE_SELECTION"
  | "PROFILE_KIND_MISMATCH"
  | "PROFILE_UNSUPPORTED_BY_SLOT"
  | "TEAM_TOPOLOGY_CHANGED"
  | "PROFILE_MALFORMED";

export type ApplicationExecutionResourceConfigurationIssue = {
  severity: "blocking";
  code: ApplicationExecutionResourceConfigurationIssueCode;
  message: string;
  staleMembers?: Array<{
    memberRouteKey: string;
    memberName: string;
    agentDefinitionId: string;
    reason: "MISSING_FROM_TEAM" | "AGENT_CHANGED";
    currentAgentDefinitionId?: string | null;
  }> | null;
};

export type ApplicationExecutionResourceConfigurationStatus =
  | "READY"
  | "NOT_CONFIGURED"
  | "INVALID_SAVED_CONFIGURATION";

export type ApplicationExecutionResourceConfigurationView = {
  slot: ApplicationExecutionResourceSlotDeclaration;
  status: ApplicationExecutionResourceConfigurationStatus;
  configuration: ApplicationConfiguredExecutionResource | null;
  invalidSavedConfiguration: ApplicationConfiguredExecutionResource | null;
  issue: ApplicationExecutionResourceConfigurationIssue | null;
  updatedAt: string | null;
};
