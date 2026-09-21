import type {
  AgentTeamDefinition,
  TeamMemberRefScope,
} from "../domain/agent-team-definition.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import {
  cloneCollaborationHandoffs,
  normalizeCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";

export type AgentTeamDefinitionConfigMember = Readonly<{
  memberName: string;
  ref: string;
  refScope: TeamMemberRefScope;
}>;

export type AgentTeamDefinitionConfigFile = Readonly<{
  coordinatorMemberName: string;
  members: readonly AgentTeamDefinitionConfigMember[];
  handoffs: readonly CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
}>;

export class AgentTeamDefinitionConfigParseError extends Error {
  readonly code = "DEFINITION_CONTRACT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "AgentTeamDefinitionConfigParseError";
  }
}

const fail = (message: string): never => {
  throw new AgentTeamDefinitionConfigParseError(message);
};

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const assertExactKeys = (
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
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return fail(`${label} must be a non-empty trimmed string.`);
  }
  return value;
};

const parseDefaultLaunchConfig = (value: unknown): DefaultLaunchConfig | null => {
  if (value === null) return null;
  const candidate = asRecord(value, "defaultLaunchConfig");
  assertExactKeys(
    candidate,
    ["llmModelIdentifier", "runtimeKind", "llmConfig"],
    "defaultLaunchConfig",
  );
  const optionalString = (field: "llmModelIdentifier" | "runtimeKind"): string | null => {
    if (candidate[field] === null) return null;
    return requiredString(candidate[field], `defaultLaunchConfig.${field}`);
  };
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

const parseMember = (value: unknown, index: number): AgentTeamDefinitionConfigMember => {
  const label = `members[${index}]`;
  const candidate = asRecord(value, label);
  assertExactKeys(candidate, ["memberName", "ref", "refScope"], label);
  const refScope = candidate.refScope;
  if (refScope !== "shared" && refScope !== "team_local" && refScope !== "application_owned") {
    return fail(`${label}.refScope must be 'shared', 'team_local', or 'application_owned'.`);
  }
  return Object.freeze({
    memberName: requiredString(candidate.memberName, `${label}.memberName`),
    ref: requiredString(candidate.ref, `${label}.ref`),
    refScope,
  });
};

export const parseAgentTeamDefinitionConfig = (
  value: unknown,
): AgentTeamDefinitionConfigFile => {
  const candidate = asRecord(value, "AgentTeam Definition Config");
  assertExactKeys(candidate, [
    "coordinatorMemberName",
    "members",
    "handoffs",
    "avatarUrl",
    "defaultLaunchConfig",
  ], "AgentTeam Definition Config");
  if (!Array.isArray(candidate.members)) fail("members must be an array.");
  const candidateMembers = candidate.members as unknown[];
  if (candidate.avatarUrl !== null) requiredString(candidate.avatarUrl, "avatarUrl");
  const parsed: AgentTeamDefinitionConfigFile = {
    coordinatorMemberName: requiredString(candidate.coordinatorMemberName, "coordinatorMemberName"),
    members: candidateMembers.map(parseMember),
    handoffs: normalizeCollaborationHandoffs(candidate.handoffs),
    avatarUrl: candidate.avatarUrl as string | null,
    defaultLaunchConfig: parseDefaultLaunchConfig(candidate.defaultLaunchConfig),
  };
  const coordinatorMatches = parsed.members.filter(
    (member) => member.memberName === parsed.coordinatorMemberName,
  );
  if (coordinatorMatches.length !== 1) {
    fail("coordinatorMemberName must resolve to exactly one direct Agent member.");
  }
  const foldedNames = new Set<string>();
  for (const member of parsed.members) {
    const folded = member.memberName.toLocaleLowerCase("en-US");
    if (foldedNames.has(folded)) fail(`Duplicate Team member placement '${member.memberName}'.`);
    foldedNames.add(folded);
  }
  return Object.freeze({
    ...parsed,
    members: Object.freeze([...parsed.members]),
    handoffs: Object.freeze(cloneCollaborationHandoffs(parsed.handoffs)),
  });
};

// Normal authored input may contain metadata; canonical writes still use the strict parser.
const pickOwnKeys = (value: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]));

export const readAgentTeamDefinitionConfig = (value: unknown): AgentTeamDefinitionConfigFile => {
  const source = asRecord(value, "AgentTeam Definition Config");
  const candidate = pickOwnKeys(source, ["coordinatorMemberName", "members", "handoffs", "avatarUrl", "defaultLaunchConfig"]);
  if (candidate['avatarUrl'] === undefined) candidate['avatarUrl'] = null;
  if (candidate['defaultLaunchConfig'] === undefined) candidate['defaultLaunchConfig'] = null;
  if (Array.isArray(candidate['members'])) {
    candidate['members'] = candidate['members'].map((member, index) =>
      pickOwnKeys(asRecord(member, `members[${index}]`), ["memberName", "ref", "refScope"]));
  }
  if (Array.isArray(candidate['handoffs'])) {
    candidate['handoffs'] = candidate['handoffs'].map((handoff, index) =>
      pickOwnKeys(asRecord(handoff, `handoffs[${index}]`), ["from", "to", "rules"]));
  }
  if (candidate['defaultLaunchConfig'] !== null) {
    candidate['defaultLaunchConfig'] = pickOwnKeys(asRecord(candidate['defaultLaunchConfig'], "defaultLaunchConfig"),
      ["llmModelIdentifier", "runtimeKind", "llmConfig"]);
  }
  return parseAgentTeamDefinitionConfig(candidate);
};

export const buildAgentTeamDefinitionConfig = (
  definition: AgentTeamDefinition,
): AgentTeamDefinitionConfigFile => parseAgentTeamDefinitionConfig({
  coordinatorMemberName: definition.coordinatorMemberName,
  members: definition.nodes.map((member) => ({
    memberName: member.memberName,
    ref: member.ref,
    refScope: member.refScope,
  })),
  handoffs: cloneCollaborationHandoffs(definition.handoffs),
  avatarUrl: definition.avatarUrl ?? null,
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
