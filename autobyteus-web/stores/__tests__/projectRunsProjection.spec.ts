/**
 * projectRunsProjection (projects-left-navigation, DS-003; REQ-003, REQ-008, REQ-012, AC-002, AC-007, AR-001): the
 * Projects tree is built by the Workspaces builders keyed by Project: the same run listed under two Projects, live
 * status from the run's context, a run launched under a Project shown before the next read, ancestry for the reveal,
 * one stable scope object per root, archived (retired) runs left out.
 */
import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { Project } from '~/types/project'
import { buildProjectRunsProjection, projectSectionKey, type ProjectRunsSnapshot } from '../projectRunsProjection'

const project = (projectId: string, name = projectId): Project => ({ projectId, name, description: '', createdAt: '', updatedAt: '',
  workspaces: [], openTaskCount: 0, taskCount: 0 })

const snapshot = (projectId: string, runIds: string[], scopes: Record<string, string[]> = {}): ProjectRunsSnapshot => ({
  projectId,
  agentDefinitions: [{ agentDefinitionId: 'pm', agentName: 'Project Task Manager', runs: runIds.map((runId) => ({
    runId, summary: `run ${runId}`, createdAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, status: AgentStatus.Offline,
    isActive: false, shouldConnectStream: false, statusSource: 'TEST', hasCollaboration: true,
  })) }],
  teamDefinitions: [],
  agentOrgRuns: [],
  scopes: Object.fromEntries(Object.entries(scopes).map(([key, copies]) => [key, new Set(copies)])),
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
    snapshots: { P: snapshot('P', ['pm-1'], { 'AGENT:pm-1': ['team:set-1'] }), Q: snapshot('Q', ['pm-1'], { 'AGENT:pm-1': ['agent:apc-1'] }) },
    agentContexts: new Map(),
    teamContexts: [],
    agentAvatarByDefinitionId: {},
    workspacesById: {},
    retiredRunIds: new Set(),
    noteUnscoped: vi.fn(),
    ...overrides,
  })
}

describe('buildProjectRunsProjection', () => {
  it('lists the same run under each Project that lists it, grouped by agent, keyed by Project (AC-002)', () => {
    const projection = build()
    expect(projection.entries.map((entry) => [entry.node.stableKey, entry.node.workspaceName])).toEqual([
      [projectSectionKey('P'), 'AutoByteus'], [projectSectionKey('Q'), 'Prototype Launch'],
    ])
    for (const entry of projection.entries) {
      expect(entry.node.canRemoveFromWorkspaces).toBe(false)
      expect(entry.node.agents.map((agent) => [agent.agentDefinitionId, agent.runs.map((run) => run.runId)])).toEqual([['pm', ['pm-1']]])
    }
    expect(projection.runAncestryById['pm-1']).toEqual([{ projectId: 'P', groupKey: 'pm' }, { projectId: 'Q', groupKey: 'pm' }])
  })

  it('gives each root its own Project scope, one stable object per root (AC-007)', () => {
    const projection = build()
    const [p, q] = projection.entries
    expect([...p!.executionScopeOf('AGENT', 'pm-1').copies]).toEqual(['team:set-1'])
    expect([...q!.executionScopeOf('AGENT', 'pm-1').copies]).toEqual(['agent:apc-1'])
    expect(p!.executionScopeOf('AGENT', 'pm-1')).toBe(p!.executionScopeOf('AGENT', 'pm-1'))
    expect([...p!.executionScopeOf('AGENT', 'unknown').copies]).toEqual([])
  })

  it('overlays live status from the run context and places a run launched under a Project before the next read (AR-001)', () => {
    const projection = build({
      agentContexts: new Map([
        ['pm-1', context('pm-1', AgentStatus.Idle)],
        ['pm-new', context('pm-new', AgentStatus.Running, 'P')],
        ['elsewhere', context('elsewhere', AgentStatus.Running)],
      ]),
    })
    const [p, q] = projection.entries
    expect(p!.node.agents[0]!.runs.map((run) => [run.runId, run.currentStatus])).toEqual(expect.arrayContaining([
      ['pm-1', AgentStatus.Idle], ['pm-new', AgentStatus.Running],
    ]))
    expect(q!.node.agents[0]!.runs.map((run) => run.runId)).toEqual(['pm-1'])
    expect(projection.runAncestryById.elsewhere).toBeUndefined()
  })

  it('leaves out runs this session saw archived or deleted, and Projects without a read', () => {
    const projection = build({ retiredRunIds: new Set(['pm-1']), snapshots: { P: snapshot('P', ['pm-1', 'pm-2']) } })
    expect(projection.entries.map((entry) => entry.project.projectId)).toEqual(['P'])
    expect(projection.entries[0]!.node.agents[0]!.runs.map((run) => run.runId)).toEqual(['pm-2'])
  })
})
