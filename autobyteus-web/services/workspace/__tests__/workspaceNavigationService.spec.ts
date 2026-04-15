import { describe, expect, it, vi } from 'vitest'
import type { LocationQuery } from 'vue-router'

const { openAgentRunMock, openTeamRunMock, ensureWorkspaceByRootPathMock } = vi.hoisted(() => ({
  openAgentRunMock: vi.fn(),
  openTeamRunMock: vi.fn(),
  ensureWorkspaceByRootPathMock: vi.fn(),
}))

vi.mock('~/services/runOpen/agentRunOpenCoordinator', () => ({
  openAgentRun: openAgentRunMock,
}))

vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({
  openTeamRun: openTeamRunMock,
}))

vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: ensureWorkspaceByRootPathMock,
}))

import {
  buildWorkspaceExecutionRoute,
  createWorkspaceExecutionLinkSignature,
  openWorkspaceExecutionLink,
  parseWorkspaceExecutionLinkQuery,
  stripWorkspaceExecutionLinkQuery,
} from '../workspaceNavigationService'

describe('workspaceNavigationService', () => {
  it('builds and parses agent execution routes', () => {
    const route = buildWorkspaceExecutionRoute({
      kind: 'agent',
      runId: 'agent-run-1',
    })

    expect(route).toEqual({
      path: '/workspace',
      query: {
        workspaceExecutionKind: 'agent',
        workspaceExecutionRunId: 'agent-run-1',
      },
    })

    expect(parseWorkspaceExecutionLinkQuery(route.query as LocationQuery)).toEqual({
      kind: 'agent',
      runId: 'agent-run-1',
    })
    expect(createWorkspaceExecutionLinkSignature({ kind: 'agent', runId: 'agent-run-1' })).toBe('agent:agent-run-1')
  })

  it('builds and parses team execution routes with member focus', () => {
    const route = buildWorkspaceExecutionRoute({
      kind: 'team',
      teamRunId: 'team-run-1',
      memberRouteKey: 'writer',
    })

    expect(parseWorkspaceExecutionLinkQuery(route.query as LocationQuery)).toEqual({
      kind: 'team',
      teamRunId: 'team-run-1',
      memberRouteKey: 'writer',
    })
    expect(createWorkspaceExecutionLinkSignature({ kind: 'team', teamRunId: 'team-run-1', memberRouteKey: 'writer' })).toBe('team:team-run-1:writer')
  })

  it('strips workspace execution query params without disturbing others', () => {
    expect(stripWorkspaceExecutionLinkQuery({
      workspaceExecutionKind: 'team',
      workspaceExecutionRunId: 'team-run-1',
      workspaceExecutionMemberRouteKey: 'writer',
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
      runId: 'agent-run-1',
      fallbackAgentName: null,
      ensureWorkspaceByRootPath: ensureWorkspaceByRootPathMock,
    })
    expect(openTeamRunMock).not.toHaveBeenCalled()
  })

  it('routes team execution links through the team open coordinator', async () => {
    await openWorkspaceExecutionLink({
      kind: 'team',
      teamRunId: 'team-run-1',
      memberRouteKey: 'writer',
    })

    expect(openTeamRunMock).toHaveBeenCalledWith({
      teamRunId: 'team-run-1',
      memberRouteKey: 'writer',
      ensureWorkspaceByRootPath: ensureWorkspaceByRootPathMock,
    })
  })
})
