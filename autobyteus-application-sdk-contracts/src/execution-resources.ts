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
  memberRouteKey: string;
  memberName: string;
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

export type ApplicationLaunchValueSource =
  | { kind: "HOST_MEMBER_OVERRIDE"; memberRouteKey: string }
  | { kind: "HOST_SLOT_OVERRIDE" }
  | { kind: "PACKAGE_TEAM_DEFAULT"; teamDefinitionId: string }
  | { kind: "PACKAGE_AGENT_DEFAULT"; agentDefinitionId: string };

export type ApplicationEffectiveLeafLaunchProfile = {
  memberRouteKey: string | null;
  memberName: string;
  agentDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  provenance: {
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  };
};

export type ApplicationEffectiveLaunchConfiguration = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  resourceKind: ApplicationExecutionResourceKind;
  leaves: ApplicationEffectiveLeafLaunchProfile[];
};

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
  | "RUNTIME_AUTHENTICATION_UNAVAILABLE";

export type ApplicationLaunchIssue = {
  severity: "blocking";
  scope: ApplicationLaunchIssueScope;
  code: ApplicationLaunchIssueCode;
  slotKey: string;
  message: string;
  memberRouteKey?: string | null;
  staleMembers?: Array<{
    memberRouteKey: string;
    memberName: string;
    agentDefinitionId: string;
    reason: "MISSING_FROM_TEAM" | "AGENT_CHANGED";
    currentAgentDefinitionId?: string | null;
  }> | null;
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
  packageBaseline: ApplicationEffectiveLaunchConfiguration | null;
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
