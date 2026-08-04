import { createAgentTeamAddress, getParentAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs, type CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { cloneTeamRunNode, type TeamRunAgentTeamNode, type TeamRunNode } from "../../agent-team-execution/domain/team-run-config.js";
import { validateTeamRunMetadataPayload } from "../../run-history/store/team-run-metadata-schema.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};
const nullableText = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined || value === "") return null;
  return text(value, label);
};
const stringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty array.`);
  return value.map((entry, index) => text(entry, `${label}[${index}]`));
};

const addressFromLegacyPair = (
  routeValue: unknown,
  pathValue: unknown,
  label: string,
): AgentTeamAddress => {
  const route = text(routeValue, `${label}.memberRouteKey`).replace(/^\/+|\/+$/g, "");
  const segments = stringArray(pathValue, `${label}.memberPath`);
  if (route !== segments.join("/")) throw new Error(`${label} route/path identity contradicts.`);
  return createAgentTeamAddress(segments);
};

const roleAndDescription = (record: Record<string, unknown>, label: string) => ({
  role: nullableText(record.role, `${label}.role`),
  description: nullableText(record.description, `${label}.description`),
});

const convertNode = (value: unknown, expectedParent: AgentTeamAddress, label: string): TeamRunNode => {
  const record = object(value, label);
  const address = addressFromLegacyPair(record.memberRouteKey, record.memberPath, label);
  const memberName = text(record.memberName, `${label}.memberName`);
  const segments = address.slice(1).split("/");
  if (segments.at(-1) !== memberName) throw new Error(`${label}.memberName does not equal the address basename.`);
  if (getParentAgentTeamAddress(address) !== expectedParent) throw new Error(`${label} is not a direct child of '${expectedParent}'.`);
  const memberRunId = text(record.memberRunId, `${label}.memberRunId`);
  const common = roleAndDescription(record, label);
  if (record.memberKind === "agent") {
    return cloneTeamRunNode({
      kind: "agent",
      address,
      agentRunId: memberRunId,
      agentDefinitionId: text(record.agentDefinitionId, `${label}.agentDefinitionId`),
      platformAgentRunId: nullableText(record.platformAgentRunId, `${label}.platformAgentRunId`),
      runtimeKind: text(record.runtimeKind, `${label}.runtimeKind`) as never,
      llmModelIdentifier: text(record.llmModelIdentifier, `${label}.llmModelIdentifier`),
      autoExecuteTools: record.autoExecuteTools === true,
      skillAccessMode: record.skillAccessMode as never,
      llmConfig: record.llmConfig && typeof record.llmConfig === "object" && !Array.isArray(record.llmConfig)
        ? record.llmConfig as Record<string, unknown>
        : null,
      workspaceRootPath: nullableText(record.workspaceRootPath, `${label}.workspaceRootPath`),
      applicationExecutionContext: record.applicationExecutionContext && typeof record.applicationExecutionContext === "object" && !Array.isArray(record.applicationExecutionContext)
        ? structuredClone(record.applicationExecutionContext) as never
        : null,
      ...common,
    });
  }
  if (record.memberKind !== "agent_team") throw new Error(`${label}.memberKind is unsupported.`);
  const teamRunId = text(record.teamRunId, `${label}.teamRunId`);
  if (teamRunId !== memberRunId) throw new Error(`${label}.memberRunId and .teamRunId contradict.`);
  const coordinatorRoute = text(record.coordinatorMemberRouteKey, `${label}.coordinatorMemberRouteKey`).replace(/^\/+|\/+$/g, "");
  const coordinatorAddress = createAgentTeamAddress(coordinatorRoute.split("/"));
  if (getParentAgentTeamAddress(coordinatorAddress) !== address) throw new Error(`${label}.coordinatorMemberRouteKey is not direct.`);
  if (!Array.isArray(record.memberTree)) throw new Error(`${label}.memberTree must be an array.`);
  return cloneTeamRunNode({
    kind: "agent_team",
    address,
    teamDefinitionId: text(record.teamDefinitionId, `${label}.teamDefinitionId`),
    teamRunId,
    coordinatorAddress,
    children: record.memberTree.map((child, index) => convertNode(child, address, `${label}.memberTree[${index}]`)),
    ...common,
  });
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

const collectAddresses = (root: TeamRunAgentTeamNode): Set<string> => {
  const result = new Set<string>();
  const visit = (node: TeamRunNode): void => {
    result.add(node.address);
    if (node.kind === "agent_team") node.children.forEach(visit);
  };
  visit(root);
  return result;
};

export const convertLegacyTeamRunMetadata = (value: unknown, directoryTeamRunId: string): TeamRunMetadata => {
  const record = object(value, "TeamRun metadata");
  if (record.schemaVersion === 3) return validateTeamRunMetadataPayload(value, directoryTeamRunId);
  const teamRunId = text(record.teamRunId, "teamRunId");
  if (teamRunId !== directoryTeamRunId) throw new Error(`teamRunId '${teamRunId}' does not match directory '${directoryTeamRunId}'.`);
  const rootCoordinatorRoute = text(record.coordinatorMemberRouteKey, "coordinatorMemberRouteKey").replace(/^\/+|\/+$/g, "");
  const coordinatorAddress = createAgentTeamAddress(rootCoordinatorRoute.split("/"));
  if (getParentAgentTeamAddress(coordinatorAddress) !== "/") throw new Error("Root coordinator must be a direct child of '/'.");
  if (!Array.isArray(record.memberTree)) throw new Error("memberTree must be an array.");
  const rootTeam = cloneTeamRunNode({
    kind: "agent_team",
    address: createAgentTeamAddress([]),
    teamDefinitionId: text(record.teamDefinitionId, "teamDefinitionId"),
    teamRunId,
    coordinatorAddress,
    role: null,
    description: null,
    children: record.memberTree.map((child, index) => convertNode(child, createAgentTeamAddress([]), `memberTree[${index}]`)),
  }) as TeamRunAgentTeamNode;
  return validateTeamRunMetadataPayload({
    schemaVersion: 3,
    teamDefinitionName: text(record.teamDefinitionName, "teamDefinitionName"),
    createdAt: text(record.createdAt, "createdAt"),
    archivedAt: nullableText(record.archivedAt, "archivedAt"),
    rootTeam,
    handoffs: convertHandoffs(record.handoffs, collectAddresses(rootTeam)),
  }, directoryTeamRunId);
};
