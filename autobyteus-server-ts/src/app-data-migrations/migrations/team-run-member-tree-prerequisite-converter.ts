import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import { convertLegacyTeamRunMetadata } from "./team-canonical-metadata-converter.js";

type JsonRecord = Record<string, unknown>;

const record = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
};

const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const nullableText = (value: unknown): string | null => text(value) || null;
const objectOrNull = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? structuredClone(value as JsonRecord)
    : null;

const normalizeRoute = (value: string): string => value
  .trim()
  .replace(/\\/g, "/")
  .replace(/\/{2,}/g, "/")
  .replace(/^\/+|\/+$/g, "");

const legacyMemberPath = (member: JsonRecord): string[] => {
  if (Array.isArray(member.memberPath)) {
    const segments = member.memberPath.map(text).filter(Boolean);
    if (segments.length > 0) return segments;
  }
  const routeOrName = text(member.memberRouteKey) || text(member.memberName);
  return routeOrName.split("/").map((segment) => segment.trim()).filter(Boolean);
};

const skillAccessMode = (value: unknown): SkillAccessMode =>
  value === SkillAccessMode.NONE || value === SkillAccessMode.PRELOADED_ONLY
    ? value
    : SkillAccessMode.PRELOADED_ONLY;

const convertFlatAgent = (value: unknown, index: number): JsonRecord => {
  const member = record(value, `memberMetadata[${index}]`);
  const declaredKind = text(member.memberKind);
  if (declaredKind && declaredKind !== "agent") {
    throw new Error("Legacy flat memberMetadata contains a non-agent member; topology cannot be reconstructed safely.");
  }
  if ("memberTree" in member || "teamRunId" in member || "teamDefinitionId" in member) {
    throw new Error("Legacy flat memberMetadata contains nested-team fields; topology cannot be reconstructed safely.");
  }
  const memberPath = legacyMemberPath(member);
  const memberRouteKey = normalizeRoute(text(member.memberRouteKey) || memberPath.join("/"));
  if (memberPath.length !== 1 || memberRouteKey.includes("/")) {
    throw new Error("Legacy flat memberMetadata contains a nested member path; topology cannot be reconstructed safely.");
  }
  if (normalizeRoute(memberPath.join("/")) !== memberRouteKey) {
    throw new Error("Legacy flat memberMetadata contains contradictory route/path identity; topology cannot be reconstructed safely.");
  }
  const legacyMemberName = text(member.memberName);
  if (legacyMemberName &&
      legacyMemberName.toLocaleLowerCase("en-US") !== memberRouteKey.toLocaleLowerCase("en-US")) {
    throw new Error("Legacy flat memberMetadata contains contradictory route/name identity; topology cannot be reconstructed safely.");
  }
  const memberRunId = text(member.memberRunId);
  if (!memberRouteKey || !memberRunId) {
    throw new Error("Legacy team member metadata is missing member route/path/run identity.");
  }
  return {
    memberKind: "agent",
    memberRouteKey,
    memberPath: [memberRouteKey],
    // Historical display names were not structural. The prerequisite emits the
    // exact path basename required by the following canonical converter.
    memberName: memberRouteKey,
    memberRunId,
    role: nullableText(member.role),
    description: nullableText(member.description),
    runtimeKind: runtimeKindFromString(member.runtimeKind) ?? RuntimeKind.AUTOBYTEUS,
    platformAgentRunId: nullableText(member.platformAgentRunId),
    agentDefinitionId: text(member.agentDefinitionId),
    llmModelIdentifier: text(member.llmModelIdentifier),
    autoExecuteTools: Boolean(member.autoExecuteTools),
    skillAccessMode: skillAccessMode(member.skillAccessMode),
    llmConfig: objectOrNull(member.llmConfig),
    workspaceRootPath: nullableText(member.workspaceRootPath),
    applicationExecutionContext: objectOrNull(member.applicationExecutionContext),
  };
};

const requireText = (value: unknown, label: string): string => {
  const normalized = text(value);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const validateNullableText = (value: unknown, label: string, optional = false): void => {
  if (optional && value === undefined) return;
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string or null.`);
  }
};

const validateNullableObject = (value: unknown, label: string, optional = false): void => {
  if (optional && value === undefined) return;
  if (value !== null && (!value || typeof value !== "object" || Array.isArray(value))) {
    throw new Error(`${label} must be an object or null.`);
  }
};

const validateMemberTreeNode = (value: unknown, label: string): void => {
  const member = record(value, label);
  const route = requireText(member.memberRouteKey, `${label}.memberRouteKey`);
  if (!Array.isArray(member.memberPath) || member.memberPath.length === 0 ||
      member.memberPath.some((segment) => !text(segment))) {
    throw new Error(`${label}.memberPath must contain non-empty strings.`);
  }
  if (normalizeRoute((member.memberPath as unknown[]).map(text).join("/")) !== normalizeRoute(route)) {
    throw new Error(`${label} route/path identity contradicts.`);
  }
  requireText(member.memberName, `${label}.memberName`);
  requireText(member.memberRunId, `${label}.memberRunId`);
  validateNullableText(member.role, `${label}.role`, true);
  validateNullableText(member.description, `${label}.description`, true);
  if (member.memberKind === "agent_team") {
    requireText(member.teamDefinitionId, `${label}.teamDefinitionId`);
    if (member.teamRunId === undefined) throw new Error(`${label}.teamRunId is required.`);
    if (member.teamRunId !== null) requireText(member.teamRunId, `${label}.teamRunId`);
    if (member.coordinatorMemberRouteKey === undefined) {
      throw new Error(`${label}.coordinatorMemberRouteKey is required.`);
    }
    if (member.coordinatorMemberRouteKey !== null) {
      requireText(member.coordinatorMemberRouteKey, `${label}.coordinatorMemberRouteKey`);
    }
    if (!Array.isArray(member.memberTree)) throw new Error(`${label}.memberTree must be an array.`);
    member.memberTree.forEach((child, index) => validateMemberTreeNode(child, `${label}.memberTree[${index}]`));
    return;
  }
  if (member.memberKind !== "agent") throw new Error(`${label}.memberKind is unsupported.`);
  if (!Object.values(RuntimeKind).includes(member.runtimeKind as RuntimeKind)) {
    throw new Error(`${label}.runtimeKind is unsupported.`);
  }
  validateNullableText(member.platformAgentRunId, `${label}.platformAgentRunId`);
  requireText(member.agentDefinitionId, `${label}.agentDefinitionId`);
  requireText(member.llmModelIdentifier, `${label}.llmModelIdentifier`);
  if (typeof member.autoExecuteTools !== "boolean") throw new Error(`${label}.autoExecuteTools must be boolean.`);
  if (!Object.values(SkillAccessMode).includes(member.skillAccessMode as SkillAccessMode)) {
    throw new Error(`${label}.skillAccessMode is unsupported.`);
  }
  validateNullableObject(member.llmConfig, `${label}.llmConfig`);
  validateNullableText(member.workspaceRootPath, `${label}.workspaceRootPath`);
  validateNullableObject(member.applicationExecutionContext, `${label}.applicationExecutionContext`, true);
};

export const isLegacyFlatTeamRunMetadata = (payload: JsonRecord): boolean =>
  "memberMetadata" in payload || "runVersion" in payload;

export const validateMemberTreePrerequisite = (payload: JsonRecord, teamRunId: string): void => {
  if (payload.schemaVersion === 3) {
    convertLegacyTeamRunMetadata(payload, teamRunId);
    return;
  }
  if (requireText(payload.teamRunId, "teamRunId") !== teamRunId) {
    throw new Error(`teamRunId '${String(payload.teamRunId)}' does not match directory '${teamRunId}'.`);
  }
  requireText(payload.teamDefinitionId, "teamDefinitionId");
  requireText(payload.teamDefinitionName, "teamDefinitionName");
  requireText(payload.coordinatorMemberRouteKey, "coordinatorMemberRouteKey");
  requireText(payload.createdAt, "createdAt");
  validateNullableText(payload.archivedAt, "archivedAt", true);
  if (!Array.isArray(payload.memberTree)) throw new Error("memberTree must be an array.");
  payload.memberTree.forEach((member, index) => validateMemberTreeNode(member, `memberTree[${index}]`));
  normalizeCollaborationHandoffs(payload.handoffs);
};

export const convertFlatTeamRunMetadataToMemberTree = (
  payload: JsonRecord,
  teamRunId: string,
): JsonRecord => {
  if ("memberTree" in payload) {
    throw new Error("Legacy flat metadata also contains memberTree; topology cannot be reconstructed safely.");
  }
  if (!Array.isArray(payload.memberMetadata) || payload.memberMetadata.length === 0) {
    throw new Error("Legacy team metadata has no valid memberMetadata entries.");
  }
  const memberTree = payload.memberMetadata.map(convertFlatAgent);
  const now = new Date().toISOString();
  const converted: JsonRecord = {
    teamRunId: text(payload.teamRunId) || teamRunId,
    teamDefinitionId: text(payload.teamDefinitionId),
    teamDefinitionName: text(payload.teamDefinitionName),
    coordinatorMemberRouteKey: normalizeRoute(text(payload.coordinatorMemberRouteKey)) || memberTree[0]?.memberRouteKey,
    createdAt: text(payload.createdAt) || now,
    archivedAt: nullableText(payload.archivedAt),
    memberTree,
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
  };
  // Prove the prerequisite output is accepted by the next ordered migration
  // before any backup or source-file replacement occurs.
  convertLegacyTeamRunMetadata(converted, teamRunId);
  return converted;
};
