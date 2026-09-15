import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import {
  cloneCollaborationHandoffs,
  normalizeCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  AgentOrgDefinition,
  AgentOrgMemberRefScope,
} from "../domain/agent-org-definition.js";

export type AgentOrgDefinitionConfigMember = Readonly<{
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope: AgentOrgMemberRefScope;
}>;

export type AgentOrgDefinitionConfigFile = Readonly<{
  members: readonly AgentOrgDefinitionConfigMember[];
  handoffs: readonly CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
}>;

export class AgentOrgDefinitionConfigParseError extends Error {
  readonly code = "DEFINITION_CONTRACT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "AgentOrgDefinitionConfigParseError";
  }
}

const fail = (message: string): never => {
  throw new AgentOrgDefinitionConfigParseError(message);
};

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    fail(`${label} must contain exactly ${target.join(", ")}. Unsupported keys: ${actual.filter((key) => !target.includes(key)).join(", ") || "none"}. Missing keys: ${target.filter((key) => !actual.includes(key)).join(", ") || "none"}.`);
  }
};

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    return fail(`${label} must be a non-empty trimmed string.`);
  }
  return value;
};

const launchConfig = (value: unknown): DefaultLaunchConfig | null => {
  if (value === null) return null;
  const candidate = asRecord(value, "defaultLaunchConfig");
  exactKeys(candidate, ["llmModelIdentifier", "runtimeKind", "llmConfig"], "defaultLaunchConfig");
  const optionalString = (key: "llmModelIdentifier" | "runtimeKind"): string | null =>
    candidate[key] === null ? null : requiredString(candidate[key], `defaultLaunchConfig.${key}`);
  if (
    candidate.llmConfig !== null
    && (!candidate.llmConfig || typeof candidate.llmConfig !== "object" || Array.isArray(candidate.llmConfig))
  ) {
    return fail("defaultLaunchConfig.llmConfig must be an object or null.");
  }
  return {
    llmModelIdentifier: optionalString("llmModelIdentifier"),
    runtimeKind: optionalString("runtimeKind"),
    llmConfig: candidate.llmConfig === null
      ? null
      : structuredClone(candidate.llmConfig as Record<string, unknown>),
  };
};

const member = (value: unknown, index: number): AgentOrgDefinitionConfigMember => {
  const label = `members[${index}]`;
  const candidate = asRecord(value, label);
  exactKeys(candidate, ["memberName", "ref", "refType", "refScope"], label);
  if (candidate.refType !== "agent" && candidate.refType !== "agent_team") {
    return fail(`${label}.refType must be 'agent' or 'agent_team'.`);
  }
  if (
    candidate.refScope !== "shared"
    && candidate.refScope !== "org_local"
    && candidate.refScope !== "application_owned"
  ) {
    return fail(`${label}.refScope must be 'shared', 'org_local', or 'application_owned'.`);
  }
  return Object.freeze({
    memberName: requiredString(candidate.memberName, `${label}.memberName`),
    ref: requiredString(candidate.ref, `${label}.ref`),
    refType: candidate.refType,
    refScope: candidate.refScope,
  });
};

export const parseAgentOrgDefinitionConfig = (
  value: unknown,
): AgentOrgDefinitionConfigFile => {
  const candidate = asRecord(value, "AgentOrg Definition Config");
  exactKeys(candidate, [
    "members",
    "handoffs",
    "avatarUrl",
    "defaultLaunchConfig",
  ], "AgentOrg Definition Config");
  if (!Array.isArray(candidate.members)) fail("members must be an array.");
  const candidateMembers = candidate.members as unknown[];
  if (candidate.avatarUrl !== null) requiredString(candidate.avatarUrl, "avatarUrl");
  const members = candidateMembers.map(member);
  const folded = new Set<string>();
  for (const current of members) {
    const key = current.memberName.toLocaleLowerCase("en-US");
    if (folded.has(key)) fail(`Duplicate AgentOrg member placement '${current.memberName}'.`);
    folded.add(key);
  }
  return Object.freeze({

    members: Object.freeze(members),
    handoffs: Object.freeze(normalizeCollaborationHandoffs(candidate.handoffs)),
    avatarUrl: candidate.avatarUrl as string | null,
    defaultLaunchConfig: launchConfig(candidate.defaultLaunchConfig),
  });
};

/** Normalize optional input metadata without weakening canonical write validation. */
export const readAgentOrgDefinitionConfig = (value: unknown): AgentOrgDefinitionConfigFile => {
  const candidate = { ...asRecord(value, "AgentOrg Definition Config") };
  if (candidate["avatarUrl"] === undefined) candidate["avatarUrl"] = null;
  return parseAgentOrgDefinitionConfig(candidate);
};

export const buildAgentOrgDefinitionConfig = (
  definition: AgentOrgDefinition,
): AgentOrgDefinitionConfigFile => parseAgentOrgDefinitionConfig({
  members: definition.members.map((item) => ({
    memberName: item.memberName,
    ref: item.ref,
    refType: item.refType,
    refScope: item.refScope,
  })),
  handoffs: cloneCollaborationHandoffs(definition.handoffs),
  avatarUrl: definition.avatarUrl,
  defaultLaunchConfig: definition.defaultLaunchConfig
    ? {
        llmModelIdentifier: definition.defaultLaunchConfig.llmModelIdentifier,
        runtimeKind: definition.defaultLaunchConfig.runtimeKind,
        llmConfig: definition.defaultLaunchConfig.llmConfig
          ? structuredClone(definition.defaultLaunchConfig.llmConfig)
          : null,
      }
    : null,
});
