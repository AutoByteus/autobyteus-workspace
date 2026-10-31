/**
 * projectRunsProjection (projects-tree-one-place, autobyteus-353; REQ-001, REQ-002, AC-002): each Project's snapshot
 * (the runs started under it) is built into the workspace node types, keyed by Project, with live status from the run's
 * context and a run launched under the Project shown before the next read; each run has one ancestry (its Project);
 * no Org groups; archived (retired) runs left out.
 */
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { Project } from '~/types/project'
import { buildProjectRunsProjection, projectSectionKey, type ProjectRunsSnapshot } from '../projectRunsProjection'

const project = (projectId: string, name = projectId): Project => ({ projectId, name, description: '', createdAt: '', updatedAt: '',
  workspaces: [], openTaskCount: 0, taskCount: 0 })

const snapshot = (projectId: string, runIds: string[]): ProjectRunsSnapshot => ({
  projectId,
  agentDefinitions: runIds.length ? [{ agentDefinitionId: 'pm', agentName: 'Project Task Manager', runs: runIds.map((runId) => ({
    runId, summary: `run ${runId}`, createdAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, status: AgentStatus.Offline,
    isActive: false, shouldConnectStream: false, statusSource: 'TEST', hasCollaboration: true,
  })) }] : [],
  teamDefinitions: [],
})

const context = (runId: string, status: AgentStatus, projectId?: string) => {
  const created = new AgentContext({
    agentDefinitionId: 'pm', agentDefinitionName: 'Project Task Manager', llmModelIdentifier: 'm', runtimeKind: 'autobyteus' as never,
    workspaceId: null, workspaceMetadata: { workspaceRootPath: '/Users/me/folder' } as never, autoExecuteTools: false, isLocked: false,
    llmConfig: null, ...(projectId ? { projectId } : {}),
  }, new AgentRunState(runId, { id: runId, messages: [], createdAt: '2026-10-31T01:00:00.000Z', updatedAt: '2026-10-31T01:00:00.000Z', agentDefinitionId: 'pm' }))
  created.state.currentStatus = status
  return created
}

const build = (overrides: Partial<Parameters<typeof buildProjectRunsProjection>[0]> = {}) => {
  setActivePinia(createPinia())
  return buildProjectRunsProjection({
    projects: [project('P', 'AutoByteus'), project('Q', 'Prototype Launch')],
    snapshots: { P: snapshot('P', ['pm-p']), Q: snapshot('Q', []) },
    agentContexts: new Map(),
    teamContexts: [],
    agentAvatarByDefinitionId: {},
    workspacesById: {},
    retiredRunIds: new Set(),
    ...overrides,
  })
}

describe('buildProjectRunsProjection', () => {
  it('lists each Project with the runs started under it, keyed by Project, one ancestry per run, no Org groups (REQ-001)', () => {
    const projection = build()
    expect(projection.entries.map((entry) => [entry.node.stableKey, entry.node.workspaceName])).toEqual([
      [projectSectionKey('P'), 'AutoByteus'], [projectSectionKey('Q'), 'Prototype Launch'],
    ])
    const [p, q] = projection.entries
    expect(p!.node.agents.map((agent) => [agent.agentDefinitionId, agent.runs.map((run) => run.runId)])).toEqual([['pm', ['pm-p']]])
    expect(q!.node.agents).toEqual([])
    for (const entry of projection.entries) {
      expect(entry.node.canRemoveFromWorkspaces).toBe(false)
      expect(entry.node.agentOrgDefinitions).toEqual([])
    }
    expect(projection.runAncestryById).toEqual({ 'pm-p': { projectId: 'P', groupKey: 'pm' } })
    expect(projection).not.toHaveProperty('agentOrgAncestryById')
  })

  it("does not list a run in a Project because of its context's folder or delegations (AC-001)", () => {
    // "hello" was started in a workspace (no projectId): it is in no Project.
    const projection = build({ snapshots: { P: snapshot('P', []), Q: snapshot('Q', []) }, agentContexts: new Map([['hello', context('hello', AgentStatus.Running)]]) })
    expect(projection.entries.map((entry) => entry.node.agents)).toEqual([[], []])
    expect(projection.runAncestryById).toEqual({})
  })

  it('overlays live status from the run context and places a run launched under a Project before the next read', () => {
    const projection = build({
      agentContexts: new Map([
        ['pm-p', context('pm-p', AgentStatus.Idle)],
        ['pm-new', context('pm-new', AgentStatus.Running, 'P')],
      ]),
    })
    const [p, q] = projection.entries
    expect(p!.node.agents[0]!.runs.map((run) => [run.runId, run.currentStatus])).toEqual(expect.arrayContaining([
      ['pm-p', AgentStatus.Idle], ['pm-new', AgentStatus.Running],
    ]))
    expect(q!.node.agents).toEqual([])
    expect(projection.runAncestryById['pm-new']).toEqual({ projectId: 'P', groupKey: 'pm' })
  })

  it('leaves out runs this session saw archived or deleted, and Projects without a read', () => {
    const projection = build({ retiredRunIds: new Set(['pm-1']), snapshots: { P: snapshot('P', ['pm-1', 'pm-2']) } })
    expect(projection.entries.map((entry) => entry.project.projectId)).toEqual(['P'])
    expect(projection.entries[0]!.node.agents[0]!.runs.map((run) => run.runId)).toEqual(['pm-2'])
  })
})
