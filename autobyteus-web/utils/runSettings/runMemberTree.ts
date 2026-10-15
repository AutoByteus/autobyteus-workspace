import type { ConfiguredMemberExecutionDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import {
  MEMBER_RUN_SETTING_FIELDS,
  PLACED_TEAM_RUN_SETTING_FIELDS,
  type RunSettingField,
  type RunSettingFlags,
  type RunSettingsValues,
} from '~/types/runSettings/RunSettings'
import type { ExistingHierarchicalModelConfigDraft } from '~/services/runConfigEditing/existingHierarchicalModelConfigDraft'
import type { ExistingAgentOrgWorkspaceDraft } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { onlyModelOptions, otherModelSettingKeys, withoutModelOptions } from '~/utils/runSettings/modelOptions'
import { isAutoApproveLockedForRuntime } from '~/utils/agentRunRuntimeDraftPolicy'
import { modelConfigsEqual } from '~/utils/teamRunConfigUtils'
import { resolveMemberSettings } from '~/utils/runSettings/memberOverrides'
import type { MemberLaunchNote } from '~/utils/runSettings/memberLaunchDefaults'

/**
 * The member tree of a Team (New chat), an Org (the Org launch page) or a saved run: every member
 * and placed team with the settings it runs with, what it inherits, and which settings it sets
 * itself. One projection for the Member settings drawer and the saved-run Members list.
 */
export interface RunMemberNode {
  key: AgentTeamAddress
  kind: 'agent' | 'team'
  name: string
  isCoordinator: boolean
  /** What this member runs with. */
  values: RunSettingsValues
  /** What it would run with if it set nothing itself (its team's, or the Team/Org settings). */
  parentValues: RunSettingsValues
  fields: readonly RunSettingField[]
  /** Settings this member sets itself. Thinking counts only when the thinking settings differ. */
  customized: RunSettingFlags
  /** The other model settings (e.g. `service_tier`) this member sets itself. */
  customizedOptionKeys: readonly string[]
  /** No model chosen anywhere up the tree. */
  modelRequired: boolean
  /** Notes on this row: an own default a fresh start could not use, or a copy's recorded fallbacks. */
  launchNotes: readonly RunMemberNote[]
  /** A delegated copy (read-only Settings rows): how it joined the run. */
  badge?: 'delegated_copy'
  /** A delegated copy: where its launch came from (absent once the user chose its model). */
  sourceKey?: RunMemberLaunchSource
  /** A delegated copy row: what the user can stop and change on it (SR-007). */
  delegated?: RunMemberDelegatedFacts
  /** This row's own locks; when set they replace its section's. */
  locked?: RunSettingFlags
  children: readonly RunMemberNode[]
}

/**
 * The user's control of a delegated copy row: where its model choice is recorded
 * (`agent:<run ID>` or `team:<run ID>`), the model it runs with before this edit, what its stop
 * icon stops (only the copy itself, never one member of a Team), and whether its
 * copy is running (its model is locked until it is stopped).
 */
export type RunMemberDelegatedFacts = Readonly<{
  target: `agent:${string}` | `team:${string}`
  original: Readonly<{ llmModelIdentifier: string; llmConfig: Record<string, unknown> | null }>
  stop: Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }> | null
  running: boolean
  stopping: boolean
}>

/** Where a delegated copy's launch came from (`configured`: a copy of an in-run placement). */
export type RunMemberLaunchSource = 'agent_default' | 'team_default' | 'inherited' | 'configured' | 'not_recorded'

/** A recorded configured layer a copy skipped, with the server's reason. */
export type RunMemberLaunchFallback = Readonly<{
  layer: 'agent_default' | 'team_default'
  runtimeKind: string | null
  llmModelIdentifier: string | null
  detail: string
}>

export type RunMemberNote =
  | (Readonly<{ kind: 'unusable_default' }> & MemberLaunchNote)
  | (Readonly<{ kind: 'fallback' }> & RunMemberLaunchFallback)

/** Notes on a row and every row below it (a collapsed copy Team shows their count). */
export const countRunMemberNotes = (node: RunMemberNode): number =>
  node.launchNotes.length + node.children.reduce((total, child) => total + countRunMemberNotes(child), 0)

/** A launch form's seeded rows (DS-006): pinned rows keep their own model; notes explain unusable defaults. */
export type RunMemberSeedMarks = Readonly<{
  pinnedAddresses?: readonly AgentTeamAddress[]
  launchNotes?: Readonly<Record<AgentTeamAddress, MemberLaunchNote>>
}>

export interface RunMemberTreeDeps {
  schemaFor(runtimeKind: string, llmModelIdentifier: string): UiModelConfigSchema | null
  sameWorkspace(left: RunWorkspaceChoice | null, right: RunWorkspaceChoice | null): boolean
}

export const isRunMemberCustomized = (node: RunMemberNode): boolean =>
  Object.values(node.customized).some(Boolean) || node.customizedOptionKeys.length > 0

/** Members and placed teams that set something themselves ("n" in "n of N customized"). */
export const countCustomizedMembers = (nodes: readonly RunMemberNode[]): number =>
  nodes.reduce((total, node) => total + (isRunMemberCustomized(node) ? 1 : 0) + countCustomizedMembers(node.children), 0)

/** Agent members ("N" in "All N members use these settings"). */
export const countAgentMembers = (nodes: readonly RunMemberNode[]): number =>
  nodes.reduce((total, node) => total + (node.kind === 'agent' ? 1 : countAgentMembers(node.children)), 0)

export const findRunMember = (nodes: readonly RunMemberNode[], key: string): RunMemberNode | null => {
  for (const node of nodes) {
    if (node.key === key) return node
    const child = findRunMember(node.children, key)
    if (child) return child
  }
  return null
}

const customization = (
  values: RunSettingsValues,
  parent: RunSettingsValues,
  fields: readonly RunSettingField[],
  deps: RunMemberTreeDeps,
  pinned: boolean,
): Pick<RunMemberNode, 'customized' | 'customizedOptionKeys'> => {
  // A pinned (seeded) row's model is its own even when it equals the parent's.
  const model = pinned || values.runtimeKind !== parent.runtimeKind || values.llmModelIdentifier !== parent.llmModelIdentifier
  const schema = values.llmModelIdentifier ? deps.schemaFor(values.runtimeKind, values.llmModelIdentifier) : null
  // With its own model a member's thinking belongs to that model; it is reset with the model.
  const thinking = !model && !modelConfigsEqual(withoutModelOptions(schema, values.llmConfig), withoutModelOptions(schema, parent.llmConfig))
  const own = onlyModelOptions(schema, values.llmConfig) ?? {}
  const inherited = onlyModelOptions(schema, parent.llmConfig) ?? {}
  const customizedOptionKeys = model ? [] : otherModelSettingKeys(schema)
    .filter((key) => JSON.stringify(own[key] ?? null) !== JSON.stringify(inherited[key] ?? null))
  return {
    customized: {
      model,
      thinking,
      // A runtime that always auto-approves fixes the value; that is not a customization.
      approval: values.autoExecuteTools !== parent.autoExecuteTools && !isAutoApproveLockedForRuntime(values.runtimeKind),
      workspace: fields.includes('workspace') && !deps.sameWorkspace(values.workspace, parent.workspace),
    },
    customizedOptionKeys,
  }
}

/** A copy's read-only row facts (DS-007): badge, launch source and recorded fallbacks. */
export type RunMemberLaunchFacts = Readonly<{
  badge?: RunMemberNode['badge']
  /** Absent: the user chose this row's model, so no origin is shown (SR-007). */
  sourceKey?: RunMemberLaunchSource
  notes: readonly RunMemberNote[]
}>

export const memberNode = (input: Readonly<{
  key: AgentTeamAddress
  kind: 'agent' | 'team'
  name: string
  isCoordinator?: boolean
  values: RunSettingsValues
  parentValues: RunSettingsValues
  fields: readonly RunSettingField[]
  children?: readonly RunMemberNode[]
  marks?: RunMemberSeedMarks
  launch?: RunMemberLaunchFacts
  delegated?: RunMemberDelegatedFacts
  locked?: RunSettingFlags
}>, deps: RunMemberTreeDeps): RunMemberNode => Object.freeze({
  key: input.key,
  kind: input.kind,
  name: input.name,
  isCoordinator: Boolean(input.isCoordinator),
  values: input.values,
  parentValues: input.parentValues,
  fields: input.fields,
  ...customization(input.values, input.parentValues, input.fields, deps, Boolean(input.marks?.pinnedAddresses?.includes(input.key))),
  // A recorded launch is what ran; it never asks for a model.
  modelRequired: !input.launch && !input.values.llmModelIdentifier.trim(),
  launchNotes: Object.freeze(input.launch?.notes ?? seededNotes(input.marks, input.key)),
  ...(input.launch?.badge ? { badge: input.launch.badge } : {}),
  ...(input.launch?.sourceKey ? { sourceKey: input.launch.sourceKey } : {}),
  ...(input.delegated ? { delegated: input.delegated } : {}),
  ...(input.locked ? { locked: input.locked } : {}),
  children: Object.freeze([...(input.children ?? [])]),
})

const seededNotes = (marks: RunMemberSeedMarks | undefined, key: AgentTeamAddress): RunMemberNote[] => {
  const note = marks?.launchNotes?.[key]
  return note ? [{ kind: 'unusable_default', ...note }] : []
}

const agentMember = (
  key: AgentTeamAddress,
  name: string,
  parent: RunSettingsValues,
  override: AgentConfigOverride | null | undefined,
  deps: RunMemberTreeDeps,
  isCoordinator = false,
  marks?: RunMemberSeedMarks,
): RunMemberNode => memberNode({
  key, kind: 'agent', name, isCoordinator, parentValues: parent, fields: MEMBER_RUN_SETTING_FIELDS,
  values: { ...resolveMemberSettings(parent, override), workspace: parent.workspace }, marks,
}, deps)

/** A Team New chat: its (flat) members under the composer's settings. */
export const buildTeamMemberTree = (input: Readonly<{
  team: Pick<AgentTeamDefinition, 'coordinatorMemberName' | 'nodes'>
  root: RunSettingsValues
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
}> & RunMemberSeedMarks, deps: RunMemberTreeDeps): readonly RunMemberNode[] => Object.freeze(input.team.nodes.map((node) => {
  const name = node.memberName.trim()
  const address: AgentTeamAddress = `/${name}`
  return agentMember(address, name, input.root, input.agentOverrides[address], deps, node.memberName === input.team.coordinatorMemberName, input)
}))

export type OrgMemberTreeDiagnostic = Readonly<{
  code: 'INVALID_MEMBER_ADDRESS' | 'DUPLICATE_ADDRESS' | 'MISSING_TEAM_DEFINITION' | 'INVALID_TEAM_COORDINATOR'
    | 'STALE_TEAM_OVERRIDE' | 'STALE_AGENT_OVERRIDE'
  message: string
}>

export type OrgMemberTree =
  | Readonly<{ status: 'ready'; nodes: readonly RunMemberNode[] }>
  | Readonly<{ status: 'blocked'; diagnostic: OrgMemberTreeDiagnostic }>

class OrgTopologyFailure extends Error {
  constructor(readonly diagnostic: OrgMemberTreeDiagnostic) { super(diagnostic.message) }
}
const fail = (code: OrgMemberTreeDiagnostic['code'], message: string): never => {
  throw new OrgTopologyFailure(Object.freeze({ code, message }))
}
const placementAddress = (memberName: string, parent: AgentTeamAddress = '/'): AgentTeamAddress => {
  if (!memberName || memberName !== memberName.trim() || memberName.includes('/') || memberName.includes('\\')
    || memberName === '.' || memberName === '..') {
    fail('INVALID_MEMBER_ADDRESS', `AgentOrg configuration has invalid member name '${memberName}' below '${parent}'.`)
  }
  return parent === '/' ? `/${memberName}` : `${parent}/${memberName}`
}

/**
 * An Org launch: placed teams (with their workspace) and their members, and direct agents, under the
 * Org card's settings. The Org's topology is checked here; a broken one blocks the launch.
 */
export const buildOrgMemberTree = (input: Readonly<{
  org: Pick<AgentOrgDefinition, 'members'>
  root: RunSettingsValues
  getTeamDefinitionById: (id: string) => Pick<AgentTeamDefinition, 'name' | 'coordinatorMemberName' | 'nodes'> | null
  getAgentDisplayNameById: (id: string) => string | null
  teamOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
  teamWorkspaces: Readonly<Record<AgentTeamAddress, RunWorkspaceChoice>>
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
}> & RunMemberSeedMarks, deps: RunMemberTreeDeps): OrgMemberTree => {
  try {
    const occupied = new Set<AgentTeamAddress>()
    const teams = new Set<AgentTeamAddress>()
    const agents = new Set<AgentTeamAddress>()
    const claim = (address: AgentTeamAddress, kind: 'Agent' | 'Team') => {
      if (occupied.has(address)) fail('DUPLICATE_ADDRESS', `AgentOrg configuration has duplicate ${kind} address '${address}'.`)
      occupied.add(address)
      ;(kind === 'Team' ? teams : agents).add(address)
    }
    const nodes = input.org.members.map((member): RunMemberNode => {
      const address = placementAddress(member.memberName)
      if (member.refType === 'AGENT') {
        claim(address, 'Agent')
        return agentMember(address, input.getAgentDisplayNameById(member.ref) ?? member.memberName,
          input.root, input.agentOverrides[address], deps, false, input)
      }
      claim(address, 'Team')
      const definition = input.getTeamDefinitionById(member.ref)
        ?? fail('MISSING_TEAM_DEFINITION', `AgentOrg configuration cannot resolve Team '${address}' (${member.ref}).`)
      if (definition.nodes.filter((node) => node.memberName === definition.coordinatorMemberName).length !== 1) {
        fail('INVALID_TEAM_COORDINATOR',
          `AgentOrg configuration Team '${address}' has no exact coordinator member '${definition.coordinatorMemberName}'.`)
      }
      const teamValues: RunSettingsValues = {
        ...resolveMemberSettings(input.root, input.teamOverrides[address]),
        workspace: input.teamWorkspaces[address] ?? input.root.workspace,
      }
      const children = definition.nodes.map((node) => {
        const childAddress = placementAddress(node.memberName, address)
        claim(childAddress, 'Agent')
        return agentMember(childAddress, node.memberName, teamValues, input.agentOverrides[childAddress], deps,
          node.memberName === definition.coordinatorMemberName, input)
      })
      return memberNode({
        key: address, kind: 'team', name: definition.name, values: teamValues, parentValues: input.root,
        fields: PLACED_TEAM_RUN_SETTING_FIELDS, children, marks: input,
      }, deps)
    })
    for (const address of [...Object.keys(input.teamOverrides), ...Object.keys(input.teamWorkspaces)]) {
      if (!teams.has(address)) fail('STALE_TEAM_OVERRIDE', `AgentOrg configuration has stale Team override '${address}'.`)
    }
    for (const address of Object.keys(input.agentOverrides)) {
      if (!agents.has(address)) fail('STALE_AGENT_OVERRIDE', `AgentOrg configuration has stale Agent override '${address}'.`)
    }
    return Object.freeze({ status: 'ready' as const, nodes: Object.freeze(nodes) })
  } catch (cause) {
    if (cause instanceof OrgTopologyFailure) return Object.freeze({ status: 'blocked' as const, diagnostic: cause.diagnostic })
    throw cause
  }
}

type SavedPlanner = ExistingHierarchicalModelConfigDraft
type SavedLaunch = Readonly<{
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  workspaceRootPath: string | null
}>

export type SavedRunMemberTreeInput =
  | Readonly<{ kind: 'team'; tree: TeamRunExecutionTreeDto; planner: SavedPlanner }>
  | Readonly<{ kind: 'agent_org'; tree: AgentOrgExecutionTree; planner: SavedPlanner; workspaceDraft: ExistingAgentOrgWorkspaceDraft }>

export type SavedRunMemberTree = Readonly<{
  name: string
  root: RunSettingsValues
  nodes: readonly RunMemberNode[]
}>

const nameAt = (address: string): string => address.split('/').filter(Boolean).at(-1) ?? address

/**
 * A saved Team or Org run: what each scope was saved with, with this edit's model and thinking
 * (`planner.draftSelection`; non-customized members follow their parent's edit) and, for a placed
 * team, its edited workspace. Runtime, approval and member workspaces stay as saved.
 */
export const buildSavedRunMemberTree = (
  input: SavedRunMemberTreeInput,
  deps: RunMemberTreeDeps & { workspaceFromRootPath(rootPath: string | null): RunWorkspaceChoice | null },
): SavedRunMemberTree => {
  const values = (address: string, launch: SavedLaunch, workspace?: RunWorkspaceChoice | null): RunSettingsValues => {
    const scope = input.planner.scopesByAddress[address]
    if (!scope) throw new Error(`Saved run settings are missing configured scope '${address}'.`)
    return {
      workspace: workspace !== undefined ? workspace : deps.workspaceFromRootPath(launch.workspaceRootPath),
      runtimeKind: launch.runtimeKind,
      llmModelIdentifier: scope.draftSelection.llmModelIdentifier,
      llmConfig: scope.draftSelection.llmConfig,
      autoExecuteTools: launch.autoExecuteTools,
    }
  }
  if (input.kind === 'team') {
    const teamLaunch = (launch: TeamRunExecutionTreeDto['root_team']['default_launch_configuration']): SavedLaunch => ({
      runtimeKind: launch.runtime_kind,
      llmModelIdentifier: launch.llm_model_identifier,
      llmConfig: launch.llm_config,
      autoExecuteTools: launch.auto_execute_tools,
      workspaceRootPath: launch.workspace_root_path,
    })
    const root = values('/', teamLaunch(input.tree.root_team.default_launch_configuration))
    const visit = (members: readonly ConfiguredMemberExecutionDto[], parent: RunSettingsValues, coordinator: string): RunMemberNode[] =>
      members.map((member) => {
        if (member.kind === 'configured_agent') {
          return memberNode({
            key: member.address, kind: 'agent', name: nameAt(member.address), isCoordinator: member.address === coordinator,
            values: { ...values(member.address, teamLaunch(member.launch_configuration)), workspace: parent.workspace },
            parentValues: parent, fields: MEMBER_RUN_SETTING_FIELDS,
          }, deps)
        }
        const teamValues = { ...values(member.address, teamLaunch(member.default_launch_configuration)), workspace: parent.workspace }
        return memberNode({
          key: member.address, kind: 'team', name: nameAt(member.address), values: teamValues, parentValues: parent,
          fields: MEMBER_RUN_SETTING_FIELDS, children: visit(member.members, teamValues, member.coordinator_address),
        }, deps)
      })
    return Object.freeze({
      name: input.tree.root_team.team_definition_name,
      root,
      nodes: Object.freeze(visit(input.tree.root_team.members, root, input.tree.root_team.coordinator_address)),
    })
  }
  const org = input.tree.rootOrg
  const root = values('/', org.defaultLaunchConfiguration)
  const nodes = org.members.map((member): RunMemberNode => {
    if ('agentRunId' in member) {
      return memberNode({
        key: member.address, kind: 'agent', name: member.role || nameAt(member.address),
        values: { ...values(member.address, member.launchConfiguration), workspace: root.workspace },
        parentValues: root, fields: MEMBER_RUN_SETTING_FIELDS,
      }, deps)
    }
    const edited = input.workspaceDraft[member.address]
    const teamWorkspace = deps.workspaceFromRootPath(edited?.rootPath ?? member.defaultLaunchConfiguration.workspaceRootPath)
    const teamValues = values(member.address, member.defaultLaunchConfiguration, teamWorkspace)
    return memberNode({
      key: member.address, kind: 'team', name: member.role || nameAt(member.address), values: teamValues, parentValues: root,
      fields: PLACED_TEAM_RUN_SETTING_FIELDS,
      children: member.members.map((agent) => memberNode({
        key: agent.address, kind: 'agent', name: agent.role || nameAt(agent.address),
        isCoordinator: agent.address === member.coordinatorAddress,
        values: { ...values(agent.address, agent.launchConfiguration), workspace: teamValues.workspace },
        parentValues: teamValues, fields: MEMBER_RUN_SETTING_FIELDS,
      }, deps)),
    }, deps)
  })
  return Object.freeze({ name: org.orgDefinitionName, root, nodes: Object.freeze(nodes) })
}
