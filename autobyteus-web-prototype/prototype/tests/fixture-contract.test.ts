import { describe, expect, it } from 'vitest'
import runtimeFixture from '../fixtures/runtime-state.json'
import {
  baseState,
  exposedFixtures,
  fixtureContext,
  operationFixture,
  scenarioCatalog,
} from '../source-observation/fixtures.mjs'

const snapshots = runtimeFixture.snapshots as Record<string, {
  item: { scenario: string, path: string, mobile?: string }
  state: Record<string, any>
}>

describe('deterministic prototype fixture contract', () => {
  it('is pinned to the selected source and covers every recorded scenario', () => {
    expect(runtimeFixture.sourceCommit).toBe('8ef282ba77705180d985e7000d801f0e0068cdc1')
    expect(Object.keys(snapshots)).toHaveLength(52)
    expect(new Set(Object.values(snapshots).map(value => value.item.scenario))).toEqual(new Set(['populated', 'empty', 'apps_disabled', 'loading', 'error', 'permission_denied']))
  })

  it('uses synthetic domain records and local-only node addresses', () => {
    const serialized = JSON.stringify(runtimeFixture)
    expect(serialized).toContain('Synthetic local agent')
    expect(serialized).toContain('/synthetic/prototype-workspace')
    expect(serialized).not.toMatch(/sk-[A-Za-z0-9_-]{12,}/)
    const nodeUrls = Object.values(snapshots).flatMap(snapshot => [
      snapshot.state.windowNodeContext?.nodeBaseUrl,
      ...((snapshot.state.nodeStore?.nodes || []).map((node: { baseUrl?: string }) => node.baseUrl)),
    ]).filter((value): value is string => Boolean(value))
    expect(nodeUrls.length).toBeGreaterThan(0)
    expect(nodeUrls.every(url => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url))).toBe(true)
  })

  it('represents host and access contexts as browser-selectable state', () => {
    expect(Object.keys(snapshots).some(key => key.startsWith('apps_disabled|desktop|'))).toBe(true)
    expect(Object.keys(snapshots)).toContain('populated|paired|/mobile')
    expect(Object.keys(snapshots)).toContain('populated|unpaired|/mobile')
    expect(Object.keys(snapshots)).toContain('permission_denied|paired|/mobile')
  })

  it('derives the loading frame from a ready browser shell without a backend bootstrap', () => {
    const loading = snapshots['loading|desktop|/agents?view=list']
    expect(loading.state.server.status).toBe('running')
    expect(loading.state.applicationsCapability).toEqual({ capability: null, status: 'loading', error: null })
    expect(loading.state.agentDefinition.agentDefinitions).toHaveLength(2)
  })

  it('defines an isolated source-observation fixture for the catalog Team launch journey', () => {
    expect(scenarioCatalog.team_launch).toContain('deterministic newly launched Team execution')

    const state = { ...baseState(), scenario: 'team_launch' }
    const context = fixtureContext(state)
    expect(context.workspaces).toEqual([
      expect.objectContaining({
        workspaceId: 'workspace-prototype',
        workspaceRootPath: '/synthetic/prototype-workspace',
        kind: 'filesystem',
      }),
    ])

    expect(operationFixture('ListWorkspaceRunHistory', {}, state)).toEqual({ listWorkspaceRunHistory: [] })

    const create = operationFixture('CreateAgentTeamRun', { input: {} }, state).createAgentTeamRun
    expect(create).toEqual(expect.objectContaining({
      __typename: 'CreateAgentTeamRunResult',
      success: true,
      teamRunId: 'team-run-created-fixture',
    }))

    const resume = operationFixture('GetTeamRunResumeConfig', { teamRunId: create.teamRunId }, state).getTeamRunResumeConfig
    expect(resume).toEqual(expect.objectContaining({
      teamRunId: 'team-run-created-fixture',
      isActive: true,
      executionTree: exposedFixtures.createdTeamExecutionTree,
    }))
    expect(resume.executionTree.root_team.members.map((member: { address: string, agent_run_id: string }) => [member.address, member.agent_run_id])).toEqual([
      ['/researcher', 'team-member-researcher-created'],
      ['/writer', 'team-member-writer-created'],
    ])
  })
})
