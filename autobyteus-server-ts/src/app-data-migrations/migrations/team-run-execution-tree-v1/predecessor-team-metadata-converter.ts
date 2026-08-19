import { createAgentTeamAddress, getParentAgentTeamAddress, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs, type CollaborationHandoff } from "../../../agent-collaboration/domain/collaboration-handoff.js";
import { validateTeamRunMetadataPayload } from "../../legacy/team-run-metadata-schema.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunMetadata,
  TeamRunSubTeamMemberMetadata,
} from "../../legacy/team-run-metadata-types.js";
import {
  decodeFlatTeamRunMetadataToMemberTree,
  isLegacyFlatTeamRunMetadata,
} from "../team-run-member-tree-prerequisite-converter.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};
const nullableText = (value: unknown, label: string): string | null => {
  if (
    value === null
    || value === undefined
    || (typeof value === "string" && !value.trim())
  ) return null;
  return text(value, label);
};
const stringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty array.`);
  return value.map((entry, index) => text(entry, `${label}[${index}]`));
};
const nullableObject = (value: unknown, label: string): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object or null.`);
  }
  return structuredClone(value as Record<string, unknown>);
};
const booleanValue = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean.`);
  return value;
};
const runtimeKindValue = (value: unknown, label: string): RuntimeKind => {
  if (!Object.values(RuntimeKind).includes(value as RuntimeKind)) {
    throw new Error(`${label} is unsupported.`);
  }
  return value as RuntimeKind;
};
const skillAccessModeValue = (value: unknown, label: string): SkillAccessMode => {
  if (!Object.values(SkillAccessMode).includes(value as SkillAccessMode)) {
    throw new Error(`${label} is unsupported.`);
  }
  return value as SkillAccessMode;
};
const applicationExecutionContext = (
  record: Record<string, unknown>,
  label: string,
): Record<string, unknown> | null => {
  if (!("applicationExecutionContext" in record)) {
    throw new Error(`${label}.applicationExecutionContext is required.`);
  }
  return nullableObject(
    record.applicationExecutionContext,
    `${label}.applicationExecutionContext`,
  );
};
const normalizedRoute = (value: unknown, label: string): string => text(value, label)
  .replace(/\\/g, "/")
  .replace(/\/{2,}/g, "/")
  .replace(/^\/+|\/+$/g, "");

const addressFromLegacyPair = (
  routeValue: unknown,
  pathValue: unknown,
  label: string,
): AgentTeamAddress => {
  const route = normalizedRoute(routeValue, `${label}.memberRouteKey`);
  const segments = stringArray(pathValue, `${label}.memberPath`);
  if (route !== segments.join("/")) throw new Error(`${label} route/path identity contradicts.`);
  return createAgentTeamAddress(segments);
};

const roleAndDescription = (record: Record<string, unknown>, label: string) => ({
  role: nullableText(record.role, `${label}.role`),
  description: nullableText(record.description, `${label}.description`),
});

const convertNode = (
  value: unknown,
  expectedParent: AgentTeamAddress,
  label: string,
): TeamRunMemberMetadata => {
  const record = object(value, label);
  const address = addressFromLegacyPair(record.memberRouteKey, record.memberPath, label);
  // memberName is required historical display input, never a structural assertion.
  text(record.memberName, `${label}.memberName`);
  if (getParentAgentTeamAddress(address) !== expectedParent) throw new Error(`${label} is not a direct child of '${expectedParent}'.`);
  const memberRunId = text(record.memberRunId, `${label}.memberRunId`);
  const common = roleAndDescription(record, label);
  if (record.memberKind === "agent") {
    return Object.freeze({
      kind: "agent",
      address,
      agentRunId: memberRunId,
      agentDefinitionId: text(record.agentDefinitionId, `${label}.agentDefinitionId`),
      platformAgentRunId: nullableText(record.platformAgentRunId, `${label}.platformAgentRunId`),
      runtimeKind: runtimeKindValue(record.runtimeKind, `${label}.runtimeKind`),
      llmModelIdentifier: text(record.llmModelIdentifier, `${label}.llmModelIdentifier`),
      autoExecuteTools: booleanValue(record.autoExecuteTools, `${label}.autoExecuteTools`),
      skillAccessMode: skillAccessModeValue(record.skillAccessMode, `${label}.skillAccessMode`),
      llmConfig: nullableObject(record.llmConfig, `${label}.llmConfig`),
      workspaceRootPath: nullableText(record.workspaceRootPath, `${label}.workspaceRootPath`),
      applicationExecutionContext: applicationExecutionContext(record, label),
      ...common,
    } satisfies TeamRunAgentMemberMetadata);
  }
  if (record.memberKind !== "agent_team") throw new Error(`${label}.memberKind is unsupported.`);
  const teamRunId = nullableText(record.teamRunId, `${label}.teamRunId`) ?? memberRunId;
  const coordinatorRoute = normalizedRoute(record.coordinatorMemberRouteKey, `${label}.coordinatorMemberRouteKey`);
  const coordinatorAddress = createAgentTeamAddress(coordinatorRoute.split("/"));
  if (getParentAgentTeamAddress(coordinatorAddress) !== address) throw new Error(`${label}.coordinatorMemberRouteKey is not direct.`);
  if (!Array.isArray(record.memberTree)) throw new Error(`${label}.memberTree must be an array.`);
  return Object.freeze({
    kind: "agent_team",
    address,
    teamDefinitionId: text(record.teamDefinitionId, `${label}.teamDefinitionId`),
    teamRunId,
    coordinatorAddress,
    children: record.memberTree.map((child, index) => convertNode(child, address, `${label}.memberTree[${index}]`)),
    ...common,
  } satisfies TeamRunSubTeamMemberMetadata);
};

const handoffAddress = (value: string, label: string): AgentTeamAddress => {
  const normalized = value.startsWith("/") ? value : `/${value}`;
  try { return createAgentTeamAddress(normalized.slice(1).split("/").filter(Boolean)); }
  catch (error) { throw new Error(`${label} is invalid: ${error instanceof Error ? error.message : String(error)}`); }
};

const convertHandoffs = (value: unknown, addresses: Set<string>): CollaborationHandoff[] =>
  normalizeCollaborationHandoffs(value).map((handoff, index) => {
    const from = handoffAddress(handoff.from, `handoffs[${index}].from`);
    const to = handoffAddress(handoff.to, `handoffs[${index}].to`);
    if (!addresses.has(from)) throw new Error(`handoffs[${index}].from '${from}' is not a member address.`);
    if (!addresses.has(to)) throw new Error(`handoffs[${index}].to '${to}' is not a member address.`);
    return { from, to, rules: [...handoff.rules] };
  });

const collectAddresses = (root: TeamRunSubTeamMemberMetadata): Set<string> => {
  const result = new Set<string>();
  const visit = (node: TeamRunMemberMetadata): void => {
    result.add(node.address);
    if (node.kind === "agent_team") node.children.forEach(visit);
  };
  visit(root);
  return result;
};

export const convertLegacyTeamRunMetadata = (value: unknown, directoryTeamRunId: string): TeamRunMetadata => {
  const source = object(value, "TeamRun metadata");
  if (source.schemaVersion === 3) return validateTeamRunMetadataPayload(value, directoryTeamRunId);
  const record = isLegacyFlatTeamRunMetadata(source)
    ? decodeFlatTeamRunMetadataToMemberTree(source, directoryTeamRunId)
    : source;
  const teamRunId = text(record.teamRunId, "teamRunId");
  if (teamRunId !== directoryTeamRunId) throw new Error(`teamRunId '${teamRunId}' does not match directory '${directoryTeamRunId}'.`);
  const rootCoordinatorRoute = normalizedRoute(record.coordinatorMemberRouteKey, "coordinatorMemberRouteKey");
  const coordinatorAddress = createAgentTeamAddress(rootCoordinatorRoute.split("/"));
  if (getParentAgentTeamAddress(coordinatorAddress) !== "/") throw new Error("Root coordinator must be a direct child of '/'.");
  if (!Array.isArray(record.memberTree)) throw new Error("memberTree must be an array.");
  const rootTeam = Object.freeze({
    kind: "agent_team",
    address: createAgentTeamAddress([]),
    teamDefinitionId: text(record.teamDefinitionId, "teamDefinitionId"),
    teamRunId,
    coordinatorAddress,
    children: record.memberTree.map((child, index) => convertNode(child, createAgentTeamAddress([]), `memberTree[${index}]`)),
  } satisfies TeamRunSubTeamMemberMetadata);
  return validateTeamRunMetadataPayload({
    schemaVersion: 3,
    teamDefinitionName: text(record.teamDefinitionName, "teamDefinitionName"),
    createdAt: text(record.createdAt, "createdAt"),
    archivedAt: nullableText(record.archivedAt, "archivedAt"),
    rootTeam,
    handoffs: convertHandoffs(record.handoffs, collectAddresses(rootTeam)),
  }, directoryTeamRunId);
};
