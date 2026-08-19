import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

type JsonRecord = Record<string, unknown>;

const record = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
};

const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const requireText = (value: unknown, label: string): string => {
  const normalized = text(value);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const requireDisplayText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};
const nullableText = (value: unknown, label: string): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be a string or null.`);
  return value;
};
const nullableObject = (value: unknown, label: string): JsonRecord | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object or null.`);
  }
  return structuredClone(value as JsonRecord);
};

const requiredNullableObjectField = (
  source: JsonRecord,
  fieldName: string,
  label: string,
): JsonRecord | null => {
  if (!(fieldName in source)) throw new Error(`${label} is required.`);
  return nullableObject(source[fieldName], label);
};

const normalizeRoute = (value: string): string => value
  .trim()
  .replace(/\\/g, "/")
  .replace(/\/{2,}/g, "/")
  .replace(/^\/+|\/+$/g, "");

const requireDirectRoute = (value: unknown, label: string): string => {
  const route = normalizeRoute(requireText(value, label));
  if (!route || route.includes("/")) {
    throw new Error(`${label} must be one direct member segment; topology cannot be reconstructed safely.`);
  }
  return route;
};

const validateOptionalMemberPath = (value: unknown, route: string, label: string): void => {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length !== 1 || typeof value[0] !== "string" || !value[0].trim()) {
    throw new Error(`${label} must contain exactly one non-empty direct segment.`);
  }
  if (normalizeRoute(value[0]) !== route || normalizeRoute(value[0]).includes("/")) {
    throw new Error(`${label} contradicts memberRouteKey; topology cannot be reconstructed safely.`);
  }
};

const requireRuntimeKind = (value: unknown, label: string): RuntimeKind => {
  if (!Object.values(RuntimeKind).includes(value as RuntimeKind)) {
    throw new Error(`${label} is unsupported.`);
  }
  return value as RuntimeKind;
};

const requireSkillAccessMode = (value: unknown, label: string): SkillAccessMode => {
  if (!Object.values(SkillAccessMode).includes(value as SkillAccessMode)) {
    throw new Error(`${label} is unsupported.`);
  }
  return value as SkillAccessMode;
};

const convertFlatAgent = (value: unknown, index: number): JsonRecord => {
  const label = `memberMetadata[${index}]`;
  const member = record(value, label);
  const declaredKind = text(member.memberKind);
  if (declaredKind && declaredKind !== "agent") {
    throw new Error("Legacy flat memberMetadata contains a non-agent member; topology cannot be reconstructed safely.");
  }
  if ([
    "memberTree", "children", "teamRunId", "teamDefinitionId",
    "coordinatorMemberRouteKey", "coordinatorAddress",
  ].some((key) => key in member)) {
    throw new Error("Legacy flat memberMetadata contains nested-team fields; topology cannot be reconstructed safely.");
  }
  const memberRouteKey = requireDirectRoute(member.memberRouteKey, `${label}.memberRouteKey`);
  validateOptionalMemberPath(member.memberPath, memberRouteKey, `${label}.memberPath`);
  const memberName = requireDisplayText(member.memberName, `${label}.memberName`);
  const memberRunId = requireText(member.memberRunId, `${label}.memberRunId`);
  if (typeof member.autoExecuteTools !== "boolean") {
    throw new Error(`${label}.autoExecuteTools must be boolean.`);
  }
  return {
    memberKind: "agent",
    memberRouteKey,
    memberPath: [memberRouteKey],
    memberName,
    memberRunId,
    role: nullableText(member.role, `${label}.role`),
    description: nullableText(member.description, `${label}.description`),
    runtimeKind: requireRuntimeKind(member.runtimeKind, `${label}.runtimeKind`),
    platformAgentRunId: nullableText(member.platformAgentRunId, `${label}.platformAgentRunId`),
    agentDefinitionId: requireText(member.agentDefinitionId, `${label}.agentDefinitionId`),
    llmModelIdentifier: requireText(member.llmModelIdentifier, `${label}.llmModelIdentifier`),
    autoExecuteTools: member.autoExecuteTools,
    skillAccessMode: requireSkillAccessMode(member.skillAccessMode, `${label}.skillAccessMode`),
    llmConfig: nullableObject(member.llmConfig, `${label}.llmConfig`),
    workspaceRootPath: nullableText(member.workspaceRootPath, `${label}.workspaceRootPath`),
    applicationExecutionContext: requiredNullableObjectField(
      member,
      "applicationExecutionContext",
      `${label}.applicationExecutionContext`,
    ),
  };
};

export const isLegacyFlatTeamRunMetadata = (payload: JsonRecord): boolean =>
  "memberMetadata" in payload || "runVersion" in payload;

export const decodeFlatTeamRunMetadataToMemberTree = (
  payload: JsonRecord,
  teamRunId: string,
): JsonRecord => {
  if (payload.runVersion !== 1) {
    throw new Error("Legacy flat metadata runVersion must equal 1.");
  }
  if ("memberTree" in payload) {
    throw new Error("Legacy flat metadata also contains memberTree; topology cannot be reconstructed safely.");
  }
  if (!Array.isArray(payload.memberMetadata) || payload.memberMetadata.length === 0) {
    throw new Error("Legacy team metadata has no valid memberMetadata entries.");
  }
  const memberTree = payload.memberMetadata.map(convertFlatAgent);
  const sourceTeamRunId = requireText(payload.teamRunId, "teamRunId");
  if (sourceTeamRunId !== teamRunId) {
    throw new Error(`teamRunId '${sourceTeamRunId}' does not match directory '${teamRunId}'.`);
  }
  const coordinatorMemberRouteKey = requireDirectRoute(
    payload.coordinatorMemberRouteKey,
    "coordinatorMemberRouteKey",
  );
  if (!memberTree.some((member) => member.memberRouteKey === coordinatorMemberRouteKey)) {
    throw new Error(`coordinatorMemberRouteKey '${coordinatorMemberRouteKey}' is not a direct Agent member.`);
  }
  const seen = new Set<string>();
  for (const member of memberTree) {
    const folded = String(member.memberRouteKey).toLocaleLowerCase("en-US");
    if (seen.has(folded)) throw new Error(`Duplicate direct member route '${String(member.memberRouteKey)}'.`);
    seen.add(folded);
  }
  const converted: JsonRecord = {
    teamRunId: sourceTeamRunId,
    teamDefinitionId: requireText(payload.teamDefinitionId, "teamDefinitionId"),
    teamDefinitionName: requireText(payload.teamDefinitionName, "teamDefinitionName"),
    coordinatorMemberRouteKey,
    createdAt: requireText(payload.createdAt, "createdAt"),
    archivedAt: nullableText(payload.archivedAt, "archivedAt"),
    memberTree,
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
  };
  return converted;
};
