import type { ApplicationExecutionResourceSlotDeclaration } from "./manifests.js";

export type ApplicationExecutionResourceKind = "AGENT" | "AGENT_TEAM";
export type ApplicationExecutionResourceSource = "bundle" | "shared";

export type ApplicationExecutionResourceRef =
  | { source: "bundle"; kind: "AGENT"; localId: string }
  | { source: "bundle"; kind: "AGENT_TEAM"; localId: string }
  | { source: "shared"; kind: "AGENT"; definitionId: string }
  | { source: "shared"; kind: "AGENT_TEAM"; definitionId: string };

export type ApplicationExecutionResourceSummary = {
  source: ApplicationExecutionResourceSource;
  kind: ApplicationExecutionResourceKind;
  localId: string | null;
  definitionId: string;
  name: string;
  applicationId: string | null;
};

export type ApplicationAgentLaunchOverride = {
  kind: "AGENT";
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  llmConfig?: Record<string, unknown> | null;
  workspaceRootPath?: string | null;
};

export type ApplicationTeamLaunchOverrideDefaults = {
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  llmConfig?: Record<string, unknown> | null;
  workspaceRootPath?: string | null;
};

export type ApplicationTeamMemberLaunchOverride = {
  memberAddress: string;
  displayName: string;
  agentDefinitionId: string;
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  llmConfig?: Record<string, unknown> | null;
};

export type ApplicationTeamLaunchOverride = {
  kind: "AGENT_TEAM";
  defaults: ApplicationTeamLaunchOverrideDefaults | null;
  memberProfiles: ApplicationTeamMemberLaunchOverride[];
};

export type ApplicationLaunchOverride =
  | ApplicationAgentLaunchOverride
  | ApplicationTeamLaunchOverride;

export type ApplicationExecutionResourceOverride = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  launchOverride: ApplicationLaunchOverride | null;
};

export type ApplicationLaunchDefinitionValueSource =
  | { kind: "PACKAGE_TEAM_DEFAULT"; teamDefinitionId: string }
  | { kind: "PACKAGE_AGENT_DEFAULT"; agentDefinitionId: string }
  | { kind: "SELECTED_RESOURCE_TEAM_DEFAULT"; teamDefinitionId: string }
  | { kind: "SELECTED_RESOURCE_AGENT_DEFAULT"; agentDefinitionId: string };

export type ApplicationLaunchValueSource =
  | ApplicationLaunchDefinitionValueSource
  | { kind: "HOST_MEMBER_OVERRIDE"; memberAddress: string }
  | { kind: "HOST_SLOT_OVERRIDE" };

export type ApplicationResolvedLaunchBaselineLeaf = {
  memberAddress: string | null;
  displayName: string;
  agentDefinitionId: string;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  llmConfig: Record<string, unknown> | null;
  provenance: {
    runtimeKind: ApplicationLaunchDefinitionValueSource | null;
    llmModelIdentifier: ApplicationLaunchDefinitionValueSource | null;
    llmConfig: ApplicationLaunchDefinitionValueSource | null;
  };
};

export type ApplicationResolvedTeamLaunchBaselineScope = Readonly<{
  teamAddress: string;
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  llmConfig: Record<string, unknown> | null;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchDefinitionValueSource | null;
    llmModelIdentifier: ApplicationLaunchDefinitionValueSource | null;
    llmConfig: ApplicationLaunchDefinitionValueSource | null;
  }>;
}>;

type ApplicationResolvedResourceLaunchBaselineFields = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  leaves: ApplicationResolvedLaunchBaselineLeaf[];
};

export type ApplicationResolvedResourceLaunchBaseline =
  | (ApplicationResolvedResourceLaunchBaselineFields & {
      resourceKind: "AGENT";
    })
  | (ApplicationResolvedResourceLaunchBaselineFields & {
      resourceKind: "AGENT_TEAM";
      teamScopes: ApplicationResolvedTeamLaunchBaselineScope[];
    });

export type ApplicationEffectiveLeafLaunchProfile = {
  memberAddress: string | null;
  displayName: string;
  agentDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string;
  provenance: {
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  };
};

export type ApplicationEffectiveTeamLaunchProfile = Readonly<{
  teamAddress: string;
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  }>;
}>;

type ApplicationEffectiveLaunchConfigurationFields = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  leaves: ApplicationEffectiveLeafLaunchProfile[];
};

export type ApplicationEffectiveLaunchConfiguration =
  | (ApplicationEffectiveLaunchConfigurationFields & {
      resourceKind: "AGENT";
    })
  | (ApplicationEffectiveLaunchConfigurationFields & {
      resourceKind: "AGENT_TEAM";
      teamScopes: ApplicationEffectiveTeamLaunchProfile[];
    });

export type ApplicationLaunchIssueScope =
  | "PACKAGE"
  | "HOST_OVERRIDE"
  | "HOST_CAPABILITY";

export type ApplicationLaunchIssueCode =
  | "PACKAGE_DEFAULT_MISSING"
  | "PACKAGE_RESOURCE_UNAVAILABLE"
  | "PACKAGE_RESOURCE_NOT_ALLOWED"
  | "PACKAGE_DEFAULT_INCOMPLETE"
  | "PACKAGE_TEAM_TOPOLOGY_INVALID"
  | "PACKAGE_FORBIDDEN_HOST_FIELD"
  | "SAVED_RESOURCE_UNAVAILABLE"
  | "SAVED_RESOURCE_NOT_ALLOWED"
  | "SAVED_OVERRIDE_MALFORMED"
  | "SAVED_MEMBER_TOPOLOGY_STALE"
  | "RUNTIME_UNAVAILABLE"
  | "MODEL_UNAVAILABLE"
  | "CURRENT_MODEL_SELECTION_REQUIRED"
  | "RUNTIME_AUTHENTICATION_UNAVAILABLE";

export type ApplicationLaunchIssue = {
  severity: "blocking";
  scope: ApplicationLaunchIssueScope;
  code: ApplicationLaunchIssueCode;
  slotKey: string;
  message: string;
  memberAddress?: string | null;
  staleMembers?: Array<{
    memberAddress: string;
    displayName: string;
    agentDefinitionId: string;
    reason: "MISSING_FROM_TEAM" | "AGENT_CHANGED";
    currentAgentDefinitionId?: string | null;
  }> | null;
};

export type ApplicationLaunchSelectionIssue = {
  scope: "SELECTION";
  code:
    | "SELECTION_UNAVAILABLE"
    | "SELECTION_NOT_ALLOWED"
    | "SELECTION_TOPOLOGY_INVALID";
  applicationId: string;
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  message: string;
};

export type ApplicationLaunchSelectionPreview =
  | {
      status: "RESOLVED";
      applicationId: string;
      slotKey: string;
      executionResourceRef: ApplicationExecutionResourceRef;
      selectedResourceBaseline: ApplicationResolvedResourceLaunchBaseline;
      issues: [];
    }
  | {
      status: "INVALID_SELECTION";
      applicationId: string;
      slotKey: string;
      executionResourceRef: ApplicationExecutionResourceRef;
      selectedResourceBaseline: null;
      issues: ApplicationLaunchSelectionIssue[];
    };

export type ApplicationLaunchReadiness =
  | { status: "RUNNABLE"; issues: [] }
  | { status: "INVALID_PACKAGE"; issues: ApplicationLaunchIssue[] }
  | { status: "HOST_REQUIREMENT_MISSING"; issues: ApplicationLaunchIssue[] };

export type ApplicationHostOverrideState =
  | "ABSENT"
  | "VALID"
  | "INVALID"
  | "NOT_EVALUATED";

export type ApplicationLaunchSlotView = {
  slot: ApplicationExecutionResourceSlotDeclaration;
  packageBaseline: ApplicationResolvedResourceLaunchBaseline | null;
  selectedResourceBaseline: ApplicationResolvedResourceLaunchBaseline | null;
  savedOverride: ApplicationExecutionResourceOverride | null;
  savedOverrideState: ApplicationHostOverrideState;
  effectiveConfiguration: ApplicationEffectiveLaunchConfiguration | null;
  issues: ApplicationLaunchIssue[];
  canResetToPackageDefaults: boolean;
  updatedAt: string | null;
};

export type ApplicationLaunchConfigurationView = {
  applicationId: string;
  slots: ApplicationLaunchSlotView[];
  readiness: ApplicationLaunchReadiness;
};
