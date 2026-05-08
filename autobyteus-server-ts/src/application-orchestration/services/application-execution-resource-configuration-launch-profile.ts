import type {
  ApplicationConfiguredAgentLaunchProfile,
  ApplicationConfiguredLaunchProfile,
  ApplicationConfiguredExecutionResource,
  ApplicationConfiguredTeamLaunchDefaults,
  ApplicationConfiguredTeamLaunchProfile,
  ApplicationConfiguredTeamMemberProfile,
  ApplicationExecutionResourceConfigurationIssue,
  ApplicationExecutionResourceConfigurationIssueCode,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationExecutionResourceKind,
  ApplicationExecutionResourceRef,
  ApplicationSupportedAgentLaunchConfigDeclaration,
  ApplicationSupportedTeamLaunchConfigDeclaration,
  ApplicationSupportedTeamMemberOverrideDeclaration,
} from "@autobyteus/application-sdk-contracts";
import type { TeamLeafAgentMember } from "../../agent-team-execution/services/team-definition-traversal-service.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import type { LegacyApplicationConfiguredLaunchDefaults } from "../stores/application-execution-resource-configuration-store.js";

const AGENT_LAUNCH_PROFILE_KEYS = new Set(["kind", "llmModelIdentifier", "runtimeKind", "workspaceRootPath"]);
const TEAM_LAUNCH_PROFILE_KEYS = new Set(["kind", "defaults", "memberProfiles"]);
const TEAM_LAUNCH_DEFAULT_KEYS = new Set(["llmModelIdentifier", "runtimeKind", "workspaceRootPath"]);
const TEAM_MEMBER_PROFILE_KEYS = new Set(["memberRouteKey", "memberName", "agentDefinitionId", "llmModelIdentifier", "runtimeKind"]);

export class LaunchProfileValidationError extends Error {
  constructor(
    readonly issueCode: ApplicationExecutionResourceConfigurationIssueCode,
    message: string,
    readonly staleMembers: ApplicationExecutionResourceConfigurationIssue["staleMembers"] = null,
  ) {
    super(message);
    this.name = "LaunchProfileValidationError";
  }
}

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `${fieldName} is required in the saved application launch profile.`,
    );
  }
  return normalized;
};

export const buildIssue = (
  code: ApplicationExecutionResourceConfigurationIssueCode,
  message: string,
  staleMembers: ApplicationExecutionResourceConfigurationIssue["staleMembers"] = null,
): ApplicationExecutionResourceConfigurationIssue => ({
  severity: "blocking",
  code,
  message,
  ...(staleMembers ? { staleMembers } : {}),
});

export const buildConfiguredExecutionResource = (
  slotKey: string,
  executionResourceRef: ApplicationExecutionResourceRef,
  launchProfile: ApplicationConfiguredLaunchProfile | null,
): ApplicationConfiguredExecutionResource => ({
  slotKey,
  executionResourceRef: structuredClone(executionResourceRef),
  ...(launchProfile ? { launchProfile: structuredClone(launchProfile) } : { launchProfile: null }),
});

const normalizeLegacyLaunchDefaults = (
  value: LegacyApplicationConfiguredLaunchDefaults | null | undefined,
): LegacyApplicationConfiguredLaunchDefaults | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const llmModelIdentifier = normalizeOptionalString(value.llmModelIdentifier);
  const runtimeKind = normalizeOptionalString(value.runtimeKind);
  const workspaceRootPath = normalizeOptionalString(value.workspaceRootPath);
  if (!llmModelIdentifier && !runtimeKind && !workspaceRootPath) {
    return null;
  }

  return {
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
  };
};

const getSupportedLaunchConfig = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  resourceKind: ApplicationExecutionResourceKind,
): ApplicationSupportedAgentLaunchConfigDeclaration | ApplicationSupportedTeamLaunchConfigDeclaration | null => {
  if (resourceKind === "AGENT") {
    return slot.supportedLaunchConfig?.AGENT ?? null;
  }
  return slot.supportedLaunchConfig?.AGENT_TEAM ?? null;
};

const assertNoUnknownKeys = (
  record: Record<string, unknown>,
  allowedKeys: Set<string>,
  fieldName: string,
): void => {
  const unknownKeys = Object.keys(record).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `${fieldName} contains unsupported key '${unknownKeys[0]}'.`,
    );
  }
};

const assertFieldSupported = (
  supported: boolean,
  fieldName: string,
  slotKey: string,
): void => {
  if (!supported) {
    throw new LaunchProfileValidationError(
      "PROFILE_UNSUPPORTED_BY_SLOT",
      `Application execution resource slot '${slotKey}' does not support ${fieldName}.`,
    );
  }
};

const normalizeAgentLaunchProfile = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  launchProfile: unknown,
): ApplicationConfiguredAgentLaunchProfile | null => {
  if (!launchProfile || typeof launchProfile !== "object" || Array.isArray(launchProfile)) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `Application execution resource slot '${slot.slotKey}' has a malformed saved agent launch profile.`,
    );
  }

  const declaration = getSupportedLaunchConfig(slot, "AGENT") as ApplicationSupportedAgentLaunchConfigDeclaration | null;
  if (!declaration) {
    throw new LaunchProfileValidationError(
      "PROFILE_UNSUPPORTED_BY_SLOT",
      `Application execution resource slot '${slot.slotKey}' no longer supports agent launch-profile settings.`,
    );
  }

  const record = structuredClone(launchProfile) as Record<string, unknown>;
  assertNoUnknownKeys(record, AGENT_LAUNCH_PROFILE_KEYS, "launchProfile");
  const kind = normalizeRequiredString(record.kind, "launchProfile.kind");
  if (kind !== "AGENT") {
    throw new LaunchProfileValidationError(
      "PROFILE_KIND_MISMATCH",
      `Saved launch profile kind '${kind}' does not match selected resource kind 'AGENT'.`,
    );
  }

  const llmModelIdentifier = normalizeOptionalString(record.llmModelIdentifier);
  const runtimeKind = normalizeOptionalString(record.runtimeKind);
  const workspaceRootPath = normalizeOptionalString(record.workspaceRootPath);

  if (llmModelIdentifier) {
    assertFieldSupported(declaration.llmModelIdentifier === true, "launchProfile.llmModelIdentifier", slot.slotKey);
  }
  if (runtimeKind) {
    assertFieldSupported(declaration.runtimeKind === true, "launchProfile.runtimeKind", slot.slotKey);
  }
  if (workspaceRootPath) {
    assertFieldSupported(declaration.workspaceRootPath === true, "launchProfile.workspaceRootPath", slot.slotKey);
  }

  if (!llmModelIdentifier && !runtimeKind && !workspaceRootPath) {
    return null;
  }

  return {
    kind: "AGENT",
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
  };
};

const normalizeTeamLaunchDefaults = (
  value: unknown,
  slot: ApplicationExecutionResourceSlotDeclaration,
  declaration: ApplicationSupportedTeamLaunchConfigDeclaration,
): ApplicationConfiguredTeamLaunchDefaults | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `Application execution resource slot '${slot.slotKey}' has malformed team launch defaults.`,
    );
  }

  const record = structuredClone(value) as Record<string, unknown>;
  assertNoUnknownKeys(record, TEAM_LAUNCH_DEFAULT_KEYS, "launchProfile.defaults");

  const llmModelIdentifier = normalizeOptionalString(record.llmModelIdentifier);
  const runtimeKind = normalizeOptionalString(record.runtimeKind);
  const workspaceRootPath = normalizeOptionalString(record.workspaceRootPath);

  if (llmModelIdentifier) {
    assertFieldSupported(declaration.llmModelIdentifier === true, "launchProfile.defaults.llmModelIdentifier", slot.slotKey);
  }
  if (runtimeKind) {
    assertFieldSupported(declaration.runtimeKind === true, "launchProfile.defaults.runtimeKind", slot.slotKey);
  }
  if (workspaceRootPath) {
    assertFieldSupported(declaration.workspaceRootPath === true, "launchProfile.defaults.workspaceRootPath", slot.slotKey);
  }

  if (!llmModelIdentifier && !runtimeKind && !workspaceRootPath) {
    return null;
  }

  return {
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
  };
};

const normalizeTeamMemberProfile = (
  value: unknown,
  slot: ApplicationExecutionResourceSlotDeclaration,
  declaration: ApplicationSupportedTeamMemberOverrideDeclaration | null,
): ApplicationConfiguredTeamMemberProfile => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `Application execution resource slot '${slot.slotKey}' has a malformed saved team member profile.`,
    );
  }

  const record = structuredClone(value) as Record<string, unknown>;
  assertNoUnknownKeys(record, TEAM_MEMBER_PROFILE_KEYS, "launchProfile.memberProfiles[]");

  const memberRouteKey = normalizeMemberRouteKey(
    normalizeRequiredString(record.memberRouteKey, "launchProfile.memberProfiles[].memberRouteKey"),
  );
  const memberName = normalizeRequiredString(record.memberName, "launchProfile.memberProfiles[].memberName");
  const agentDefinitionId = normalizeRequiredString(
    record.agentDefinitionId,
    "launchProfile.memberProfiles[].agentDefinitionId",
  );
  const llmModelIdentifier = normalizeOptionalString(record.llmModelIdentifier);
  const runtimeKind = normalizeOptionalString(record.runtimeKind);

  if (llmModelIdentifier) {
    assertFieldSupported(
      declaration?.llmModelIdentifier === true,
      "launchProfile.memberProfiles[].llmModelIdentifier",
      slot.slotKey,
    );
  }
  if (runtimeKind) {
    assertFieldSupported(
      declaration?.runtimeKind === true,
      "launchProfile.memberProfiles[].runtimeKind",
      slot.slotKey,
    );
  }

  return {
    memberRouteKey,
    memberName,
    agentDefinitionId,
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
  };
};

const normalizeTeamLaunchProfile = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  launchProfile: unknown,
  currentTeamMembers: TeamLeafAgentMember[],
): ApplicationConfiguredTeamLaunchProfile => {
  if (!launchProfile || typeof launchProfile !== "object" || Array.isArray(launchProfile)) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `Application execution resource slot '${slot.slotKey}' has a malformed saved team launch profile.`,
    );
  }

  const declaration = getSupportedLaunchConfig(slot, "AGENT_TEAM") as ApplicationSupportedTeamLaunchConfigDeclaration | null;
  if (!declaration) {
    throw new LaunchProfileValidationError(
      "PROFILE_UNSUPPORTED_BY_SLOT",
      `Application execution resource slot '${slot.slotKey}' no longer supports team launch-profile settings.`,
    );
  }

  const record = structuredClone(launchProfile) as Record<string, unknown>;
  assertNoUnknownKeys(record, TEAM_LAUNCH_PROFILE_KEYS, "launchProfile");
  const kind = normalizeRequiredString(record.kind, "launchProfile.kind");
  if (kind !== "AGENT_TEAM") {
    throw new LaunchProfileValidationError(
      "PROFILE_KIND_MISMATCH",
      `Saved launch profile kind '${kind}' does not match selected resource kind 'AGENT_TEAM'.`,
    );
  }

  if (!Array.isArray(record.memberProfiles)) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `Application execution resource slot '${slot.slotKey}' must persist team memberProfiles as an array.`,
    );
  }

  const memberOverrideDeclaration = declaration.memberOverrides ?? null;
  const memberProfiles = record.memberProfiles.map((memberProfile) =>
    normalizeTeamMemberProfile(memberProfile, slot, memberOverrideDeclaration),
  );

  const seenRouteKeys = new Set<string>();
  for (const memberProfile of memberProfiles) {
    if (seenRouteKeys.has(memberProfile.memberRouteKey)) {
      throw new LaunchProfileValidationError(
        "PROFILE_MALFORMED",
        `Application execution resource slot '${slot.slotKey}' has duplicate team memberRouteKey '${memberProfile.memberRouteKey}'.`,
      );
    }
    seenRouteKeys.add(memberProfile.memberRouteKey);
  }

  const currentMemberByRouteKey = new Map(
    currentTeamMembers.map((member) => [member.memberRouteKey, member]),
  );
  const staleMembers: NonNullable<ApplicationExecutionResourceConfigurationIssue["staleMembers"]> = [];
  for (const memberProfile of memberProfiles) {
    const currentMember = currentMemberByRouteKey.get(memberProfile.memberRouteKey);
    if (!currentMember) {
      staleMembers.push({
        memberRouteKey: memberProfile.memberRouteKey,
        memberName: memberProfile.memberName,
        agentDefinitionId: memberProfile.agentDefinitionId,
        reason: "MISSING_FROM_TEAM",
      });
      continue;
    }
    if (currentMember.agentDefinitionId !== memberProfile.agentDefinitionId) {
      staleMembers.push({
        memberRouteKey: memberProfile.memberRouteKey,
        memberName: memberProfile.memberName,
        agentDefinitionId: memberProfile.agentDefinitionId,
        reason: "AGENT_CHANGED",
        currentAgentDefinitionId: currentMember.agentDefinitionId,
      });
    }
  }

  const missingCurrentMembers = currentTeamMembers.some((member) => !seenRouteKeys.has(member.memberRouteKey));
  if (staleMembers.length > 0 || missingCurrentMembers || memberProfiles.length !== currentTeamMembers.length) {
    throw new LaunchProfileValidationError(
      "TEAM_TOPOLOGY_CHANGED",
      `Application execution resource slot '${slot.slotKey}' has a saved team launch profile that no longer matches the current team members. Repair and save the team setup again.`,
      staleMembers.length > 0 ? staleMembers : null,
    );
  }

  const defaults = normalizeTeamLaunchDefaults(record.defaults ?? null, slot, declaration);
  const defaultLlmModelIdentifier = defaults?.llmModelIdentifier ?? null;
  for (const memberProfile of memberProfiles) {
    if (memberProfile.llmModelIdentifier ?? defaultLlmModelIdentifier) {
      continue;
    }
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      `Application execution resource slot '${slot.slotKey}' requires an effective llmModelIdentifier for team member '${memberProfile.memberName}'. Add a team default or a member override before saving.`,
    );
  }

  return {
    kind: "AGENT_TEAM",
    defaults,
    memberProfiles: memberProfiles.sort((left, right) => left.memberRouteKey.localeCompare(right.memberRouteKey)),
  };
};

export const normalizeConfiguredLaunchProfile = (input: {
  slot: ApplicationExecutionResourceSlotDeclaration;
  resourceKind: ApplicationExecutionResourceKind;
  launchProfile: ApplicationConfiguredLaunchProfile | null;
  currentTeamMembers?: TeamLeafAgentMember[];
}): ApplicationConfiguredLaunchProfile | null => {
  if (!input.launchProfile) {
    return null;
  }
  if (input.launchProfile.kind !== input.resourceKind) {
    throw new LaunchProfileValidationError(
      "PROFILE_KIND_MISMATCH",
      `Saved launch profile kind '${input.launchProfile.kind}' does not match selected resource kind '${input.resourceKind}'.`,
    );
  }
  if (input.resourceKind === "AGENT") {
    return normalizeAgentLaunchProfile(input.slot, input.launchProfile);
  }
  if (!input.currentTeamMembers) {
    throw new LaunchProfileValidationError(
      "PROFILE_MALFORMED",
      "Current team members are required to validate a saved team launch profile.",
    );
  }
  return normalizeTeamLaunchProfile(input.slot, input.launchProfile, input.currentTeamMembers);
};

export const buildLegacyLaunchProfile = (input: {
  executionResourceRef: ApplicationExecutionResourceRef;
  launchDefaults: LegacyApplicationConfiguredLaunchDefaults | null;
  currentTeamMembers?: TeamLeafAgentMember[];
}): ApplicationConfiguredLaunchProfile | null => {
  const launchDefaults = normalizeLegacyLaunchDefaults(input.launchDefaults);
  if (input.executionResourceRef.kind === "AGENT") {
    if (!launchDefaults) {
      return null;
    }
    return {
      kind: "AGENT",
      ...(launchDefaults.llmModelIdentifier ? { llmModelIdentifier: launchDefaults.llmModelIdentifier } : {}),
      ...(launchDefaults.runtimeKind ? { runtimeKind: launchDefaults.runtimeKind } : {}),
      ...(launchDefaults.workspaceRootPath ? { workspaceRootPath: launchDefaults.workspaceRootPath } : {}),
    };
  }

  return {
    kind: "AGENT_TEAM",
    defaults: launchDefaults
      ? {
          ...(launchDefaults.llmModelIdentifier ? { llmModelIdentifier: launchDefaults.llmModelIdentifier } : {}),
          ...(launchDefaults.runtimeKind ? { runtimeKind: launchDefaults.runtimeKind } : {}),
          ...(launchDefaults.workspaceRootPath ? { workspaceRootPath: launchDefaults.workspaceRootPath } : {}),
        }
      : null,
    memberProfiles: (input.currentTeamMembers ?? []).map((member) => ({
      memberRouteKey: member.memberRouteKey,
      memberName: member.memberName,
      agentDefinitionId: member.agentDefinitionId,
    })),
  };
};
