import type {
  ApplicationAgentLaunchOverride,
  ApplicationExecutionResourceKind,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationLaunchIssue,
  ApplicationLaunchOverride,
  ApplicationSupportedAgentLaunchConfigDeclaration,
  ApplicationSupportedTeamLaunchConfigDeclaration,
  ApplicationSupportedTeamMemberOverrideDeclaration,
  ApplicationTeamLaunchOverride,
  ApplicationTeamLaunchOverrideDefaults,
  ApplicationTeamMemberLaunchOverride,
} from "@autobyteus/application-sdk-contracts";
import { normalizeMemberRouteKey } from "../../agent-team-execution/domain/team-run-member-identity.js";
import type {
  StoredLegacyApplicationLaunchDefaults,
} from "../../application-orchestration/stores/application-launch-override-store.js";

type TeamLeafIdentity = {
  memberRouteKey: string;
  memberName: string;
  agentDefinitionId: string;
};

const AGENT_KEYS = new Set([
  "kind", "llmModelIdentifier", "runtimeKind", "llmConfig", "workspaceRootPath",
]);
const TEAM_KEYS = new Set(["kind", "defaults", "memberProfiles"]);
const TEAM_DEFAULT_KEYS = new Set([
  "llmModelIdentifier", "runtimeKind", "llmConfig", "workspaceRootPath",
]);
const TEAM_MEMBER_KEYS = new Set([
  "memberRouteKey", "memberName", "agentDefinitionId",
  "llmModelIdentifier", "runtimeKind", "llmConfig",
]);

export class ApplicationLaunchOverrideValidationError extends Error {
  constructor(
    readonly code: "SAVED_OVERRIDE_MALFORMED" | "SAVED_MEMBER_TOPOLOGY_STALE",
    message: string,
    readonly staleMembers: ApplicationLaunchIssue["staleMembers"] = null,
  ) {
    super(message);
    this.name = "ApplicationLaunchOverrideValidationError";
  }
}

const asRecord = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      `${fieldName} must be an object.`,
    );
  }
  return structuredClone(value) as Record<string, unknown>;
};

const assertKnownKeys = (
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  fieldName: string,
): void => {
  const unknown = Object.keys(record).find((key) => !allowed.has(key));
  if (unknown) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      `${fieldName} contains unsupported key '${unknown}'.`,
    );
  }
};

const requiredString = (value: unknown, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      `${fieldName} is required.`,
    );
  }
  return normalized;
};

const optionalString = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

const optionalLlmConfig = (
  record: Record<string, unknown>,
  fieldName: string,
): { present: boolean; value: Record<string, unknown> | null } => {
  if (!Object.prototype.hasOwnProperty.call(record, "llmConfig")) {
    return { present: false, value: null };
  }
  if (record.llmConfig === null) {
    return { present: true, value: null };
  }
  return { present: true, value: asRecord(record.llmConfig, `${fieldName}.llmConfig`) };
};

const assertSupported = (
  condition: boolean,
  fieldName: string,
  slotKey: string,
): void => {
  if (!condition) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      `Application slot '${slotKey}' does not support ${fieldName}.`,
    );
  }
};

type LaunchOverrideFields = {
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  llmConfig?: Record<string, unknown> | null;
  workspaceRootPath?: string | null;
};

const normalizeFields = (input: {
  record: Record<string, unknown>;
  declaration: ApplicationSupportedAgentLaunchConfigDeclaration;
  slotKey: string;
  fieldName: string;
  includeWorkspace: boolean;
}): LaunchOverrideFields => {
  const llmModelIdentifier = optionalString(input.record.llmModelIdentifier);
  const runtimeKind = optionalString(input.record.runtimeKind);
  const workspaceRootPath = input.includeWorkspace
    ? optionalString(input.record.workspaceRootPath)
    : null;
  const llmConfig = optionalLlmConfig(input.record, input.fieldName);
  if (llmModelIdentifier) {
    assertSupported(input.declaration.llmModelIdentifier === true, `${input.fieldName}.llmModelIdentifier`, input.slotKey);
  }
  if (runtimeKind) {
    assertSupported(input.declaration.runtimeKind === true, `${input.fieldName}.runtimeKind`, input.slotKey);
  }
  if (llmConfig.present) {
    assertSupported(input.declaration.llmConfig === true, `${input.fieldName}.llmConfig`, input.slotKey);
  }
  if (workspaceRootPath) {
    assertSupported(input.declaration.workspaceRootPath === true, `${input.fieldName}.workspaceRootPath`, input.slotKey);
  }
  return {
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(llmConfig.present ? { llmConfig: llmConfig.value } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
  };
};

const normalizeAgentOverride = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  value: unknown,
): ApplicationAgentLaunchOverride | null => {
  const declaration = slot.supportedLaunchConfig?.AGENT ?? null;
  if (!declaration) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      `Application slot '${slot.slotKey}' does not support agent launch overrides.`,
    );
  }
  const record = asRecord(value, "launchOverride");
  assertKnownKeys(record, AGENT_KEYS, "launchOverride");
  if (requiredString(record.kind, "launchOverride.kind") !== "AGENT") {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "Saved launch override kind does not match the selected AGENT resource.",
    );
  }
  const fields = normalizeFields({
    record,
    declaration,
    slotKey: slot.slotKey,
    fieldName: "launchOverride",
    includeWorkspace: true,
  });
  return Object.keys(fields).length === 0 ? null : { kind: "AGENT", ...fields };
};

const normalizeTeamDefaults = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  declaration: ApplicationSupportedTeamLaunchConfigDeclaration,
  value: unknown,
): ApplicationTeamLaunchOverrideDefaults | null => {
  if (value === undefined || value === null) return null;
  const record = asRecord(value, "launchOverride.defaults");
  assertKnownKeys(record, TEAM_DEFAULT_KEYS, "launchOverride.defaults");
  const fields = normalizeFields({
    record,
    declaration,
    slotKey: slot.slotKey,
    fieldName: "launchOverride.defaults",
    includeWorkspace: true,
  });
  return Object.keys(fields).length === 0 ? null : fields;
};

const normalizeMemberOverride = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  declaration: ApplicationSupportedTeamMemberOverrideDeclaration | null,
  value: unknown,
): ApplicationTeamMemberLaunchOverride => {
  const record = asRecord(value, "launchOverride.memberProfiles[]");
  assertKnownKeys(record, TEAM_MEMBER_KEYS, "launchOverride.memberProfiles[]");
  const fieldDeclaration: ApplicationSupportedAgentLaunchConfigDeclaration = {
    llmModelIdentifier: declaration?.llmModelIdentifier,
    runtimeKind: declaration?.runtimeKind,
    llmConfig: declaration?.llmConfig,
  };
  return {
    memberRouteKey: normalizeMemberRouteKey(requiredString(
      record.memberRouteKey,
      "launchOverride.memberProfiles[].memberRouteKey",
    )),
    memberName: requiredString(record.memberName, "launchOverride.memberProfiles[].memberName"),
    agentDefinitionId: requiredString(
      record.agentDefinitionId,
      "launchOverride.memberProfiles[].agentDefinitionId",
    ),
    ...normalizeFields({
      record,
      declaration: fieldDeclaration,
      slotKey: slot.slotKey,
      fieldName: "launchOverride.memberProfiles[]",
      includeWorkspace: false,
    }),
  };
};

const assertCurrentTopology = (
  slotKey: string,
  saved: ApplicationTeamMemberLaunchOverride[],
  current: TeamLeafIdentity[],
): void => {
  const savedByRoute = new Map<string, ApplicationTeamMemberLaunchOverride>();
  for (const member of saved) {
    if (savedByRoute.has(member.memberRouteKey)) {
      throw new ApplicationLaunchOverrideValidationError(
        "SAVED_OVERRIDE_MALFORMED",
        `Application slot '${slotKey}' has duplicate memberRouteKey '${member.memberRouteKey}'.`,
      );
    }
    savedByRoute.set(member.memberRouteKey, member);
  }
  const currentByRoute = new Map(current.map((member) => [member.memberRouteKey, member]));
  const staleMembers: NonNullable<ApplicationLaunchIssue["staleMembers"]> = [];
  for (const member of saved) {
    const currentMember = currentByRoute.get(member.memberRouteKey);
    if (!currentMember) {
      staleMembers.push({ ...member, reason: "MISSING_FROM_TEAM" });
    } else if (currentMember.agentDefinitionId !== member.agentDefinitionId) {
      staleMembers.push({
        ...member,
        reason: "AGENT_CHANGED",
        currentAgentDefinitionId: currentMember.agentDefinitionId,
      });
    }
  }
  for (const member of current) {
    if (!savedByRoute.has(member.memberRouteKey)) {
      staleMembers.push({ ...member, reason: "MISSING_FROM_TEAM" });
    }
  }
  if (staleMembers.length > 0) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_MEMBER_TOPOLOGY_STALE",
      `Application slot '${slotKey}' has a saved member topology that no longer matches the selected team.`,
      staleMembers,
    );
  }
};

const normalizeTeamOverride = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  value: unknown,
  currentTeamMembers: TeamLeafIdentity[],
): ApplicationTeamLaunchOverride => {
  const declaration = slot.supportedLaunchConfig?.AGENT_TEAM ?? null;
  if (!declaration) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      `Application slot '${slot.slotKey}' does not support team launch overrides.`,
    );
  }
  const record = asRecord(value, "launchOverride");
  assertKnownKeys(record, TEAM_KEYS, "launchOverride");
  if (requiredString(record.kind, "launchOverride.kind") !== "AGENT_TEAM") {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "Saved launch override kind does not match the selected AGENT_TEAM resource.",
    );
  }
  if (!Array.isArray(record.memberProfiles)) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "launchOverride.memberProfiles must be an array.",
    );
  }
  const memberProfiles = record.memberProfiles.map((member) =>
    normalizeMemberOverride(slot, declaration.memberOverrides ?? null, member));
  assertCurrentTopology(slot.slotKey, memberProfiles, currentTeamMembers);
  return {
    kind: "AGENT_TEAM",
    defaults: normalizeTeamDefaults(slot, declaration, record.defaults),
    memberProfiles: memberProfiles.sort((left, right) =>
      left.memberRouteKey.localeCompare(right.memberRouteKey)),
  };
};

export const normalizeApplicationLaunchOverride = (input: {
  slot: ApplicationExecutionResourceSlotDeclaration;
  resourceKind: ApplicationExecutionResourceKind;
  launchOverride: ApplicationLaunchOverride | null;
  currentTeamMembers?: TeamLeafIdentity[];
}): ApplicationLaunchOverride | null => {
  if (!input.launchOverride) return null;
  return input.resourceKind === "AGENT"
    ? normalizeAgentOverride(input.slot, input.launchOverride)
    : normalizeTeamOverride(input.slot, input.launchOverride, input.currentTeamMembers ?? []);
};

export const buildLegacyApplicationLaunchOverride = (input: {
  executionResourceRef: ApplicationExecutionResourceRef;
  launchDefaults: StoredLegacyApplicationLaunchDefaults | null;
  currentTeamMembers?: TeamLeafIdentity[];
}): ApplicationLaunchOverride | null => {
  if (!input.launchDefaults) return null;
  const fields = {
    ...(optionalString(input.launchDefaults.llmModelIdentifier)
      ? { llmModelIdentifier: optionalString(input.launchDefaults.llmModelIdentifier) }
      : {}),
    ...(optionalString(input.launchDefaults.runtimeKind)
      ? { runtimeKind: optionalString(input.launchDefaults.runtimeKind) }
      : {}),
    ...(optionalString(input.launchDefaults.workspaceRootPath)
      ? { workspaceRootPath: optionalString(input.launchDefaults.workspaceRootPath) }
      : {}),
  };
  return input.executionResourceRef.kind === "AGENT"
    ? { kind: "AGENT", ...fields }
    : {
        kind: "AGENT_TEAM",
        defaults: Object.keys(fields).length > 0 ? fields : null,
        memberProfiles: (input.currentTeamMembers ?? []).map((member) => ({ ...member })),
      };
};
