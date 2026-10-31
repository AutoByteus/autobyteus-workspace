import type { AgentContext } from '~/types/agent/AgentContext'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import type { Project } from '~/types/project'
import type {
  AgentOrgRunHistoryItem,
  RunHistoryWorkspaceGroup,
  TeamRunHistoryDefinitionGroup,
  TeamTreeNode,
  WorkspaceHistoryWorkspaceNode,
} from '~/stores/runHistoryTypes'
import { buildRunHistoryTreeNodes, normalizeRootPath, resolveWorkspaceRootPath } from '~/stores/runHistoryReadModel'
import { buildTeamNodes, resolveTeamLastActivityAt, summarizeTeamDraft } from '~/stores/runHistoryTeamHelpers'
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows'
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport'
import { withoutRetiredRuns } from '~/stores/runHistoryRetiredRuns'
import { buildAgentOrgDefinitionGroups } from '~/utils/runTreeProjection'
import { DEFAULT_DRAFT_SUMMARY_PREFIX } from '~/utils/runTreeProjectionConstants'
import type { RootExecutionScope, TaskExecutionScope } from '~/utils/collaboration/taskExecutionScope'

export type ProjectRunRootKind = 'AGENT' | 'AGENT_TEAM' | 'AGENT_ORG'

/** One Project's read (`projectRunHistory`): its runs grouped like a workspace's, and each listed root's copies. */
export interface ProjectRunsSnapshot {
  projectId: string
  agentDefinitions: RunHistoryWorkspaceGroup['agentDefinitions']
  teamDefinitions: RunHistoryWorkspaceGroup['teamDefinitions']
  agentOrgRuns: AgentOrgRunHistoryItem[]
  /** By `projectRootKey(rootKind, rootRunId)`: the copy keys listed under the Project. */
  scopes: Record<string, TaskExecutionScope>
}

/** One Project in the tree: the same node types the workspace section renders. */
export interface ProjectRunsEntry {
  project: Project
  node: WorkspaceHistoryWorkspaceNode
  teams: TeamTreeNode[]
  teamHistoryGroups: TeamRunHistoryDefinitionGroup[]
  executionScopeOf: (rootKind: ProjectRunRootKind, rootRunId: string) => RootExecutionScope
}

/** Where a run is listed: a Project and the group under it (a run can be listed under several Projects). */
export interface ProjectRunAncestry { projectId: string; groupKey: string }

export interface ProjectRunsProjection {
  entries: ProjectRunsEntry[]
  runAncestryById: Record<string, ProjectRunAncestry[]>
  teamAncestryById: Record<string, ProjectRunAncestry[]>
  agentOrgAncestryById: Record<string, ProjectRunAncestry[]>
}

export interface ProjectRunsProjectionInput {
  /** The node's Projects, in the Projects pages' order. */
  projects: readonly Project[]
  snapshots: Readonly<Record<string, ProjectRunsSnapshot>>
  agentContexts: Map<string, AgentContext>
  teamContexts: AgentTeamContext[]
  agentAvatarByDefinitionId: Record<string, string>
  workspacesById: Parameters<typeof buildRunHistoryTreeNodes>[0]['workspacesById']
  /** Runs this session saw leave the history (archived or deleted): not listed, as in Workspaces. */
  retiredRunIds: ReadonlySet<string>
  /** A listed root's top-level copies that are in no scope yet (DS-004 trigger 5). */
  noteUnscoped: (projectId: string, copyKeys: readonly string[]) => void
}

export const projectRootKey = (rootKind: ProjectRunRootKind, rootRunId: string): string => `${rootKind}:${rootRunId}`

/** The grouping key of a Project's section: it takes the place a folder root has in Workspaces. */
export const projectSectionKey = (projectId: string): string => `project:${projectId}`

const NO_COPIES: TaskExecutionScope = new Set()

/**
 * The Projects tree (DS-003): every Project's snapshot turned into the node types the workspace section renders, by
 * the same builders (`buildRunHistoryTreeNodes`, which applies `buildRunTreeProjection` and the live context overlay
 * `mergeRunTreeWithLiveContexts`, and `buildTeamNodes`), with one grouping key per Project given through their
 * workspace descriptor and root resolvers. Local runs come from the contexts listed in the snapshot or launched under
 * the Project; the ancestry indexes say where each run is listed, for the open-run reveal. Pure.
 */
export const buildProjectRunsProjection = (input: ProjectRunsProjectionInput): ProjectRunsProjection => {
  const projection: ProjectRunsProjection = { entries: [], runAncestryById: {}, teamAncestryById: {}, agentOrgAncestryById: {} }
  const add = (index: Record<string, ProjectRunAncestry[]>, runId: string, ancestry: ProjectRunAncestry) => {
    index[runId] = [...index[runId] ?? [], ancestry]
  }
  for (const project of input.projects) {
    const snapshot = input.snapshots[project.projectId]
    if (!snapshot) continue
    const entry = buildProjectEntry(project, snapshot, input)
    projection.entries.push(entry)
    const projectId = project.projectId
    entry.node.agents.forEach((agent) => agent.runs.forEach((run) =>
      add(projection.runAncestryById, run.runId, { projectId, groupKey: agent.agentDefinitionId })))
    for (const group of entry.teamHistoryGroups) {
      const groupKey = group.teamDefinitionId.trim() || group.teamDefinitionName.trim()
      group.runs.forEach((run) => add(projection.teamAncestryById, run.teamRunId, { projectId, groupKey: groupKey || run.teamRunId }))
    }
    for (const group of entry.node.agentOrgDefinitions) {
      group.runs.forEach((run) => add(projection.agentOrgAncestryById, run.rootRunId, { projectId, groupKey: group.definitionId }))
    }
  }
  return projection
}

const buildProjectEntry = (project: Project, snapshot: ProjectRunsSnapshot, input: ProjectRunsProjectionInput): ProjectRunsEntry => {
  const root = projectSectionKey(project.projectId)
  const listedAgentRunIds = new Set(snapshot.agentDefinitions.flatMap((group) => group.runs.map((run) => run.runId)))
  const listedTeamRunIds = new Set(snapshot.teamDefinitions.flatMap((group) => group.runs.map((run) => run.teamRunId)))
  // A context belongs here when its run is listed, or it was launched under the Project and is not read yet.
  const agentContexts = new Map<string, AgentContext>()
  for (const [runId, context] of input.agentContexts) {
    if (listedAgentRunIds.has(runId) || context.config.projectId === project.projectId) agentContexts.set(runId, context)
  }
  const sources = withoutRetiredRuns({
    workspaceGroups: [{
      workspaceRootPath: root,
      workspaceName: project.name,
      agentDefinitions: snapshot.agentDefinitions,
      teamDefinitions: snapshot.teamDefinitions,
    }],
    agentContexts,
    teamContexts: input.teamContexts.filter((context) => listedTeamRunIds.has(context.view.getRootTeamRunId())),
  }, input.retiredRunIds)
  const group = sources.workspaceGroups[0]!

  // The Project key takes the folder's place: the descriptor names the section, the contexts are placed under it.
  const placed = new Map([...sources.agentContexts].map(([runId, context]) => [runId, {
    config: { ...context.config, workspaceMetadata: { ...(context.config.workspaceMetadata ?? {}), workspaceRootPath: root } },
    state: context.state,
  }]))
  const [established] = buildRunHistoryTreeNodes({
    workspaceGroups: [group],
    agentAvatarByDefinitionId: input.agentAvatarByDefinitionId,
    allWorkspaces: [{ workspaceId: root, workspaceRootPath: root, name: project.name, kind: 'filesystem' }],
    workspacesById: {},
    agentContexts: placed as unknown as Map<string, AgentContext>,
  })
  const node: WorkspaceHistoryWorkspaceNode = {
    workspaceKind: established?.workspaceKind ?? 'filesystem',
    agents: established?.agents ?? [],
    stableKey: root,
    workspaceId: root,
    workspaceRootPath: root,
    workspaceName: project.name,
    canRemoveFromWorkspaces: false,
    agentOrgDefinitions: buildAgentOrgDefinitionGroups(snapshot.agentOrgRuns.filter((run) => !input.retiredRunIds.has(run.rootRunId))),
  }

  const teamContextById = new Map(sources.teamContexts.map((context) => [context.view.getRootTeamRunId(), context]))
  const teams = buildTeamNodes({
    teamRuns: flattenWorkspaceTeamRuns([group]).map((run) => ({ ...run, workspaceRootPath: root })),
    teamContexts: sources.teamContexts,
    normalizeRootPath,
    // Members keep their own folders; the Team run is placed under the Project.
    resolveWorkspaceRootPath: (workspaceId) => resolveWorkspaceRootPath(input.workspacesById, workspaceId),
    resolveWorkspaceRootPathFromContext: () => root,
    summarizeTeamDraft: (context) => summarizeTeamDraft(context, DEFAULT_DRAFT_SUMMARY_PREFIX),
    resolveTeamLastActivityAt,
    unassignedWorkspaceKey: root,
  }).map((team) => {
    const context = teamContextById.get(team.teamRunId) ?? null
    const focused = { ...team, focusedAgentRunId: context?.view.getFocusedAgentRunId() ?? team.focusedAgentRunId }
    return { ...focused, executionRows: buildRunHistoryTeamExecutionRows(focused, context) }
  })

  const scopes = new Map<string, RootExecutionScope>()
  const executionScopeOf = (rootKind: ProjectRunRootKind, rootRunId: string): RootExecutionScope => {
    const key = projectRootKey(rootKind, rootRunId)
    let scope = scopes.get(key)
    if (!scope) {
      scope = Object.freeze({
        copies: snapshot.scopes[key] ?? NO_COPIES,
        noteUnscoped: (copyKeys: readonly string[]) => input.noteUnscoped(project.projectId, copyKeys),
      })
      scopes.set(key, scope)
    }
    return scope
  }
  return { project, node, teams, teamHistoryGroups: group.teamDefinitions, executionScopeOf }
}
