import { AgentInputUserMessage } from "autobyteus-ts";
import { NodeType } from "../../agent-team-definition/domain/enums.js";
import {
  AgentTeamDefinition as DomainAgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember as DomainTeamMember,
} from "../../agent-team-definition/domain/models.js";
import {
  toRunScopedMemberBinding,
  type RunScopedMemberBinding,
  type RunScopedMemberBindingInput,
} from "../runtime-binding/run-scoped-member-binding.js";

const EMBEDDED_LOCAL_NODE_ID = "embedded-local";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export const normalizeUserMessageInput = (raw: unknown): AgentInputUserMessage => {
  if (raw instanceof AgentInputUserMessage) {
    return raw;
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("Envelope userMessage payload must be an object.");
  }
  const payload = raw as Record<string, unknown>;
  const content = payload.content;
  if (typeof content !== "string") {
    throw new Error("Envelope userMessage.content must be a string.");
  }
  const contextFilesValue = payload.context_files ?? payload.contextFiles ?? null;
  const normalizedContextFiles = Array.isArray(contextFilesValue)
    ? contextFilesValue.map((entry) => {
        if (!entry || typeof entry !== "object") {
          return entry;
        }
        const context = entry as Record<string, unknown>;
        return {
          uri: context.uri,
          file_type: context.file_type ?? context.fileType ?? null,
          file_name: context.file_name ?? context.fileName ?? null,
          metadata: context.metadata ?? {},
        };
      })
    : null;

  return AgentInputUserMessage.fromDict({
    content,
    sender_type: payload.sender_type ?? payload.senderType ?? undefined,
    context_files: normalizedContextFiles,
    metadata: payload.metadata ?? {},
  });
};

export const getPayloadRecord = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Envelope payload must be an object.");
  }
  return payload as Record<string, unknown>;
};

export const normalizeBootstrapTeamId = (payload: Record<string, unknown>): string =>
  normalizeRequiredString(String(payload.teamId ?? ""), "payload.teamId");

const normalizeOptionalBootstrapBindingField = (
  value: unknown,
  field: string,
): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string when provided.`);
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeBootstrapMemberBindingSnapshot = (
  raw: unknown,
  fieldPrefix: string,
): RunScopedMemberBinding => {
  if (!raw || typeof raw !== "object") {
    throw new Error(`${fieldPrefix} must be an object.`);
  }
  const payload = raw as Record<string, unknown>;
  const memberName = normalizeRequiredString(
    String(payload.memberName ?? ""),
    `${fieldPrefix}.memberName`,
  );
  const agentDefinitionId = normalizeRequiredString(
    String(payload.agentDefinitionId ?? ""),
    `${fieldPrefix}.agentDefinitionId`,
  );
  const llmModelIdentifier = normalizeRequiredString(
    String(payload.llmModelIdentifier ?? ""),
    `${fieldPrefix}.llmModelIdentifier`,
  );
  if (typeof payload.autoExecuteTools !== "boolean") {
    throw new Error(`${fieldPrefix}.autoExecuteTools must be a boolean.`);
  }

  const workspaceId =
    payload.workspaceId === null || payload.workspaceId === undefined
      ? null
      : normalizeRequiredString(String(payload.workspaceId), `${fieldPrefix}.workspaceId`);
  const workspaceRootPath = normalizeOptionalBootstrapBindingField(
    payload.workspaceRootPath,
    `${fieldPrefix}.workspaceRootPath`,
  );
  const llmConfig =
    payload.llmConfig && typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig)
      ? (payload.llmConfig as Record<string, unknown>)
      : null;
  const memberRouteKey = normalizeOptionalBootstrapBindingField(
    payload.memberRouteKey,
    `${fieldPrefix}.memberRouteKey`,
  );
  const memberAgentId = normalizeOptionalBootstrapBindingField(
    payload.memberAgentId,
    `${fieldPrefix}.memberAgentId`,
  );
  const memoryDir = normalizeOptionalBootstrapBindingField(
    payload.memoryDir,
    `${fieldPrefix}.memoryDir`,
  );
  const hostNodeId = normalizeOptionalBootstrapBindingField(
    payload.hostNodeId,
    `${fieldPrefix}.hostNodeId`,
  );

  return toRunScopedMemberBinding({
    memberName,
    agentDefinitionId,
    llmModelIdentifier,
    autoExecuteTools: payload.autoExecuteTools,
    workspaceId,
    workspaceRootPath,
    llmConfig,
    memberRouteKey,
    memberAgentId,
    memoryDir,
    hostNodeId,
  });
};

const normalizeBootstrapNodeType = (value: unknown, field: string): NodeType => {
  if (value === NodeType.AGENT || value === NodeType.AGENT_TEAM) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a valid node type string.`);
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === NodeType.AGENT) {
    return NodeType.AGENT;
  }
  if (normalized === NodeType.AGENT_TEAM) {
    return NodeType.AGENT_TEAM;
  }
  throw new Error(`${field} must be either '${NodeType.AGENT}' or '${NodeType.AGENT_TEAM}'.`);
};

export const normalizeBootstrapTeamDefinitionSnapshot = (
  raw: unknown,
): DomainAgentTeamDefinition | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("payload.teamDefinitionSnapshot must be an object when provided.");
  }
  const payload = raw as Record<string, unknown>;
  const name = normalizeRequiredString(String(payload.name ?? ""), "payload.teamDefinitionSnapshot.name");
  const description = normalizeRequiredString(
    String(payload.description ?? ""),
    "payload.teamDefinitionSnapshot.description",
  );
  const coordinatorMemberName = normalizeRequiredString(
    String(payload.coordinatorMemberName ?? ""),
    "payload.teamDefinitionSnapshot.coordinatorMemberName",
  );
  if (!Array.isArray(payload.nodes) || payload.nodes.length === 0) {
    throw new Error("payload.teamDefinitionSnapshot.nodes must be a non-empty array.");
  }

  const nodes = payload.nodes.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`payload.teamDefinitionSnapshot.nodes[${index}] must be an object.`);
    }
    const node = entry as Record<string, unknown>;
    const memberName = normalizeRequiredString(
      String(node.memberName ?? ""),
      `payload.teamDefinitionSnapshot.nodes[${index}].memberName`,
    );
    const referenceId = normalizeRequiredString(
      String(node.referenceId ?? ""),
      `payload.teamDefinitionSnapshot.nodes[${index}].referenceId`,
    );
    const referenceType = normalizeBootstrapNodeType(
      node.referenceType,
      `payload.teamDefinitionSnapshot.nodes[${index}].referenceType`,
    );
    const homeNodeId =
      normalizeOptionalString(
        typeof node.homeNodeId === "string" ? node.homeNodeId : null,
      ) ?? EMBEDDED_LOCAL_NODE_ID;
    return new DomainTeamMember({
      memberName,
      referenceId,
      referenceType,
      homeNodeId,
    });
  });

  return new DomainAgentTeamDefinition({
    name,
    description,
    coordinatorMemberName,
    nodes,
    role: normalizeOptionalString(typeof payload.role === "string" ? payload.role : null),
    avatarUrl: normalizeOptionalString(typeof payload.avatarUrl === "string" ? payload.avatarUrl : null),
  });
};

export const serializeTeamDefinitionSnapshot = (
  definition: DomainAgentTeamDefinition,
): Record<string, unknown> => ({
  name: definition.name,
  description: definition.description,
  coordinatorMemberName: definition.coordinatorMemberName,
  role: definition.role ?? null,
  avatarUrl: definition.avatarUrl ?? null,
  nodes: definition.nodes.map((node) => ({
    memberName: node.memberName,
    referenceId: node.referenceId,
    referenceType: node.referenceType,
    homeNodeId: node.homeNodeId ?? EMBEDDED_LOCAL_NODE_ID,
  })),
});

const normalizeHomeNodeId = (value: string | null | undefined): string => {
  const normalized = normalizeOptionalString(value);
  return normalized ?? EMBEDDED_LOCAL_NODE_ID;
};

const buildTeamDefinitionNodeSignature = (definition: DomainAgentTeamDefinition): string[] =>
  definition.nodes
    .map((node) =>
      [
        normalizeRequiredString(node.memberName, "teamDefinition.nodes[].memberName"),
        normalizeRequiredString(node.referenceId, "teamDefinition.nodes[].referenceId"),
        normalizeBootstrapNodeType(node.referenceType, "teamDefinition.nodes[].referenceType"),
        normalizeHomeNodeId(node.homeNodeId),
      ].join("|"),
    )
    .sort();

export const teamDefinitionMatchesSnapshot = (
  existing: DomainAgentTeamDefinition,
  snapshot: DomainAgentTeamDefinition,
): boolean => {
  if (existing.coordinatorMemberName !== snapshot.coordinatorMemberName) {
    return false;
  }
  const existingNodeSignature = buildTeamDefinitionNodeSignature(existing);
  const snapshotNodeSignature = buildTeamDefinitionNodeSignature(snapshot);
  if (existingNodeSignature.length !== snapshotNodeSignature.length) {
    return false;
  }
  for (let index = 0; index < existingNodeSignature.length; index += 1) {
    if (existingNodeSignature[index] !== snapshotNodeSignature[index]) {
      return false;
    }
  }
  return true;
};

export const toTeamDefinitionUpdate = (
  snapshot: DomainAgentTeamDefinition,
): AgentTeamDefinitionUpdate =>
  new AgentTeamDefinitionUpdate({
    name: snapshot.name,
    description: snapshot.description,
    coordinatorMemberName: snapshot.coordinatorMemberName,
    role: snapshot.role ?? null,
    avatarUrl: snapshot.avatarUrl ?? null,
    nodes: snapshot.nodes.map(
      (node) =>
        new DomainTeamMember({
          memberName: node.memberName,
          referenceId: node.referenceId,
          referenceType: node.referenceType,
          homeNodeId: normalizeHomeNodeId(node.homeNodeId),
        }),
    ),
  });

const normalizeMemberBindingForComparison = (binding: RunScopedMemberBindingInput) => ({
  memberName: normalizeRequiredString(binding.memberName, "memberBinding.memberName"),
  memberRouteKey: normalizeOptionalString(binding.memberRouteKey ?? null),
  memberAgentId: normalizeOptionalString(binding.memberAgentId ?? null),
  agentDefinitionId: normalizeRequiredString(
    binding.agentDefinitionId,
    "memberBinding.agentDefinitionId",
  ),
  llmModelIdentifier: normalizeRequiredString(
    binding.llmModelIdentifier,
    "memberBinding.llmModelIdentifier",
  ),
  autoExecuteTools: binding.autoExecuteTools,
  workspaceId: normalizeOptionalString(binding.workspaceId ?? null),
  workspaceRootPath: normalizeOptionalString(binding.workspaceRootPath ?? null),
  llmConfig: binding.llmConfig ?? null,
  memoryDir: normalizeOptionalString(binding.memoryDir ?? null),
  hostNodeId: normalizeOptionalString(binding.hostNodeId ?? null),
});

export const memberBindingsMatch = (
  existing: RunScopedMemberBindingInput[],
  requested: RunScopedMemberBindingInput[],
): boolean => {
  if (existing.length !== requested.length) {
    return false;
  }
  const sortKey = (binding: ReturnType<typeof normalizeMemberBindingForComparison>): string =>
    [binding.memberRouteKey ?? binding.memberName, binding.memberAgentId ?? ""].join("|");
  const existingNormalized = existing
    .map(normalizeMemberBindingForComparison)
    .sort((left, right) => sortKey(left).localeCompare(sortKey(right)));
  const requestedNormalized = requested
    .map(normalizeMemberBindingForComparison)
    .sort((left, right) => sortKey(left).localeCompare(sortKey(right)));
  return JSON.stringify(existingNormalized) === JSON.stringify(requestedNormalized);
};

export const normalizeBootstrapMemberBindingSnapshotList = (
  payload: Record<string, unknown>,
): RunScopedMemberBinding[] => {
  const list = Array.isArray(payload.memberBindings)
    ? payload.memberBindings
    : Array.isArray(payload.memberConfigs)
      ? payload.memberConfigs
      : null;
  if (!Array.isArray(list)) {
    throw new Error("payload.memberBindings must be an array.");
  }
  if (list.length === 0) {
    throw new Error("payload.memberBindings must include at least one member binding.");
  }
  return list.map((entry, index) =>
    normalizeBootstrapMemberBindingSnapshot(entry, `payload.memberBindings[${index}]`),
  );
};
