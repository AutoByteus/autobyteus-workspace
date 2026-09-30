import { describe, expect, it, vi } from 'vitest'
import type { LocationQuery } from 'vue-router'

const {
  openAgentRunMock,
  openTeamRunMock,
  ensureWorkspaceByRootPathMock,
  resolveWorkspaceMetadataByRootPathMock,
  getTeamContextByIdMock,
  openTeamMemberRunMock,
  inspectTeamMemberMock,
  selectRunMock,
} = vi.hoisted(() => ({
  openAgentRunMock: vi.fn(),
  openTeamRunMock: vi.fn(),
  ensureWorkspaceByRootPathMock: vi.fn(),
  resolveWorkspaceMetadataByRootPathMock: vi.fn(),
  getTeamContextByIdMock: vi.fn(),
  openTeamMemberRunMock: vi.fn(),
  inspectTeamMemberMock: vi.fn(),
  selectRunMock: vi.fn(),
}))

vi.mock('~/services/runOpen/agentRunOpenCoordinator', () => ({
  openAgentRun: openAgentRunMock,
}))

vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({
  openTeamRun: openTeamRunMock,
}))

vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: ensureWorkspaceByRootPathMock,
  resolveRunHistoryWorkspaceMetadataByRootPath: resolveWorkspaceMetadataByRootPathMock,
}))

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({ getTeamContextById: getTeamContextByIdMock }),
}))

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({
    openTeamMemberRun: openTeamMemberRunMock,
    inspectTeamMember: inspectTeamMemberMock,
  }),
}))

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    beginSelectionIntent: () => ({ isCurrent: () => true }), selectRun: selectRunMock }),
}))

import {
  buildAgentRunChatRoute,
  buildWorkspaceExecutionRoute,
  resolveSelectionRoute,
  createWorkspaceExecutionLinkSignature,
  openWorkspaceExecutionLink,
  parseWorkspaceExecutionLinkQuery,
  stripWorkspaceExecutionLinkQuery,
} from '../workspaceNavigationService'

describe('workspaceNavigationService', () => {
  it('routes agent execution links to the chat view and never parses them from /workspace', () => {
    const route = buildWorkspaceExecutionRoute({
      kind: 'agent',
      runId: 'agent-run-1',
    })

    expect(route).toEqual({ path: '/chat', query: { id: 'agent-run-1' } })
    expect(buildAgentRunChatRoute('agent-run-1')).toEqual(route)
    expect(parseWorkspaceExecutionLinkQuery({
      workspaceExecutionKind: 'agent',
      workspaceExecutionRunId: 'agent-run-1',
    })).toBeNull()
    expect(createWorkspaceExecutionLinkSignature({ kind: 'agent', runId: 'agent-run-1' })).toBe('agent:agent-run-1')
  })

  it('resolves committed selections to the chat view for agents and the workspace for teams', () => {
    expect(resolveSelectionRoute({ type: 'agent', runId: 'run-9' })).toEqual({ path: '/chat', query: { id: 'run-9' } })
    expect(resolveSelectionRoute({ type: 'team', runId: 'team-1' })).toBe('/workspace')
  })

  it('builds and parses team execution routes with member focus', () => {
    const route = buildWorkspaceExecutionRoute({
      kind: 'team',
      teamRunId: 'team-run-1',
      agentRunId: 'writer-run-1',
    })

    expect(parseWorkspaceExecutionLinkQuery((route as any).query as LocationQuery)).toEqual({
      kind: 'team',
      teamRunId: 'team-run-1',
      agentRunId: 'writer-run-1',
    })
    expect(createWorkspaceExecutionLinkSignature({ kind: 'team', teamRunId: 'team-run-1', agentRunId: 'writer-run-1' })).toBe('team:team-run-1:writer-run-1')
  })

  it('strips workspace execution query params without disturbing others', () => {
    expect(stripWorkspaceExecutionLinkQuery({
      workspaceExecutionKind: 'team',
      workspaceExecutionRunId: 'team-run-1',
      workspaceExecutionAgentRunId: 'writer-run-1',
      preserved: 'value',
    })).toEqual({
      preserved: 'value',
    })
  })

  it('routes agent execution links through the agent open coordinator', async () => {
    await openWorkspaceExecutionLink({
      kind: 'agent',
      runId: 'agent-run-1',
    })

    expect(openAgentRunMock).toHaveBeenCalledWith({
      selectionIntent: expect.objectContaining({ isCurrent: expect.any(Function) }),
      runId: 'agent-run-1',
      fallbackAgentName: null,
      resolveWorkspaceMetadataByRootPath: resolveWorkspaceMetadataByRootPathMock,
      ensureWorkspaceByRootPath: ensureWorkspaceByRootPathMock,
    })
    expect(openTeamRunMock).not.toHaveBeenCalled()
  })

  it('routes an absent exact team execution link through the history facade', async () => {
    await openWorkspaceExecutionLink({
      kind: 'team',
      teamRunId: 'team-run-1',
      agentRunId: 'writer-run-1',
    })

    expect(openTeamMemberRunMock).toHaveBeenCalledWith('team-run-1', 'writer-run-1', expect.objectContaining({ selectionIntent: expect.any(Object) }))
    expect(openTeamRunMock).not.toHaveBeenCalled()
  })
})
