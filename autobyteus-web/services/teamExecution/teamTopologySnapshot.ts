import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import { jsonValueSchema, type JsonValue } from '@autobyteus/team-stream-contracts';
import type { AgentTeamAddress } from '~/types/agent/TeamExecutionAddress';
import { memberAddressBasename } from '~/types/agent/TeamExecutionAddress';
import type {
  TeamRunMetadataAgentMember,
  TeamRunMetadataMember,
  TeamRunMetadataPayload,
  TeamRunMetadataSubTeamMember,
} from '~/stores/runHistoryTypes';

interface TeamTopologyNodeBase {
  readonly address: AgentTeamAddress;
  readonly displayName: string;
  readonly role: string | null;
  readonly description: string | null;
}

export interface TeamTopologyAgentNode extends TeamTopologyNodeBase {
  readonly kind: 'agent';
  readonly agentDefinitionId: string;
  readonly runtimeKind: string;
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly skillAccessMode: string;
  readonly llmConfig: Readonly<{ readonly [key: string]: JsonValue }> | null;
  readonly workspaceRootPath: string | null;
}

export interface TeamTopologyAgentTeamNode extends TeamTopologyNodeBase {
  readonly kind: 'agent_team';
  readonly teamDefinitionId: string;
  readonly coordinatorAddress: AgentTeamAddress;
  readonly children: readonly TeamTopologyNode[];
}

export type TeamTopologyNode = TeamTopologyAgentNode | TeamTopologyAgentTeamNode;

export interface TeamTopologySnapshot {
  readonly teamDefinitionName: string;
  readonly rootTeam: TeamTopologyAgentTeamNode;
  getNode(address: AgentTeamAddress): TeamTopologyNode | null;
  listNodes(): readonly TeamTopologyNode[];
  getConfigurationView(): Readonly<TeamRunConfig>;
}

const freezeJson = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeJson));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, freezeJson(entry)])));
  }
  return value;
};

const freezeJsonObject = (value: Record<string, unknown> | null | undefined): Readonly<{ readonly [key: string]: JsonValue }> | null => {
  if (value == null) return null;
  const parsed = jsonValueSchema.safeParse(value);
  if (!parsed.success || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('Team model configuration must be one JSON-safe object.');
  }
  return freezeJson(parsed.data) as Readonly<{ readonly [key: string]: JsonValue }>;
};

const freezeConfigurationView = (configuration: TeamRunConfig): Readonly<TeamRunConfig> => Object.freeze({
  ...configuration,
  workspaceMetadata: configuration.workspaceMetadata ? Object.freeze({ ...configuration.workspaceMetadata }) : null,
  llmConfig: freezeJsonObject(configuration.llmConfig) as Record<string, unknown> | null,
  memberOverrides: Object.freeze(Object.fromEntries(Object.entries(configuration.memberOverrides).map(([address, override]) => [
    address,
    Object.freeze({
      ...override,
      llmConfig: freezeJsonObject(override.llmConfig) as Record<string, unknown> | null,
    }),
  ]))),
});

const projectMember = (member: TeamRunMetadataMember, isRoot = false): TeamTopologyNode => {
  const common = {
    address: member.address,
    displayName: isRoot ? '/' : memberAddressBasename(member.address),
    role: member.role ?? null,
    description: member.description ?? null,
  } as const;
  if (member.kind === 'agent') {
    return Object.freeze({
      ...common,
      kind: 'agent',
      agentDefinitionId: member.agentDefinitionId,
      runtimeKind: member.runtimeKind,
      llmModelIdentifier: member.llmModelIdentifier,
      autoExecuteTools: member.autoExecuteTools,
      skillAccessMode: member.skillAccessMode ?? 'NONE',
      llmConfig: freezeJsonObject(member.llmConfig),
      workspaceRootPath: member.workspaceRootPath,
    } satisfies TeamTopologyAgentNode);
  }
  return Object.freeze({
    ...common,
    kind: 'agent_team',
    teamDefinitionId: member.teamDefinitionId,
    coordinatorAddress: member.coordinatorAddress,
    children: Object.freeze(member.children.map((child) => projectMember(child))),
  } satisfies TeamTopologyAgentTeamNode);
};

const collectNodes = (root: TeamTopologyAgentTeamNode): readonly TeamTopologyNode[] => {
  const result: TeamTopologyNode[] = [];
  const visit = (node: TeamTopologyNode): void => {
    result.push(node);
    if (node.kind === 'agent_team') node.children.forEach(visit);
  };
  visit(root);
  return Object.freeze(result);
};

export const createTeamTopologySnapshot = (input: {
  metadata: TeamRunMetadataPayload;
  configuration: TeamRunConfig;
}): TeamTopologySnapshot => {
  const projectedRoot = projectMember(input.metadata.rootTeam as TeamRunMetadataSubTeamMember, true);
  if (projectedRoot.kind !== 'agent_team' || projectedRoot.address !== '/') {
    throw new Error('Team topology requires one canonical root AgentTeam.');
  }
  const rootTeam = Object.freeze({ ...projectedRoot, displayName: input.metadata.teamDefinitionName });
  const nodes = collectNodes(rootTeam);
  const byAddress = new Map(nodes.map((node) => [node.address, node] as const));
  if (byAddress.size !== nodes.length) throw new Error('Team topology contains duplicate canonical addresses.');
  const configuration = freezeConfigurationView(input.configuration);
  return Object.freeze({
    teamDefinitionName: input.metadata.teamDefinitionName,
    rootTeam,
    getNode: (address: AgentTeamAddress) => byAddress.get(address) ?? null,
    listNodes: () => nodes,
    getConfigurationView: () => configuration,
  });
};

export const listTopologyAgents = (topology: TeamTopologySnapshot): readonly TeamTopologyAgentNode[] =>
  topology.listNodes().filter((node): node is TeamTopologyAgentNode => node.kind === 'agent');
