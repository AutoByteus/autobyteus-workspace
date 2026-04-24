import type { ApplicationResourceSlotDeclaration } from "./manifests.js";

export type ApplicationRuntimeResourceKind = "AGENT" | "AGENT_TEAM";
export type ApplicationRuntimeResourceOwner = "bundle" | "shared";

export type ApplicationRuntimeResourceRef =
  | {
      owner: "bundle";
      kind: "AGENT";
      localId: string;
    }
  | {
      owner: "bundle";
      kind: "AGENT_TEAM";
      localId: string;
    }
  | {
      owner: "shared";
      kind: "AGENT";
      definitionId: string;
    }
  | {
      owner: "shared";
      kind: "AGENT_TEAM";
      definitionId: string;
    };

export type ApplicationRuntimeResourceSummary = {
  owner: ApplicationRuntimeResourceOwner;
  kind: ApplicationRuntimeResourceKind;
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

export type ApplicationConfiguredResource = {
  slotKey: string;
  resourceRef: ApplicationRuntimeResourceRef;
  launchProfile?: ApplicationConfiguredLaunchProfile | null;
};

export type ApplicationResourceConfigurationIssueCode =
  | "INVALID_RESOURCE_SELECTION"
  | "PROFILE_KIND_MISMATCH"
  | "PROFILE_UNSUPPORTED_BY_SLOT"
  | "TEAM_TOPOLOGY_CHANGED"
  | "PROFILE_MALFORMED";

export type ApplicationResourceConfigurationIssue = {
  severity: "blocking";
  code: ApplicationResourceConfigurationIssueCode;
  message: string;
  staleMembers?: Array<{
    memberRouteKey: string;
    memberName: string;
    agentDefinitionId: string;
    reason: "MISSING_FROM_TEAM" | "AGENT_CHANGED";
    currentAgentDefinitionId?: string | null;
  }> | null;
};

export type ApplicationResourceConfigurationStatus =
  | "READY"
  | "NOT_CONFIGURED"
  | "INVALID_SAVED_CONFIGURATION";

export type ApplicationResourceConfigurationView = {
  slot: ApplicationResourceSlotDeclaration;
  status: ApplicationResourceConfigurationStatus;
  configuration: ApplicationConfiguredResource | null;
  invalidSavedConfiguration: ApplicationConfiguredResource | null;
  issue: ApplicationResourceConfigurationIssue | null;
  updatedAt: string | null;
};
