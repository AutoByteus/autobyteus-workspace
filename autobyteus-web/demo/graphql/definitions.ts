/** The demo's agent, Team and Org definitions and its workspace (autobyteus-279), derived from the world. */
import {
  AgentDefinitionOwnershipScope,
  AgentMemberRefScope,
  AgentOrgMemberScope,
  AgentOrgMemberType,
  AgentSkillScope,
  AgentTeamDefinitionOwnershipScope,
  type GetAgentDefinitionsQuery,
  type GetAgentOrgDefinitionsQuery,
  type GetAgentTeamDefinitionsQuery,
  type GetAllWorkspacesQuery,
} from '~/generated/graphql';
import { descriptionOf } from '../world/content/definitions';
import { DEMO_DEFAULT_LAUNCH, DEMO_WORKSPACE_NAME, DEMO_WORKSPACE_ROOT, type DemoDefinition, type DemoWorld } from '../world/DemoWorld';
import type { DemoGraphqlHandlers } from './operations';

export const DEMO_WORKSPACE_ID = 'demo-workspace';
/** The demo node's memory folder; only the agent detail's semantic memory path shows it. */
const DEMO_MEMORY_ROOT = '/demo/memory';

const defaultLaunchConfig = { __typename: 'DefaultLaunchConfig' as const, llmModelIdentifier: DEMO_DEFAULT_LAUNCH.llmModelIdentifier, runtimeKind: DEMO_DEFAULT_LAUNCH.runtimeKind, llmConfig: null };

const agentDefinition = (definition: DemoDefinition): GetAgentDefinitionsQuery['agentDefinitions'][number] => ({
  __typename: 'AgentDefinition', id: definition.id, name: definition.name, role: null, description: descriptionOf(definition.name),
  instructions: `You are ${definition.name}. ${descriptionOf(definition.name)}`, category: null, avatarUrl: null,
  toolNames: ['read_file', 'write_file', 'edit_file', 'list_directory', 'run_terminal_command'], inputProcessorNames: [],
  llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [],
  skillNames: [], skillScope: AgentSkillScope.Configured, ownershipScope: AgentDefinitionOwnershipScope.Shared, ownerTeamId: null,
  ownerTeamName: null, ownerApplicationId: null, ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null,
  // Every agent has semantic memory (autobyteus-554): its folder on the demo node, named as the node names it.
  internal: false, semanticMemoryPath: `${DEMO_MEMORY_ROOT}/semantic/${encodeURIComponent(definition.id)}`, personalSettings: [], personalSettingsBase: null,
  defaultLaunchConfig, loadIssue: null,
});

const memberRef = (world: DemoWorld, memberName: string, run: DemoDefinition): string => {
  // A member's agent definition: the agent the world's runs of this definition give that member.
  const member = world.allRuns().find((candidate) => candidate.definitionId === run.id)?.agents.find((agent) => agent.memberName === memberName);
  return member?.definitionId ?? memberName;
};

const teamDefinition = (world: DemoWorld, definition: DemoDefinition): GetAgentTeamDefinitionsQuery['agentTeamDefinitions'][number] => ({
  __typename: 'AgentTeamDefinition', id: definition.id, name: definition.name, description: descriptionOf(definition.name),
  instructions: descriptionOf(definition.name), category: null, avatarUrl: null, coordinatorMemberName: definition.members[0]!, revision: null,
  ownershipScope: AgentTeamDefinitionOwnershipScope.Shared, ownerTeamId: null, ownerTeamName: null, ownerApplicationId: null,
  ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null, personalSettings: [], personalSettingsBase: null,
  handoffs: [], defaultLaunchConfig,
  nodes: definition.members.map((memberName) => ({ __typename: 'TeamMember', memberName, ref: memberRef(world, memberName, definition), refScope: AgentMemberRefScope.Shared })),
  loadIssues: [],
});

const orgDefinition = (world: DemoWorld, definition: DemoDefinition): GetAgentOrgDefinitionsQuery['agentOrgDefinitions'][number] => ({
  __typename: 'AgentOrgDefinition', id: definition.id, name: definition.name, description: descriptionOf(definition.name),
  instructions: descriptionOf(definition.name), category: null, avatarUrl: null, revision: null, personalSettings: [], personalSettingsBase: null,
  handoffs: [],
  members: definition.members.map((memberName) => ({ __typename: 'AgentOrgMember', memberName, ref: memberRef(world, memberName, definition), refType: AgentOrgMemberType.Agent, refScope: AgentOrgMemberScope.Shared })),
  defaultLaunchConfig, loadIssues: [],
});

export const demoWorkspace = (): GetAllWorkspacesQuery['workspaces'][number] => ({
  __typename: 'WorkspaceMetadata', workspaceId: DEMO_WORKSPACE_ID, name: DEMO_WORKSPACE_NAME, displayName: DEMO_WORKSPACE_NAME,
  config: { root_path: DEMO_WORKSPACE_ROOT }, workspaceRootPath: DEMO_WORKSPACE_ROOT, absolutePath: DEMO_WORKSPACE_ROOT, kind: 'filesystem', isTemp: false,
});

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

export const definitionHandlers = {
  GetAgentDefinitions: (_variables, world) => ({ __typename: 'Query', agentDefinitions: world.definitions('agent').sort(byName).map(agentDefinition) }),
  GetAgentTeamDefinitions: (_variables, world) => ({ __typename: 'Query', agentTeamDefinitions: world.definitions('team').sort(byName).map((definition) => teamDefinition(world, definition)) }),
  GetAgentOrgDefinitions: (_variables, world) => ({ __typename: 'Query', agentOrgDefinitions: world.definitions('org').sort(byName).map((definition) => orgDefinition(world, definition)) }),
  GetAllWorkspaces: () => ({ __typename: 'Query', workspaces: [demoWorkspace()] }),
} satisfies Partial<DemoGraphqlHandlers>;
