import { describe, expect, it } from 'vitest'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { buildMobileRunListRows, openAgentRunIdOf, treeDisplayRowsOf, type MobileRunListSources } from '../mobileRunListRows'
import { agentRow, teamRows } from '~/test-support/runTreeFixtures'
import { AgentStatus } from '~/types/agent/AgentStatus'

/**
 * autobyteus-461 SR-084, F-73: the phone's run list shows each listed run's tree as the server built it: the same rows,
 * in the same order and nesting, as the desktop shows; nothing about a run is derived on the phone.
 */
const agentEntry = { kind: 'agent', key: 'agent:host', runId: 'host', name: 'Manager', lastActivityAt: 't',
  run: { runId: 'host', summary: 'Plan', currentStatus: AgentStatus.Idle, hasCollaboration: true } } as never
const peer: RunTreeRowDto = { key: 'peer_agent:pub', parentKey: 'agent:host', depth: 1, kind: 'peer_agent', name: 'publisher', address: '/publisher',
  openTarget: { runKind: 'agent', runId: 'pub', agentRunId: 'pub', nodeId: 'beta' }, statusIds: ['pub'],
  peer: { nodeId: 'beta', nodeName: 'beta-node', title: 'Publish the draft.', reachable: false } }
const tree: RunTreeRowDto[] = [agentRow('host', null, 0), agentRow('writer', 'agent:host', 1), agentRow('helper', 'agent:writer', 2),
  ...teamRows('squad', 'agent:host', 1, ['lead', 'dev']), peer]
/** A definition's picture address, as the definition avatar store answers it (autobyteus-669 W-3). */
const pictureOf = (kind: string, id: string | null | undefined) => id ? `/rest/definition-avatars/${kind}/${id}?v=1` : null
const sources = (expanded: ReadonlySet<string> = new Set()): MobileRunListSources => ({
  entries: [agentEntry], treeRows: () => tree, avatarOf: pictureOf, statusOf: (row, id) => row.kind === 'team' ? 'running' : id === 'writer' ? 'running' : 'idle', backgroundTasksOf: () => 0,
  isTreeRowExpanded: (_entry, row) => row.kind === 'team' ? expanded.has(row.key) : true, taskSummary: () => null,
  isRunExpanded: () => true, isTeamExpanded: () => true, isAgentOrgRunExpanded: () => true,
})

describe('buildMobileRunListRows (SR-084, F-73)', () => {
  // autobyteus-669 W-4 (REQ-004, AC-004): each row shows its own definition's picture; a peer's row its fallback.
  it('gives each row its definition\'s picture: the listed run\'s, a tree row\'s by its definition ID, none for a peer', () => {
    const entry = { ...(agentEntry as object), agentDefinitionId: 'manager' } as never
    const withDefinitions: RunTreeRowDto[] = [agentRow('host', null, 0), { ...agentRow('writer', 'agent:host', 1), definitionId: 'writer-def' },
      { ...agentRow('helper', 'agent:host', 1) }, ...teamRows('squad', 'agent:host', 1, ['lead']).map((row) => ({ ...row, definitionId: row.kind === 'team' ? 'squad-def' : 'lead-def' })),
      { ...peer, definitionId: 'their-def' }]
    const rows = buildMobileRunListRows({ ...sources(new Set(['team:squad'])), entries: [entry], treeRows: () => withDefinitions })
    expect(Object.fromEntries(rows.map((row) => [row.key, row.avatarUrl]))).toEqual({
      'agent:host': '/rest/definition-avatars/agent/manager?v=1',
      'agent:host/agent:writer': '/rest/definition-avatars/agent/writer-def?v=1',
      'agent:host/agent:helper': null,
      'agent:host/team:squad': '/rest/definition-avatars/team/squad-def?v=1',
      'agent:host/team_member:squad:lead': '/rest/definition-avatars/agent/lead-def?v=1',
      'agent:host/peer_agent:pub': null,
    })
  })

  it('lists the run, then its tree\'s rows under its own row, as the desktop shows them (same keys, order and depth)', () => {
    const rows = buildMobileRunListRows(sources())
    const desktop = treeDisplayRowsOf(agentEntry, sources())
    expect(rows.slice(1).map((row) => [row.key, row.depth])).toEqual(desktop.map((display) => [`agent:host/${display.tree.key}`, display.row.depth + 1]))
    expect(rows.map((row) => row.key)).toEqual(['agent:host', 'agent:host/agent:writer', 'agent:host/agent:helper', 'agent:host/team:squad', 'agent:host/peer_agent:pub'])
    expect(rows[0]).toMatchObject({ depth: 0, avatar: 'agent', hasChildren: true, expanded: true, fold: { kind: 'run', runId: 'host' } })
  })

  it('shows each row its own run\'s status (a team\'s its run\'s), a peer\'s node and title, and folds a team until it is expanded', () => {
    const folded = buildMobileRunListRows(sources())
    expect(folded.find((row) => row.key === 'agent:host/team:squad')).toMatchObject({ avatar: 'team', status: 'running', hasChildren: true, expanded: false })
    expect(folded.find((row) => row.key === 'agent:host/agent:writer')!.status).toBe('running')
    expect(folded.find((row) => row.key === 'agent:host/peer_agent:pub')).toMatchObject({ title: 'Publish the draft.', remote: { nodeName: 'beta-node', reachable: false } })
    const open = buildMobileRunListRows(sources(new Set(['team:squad'])))
    expect(open.filter((row) => row.key.startsWith('agent:host/team_member:squad')).map((row) => row.depth)).toEqual([2, 2])
  })

  it('autobyteus-448: a row carries its run\'s running background tasks; a team row shows its sum by the Team rule', () => {
    const counted: MobileRunListSources = { ...sources(), statusOf: (row) => row.kind === 'team' ? 'error' : 'idle',
      backgroundTasksOf: (row, id) => row.kind === 'team' ? 3 : id === 'writer' ? 2 : 0 }
    const rows = buildMobileRunListRows(counted)
    expect(rows.find((row) => row.key === 'agent:host/agent:writer')).toMatchObject({ status: 'idle', backgroundTasksRunning: 2 })
    expect(rows.find((row) => row.key === 'agent:host/agent:helper')).toMatchObject({ status: 'idle', backgroundTasksRunning: 0 })
    // busy > background > error: an errored team whose agents have background tasks running shows them.
    expect(rows.find((row) => row.key === 'agent:host/team:squad')).toMatchObject({ status: 'idle', backgroundTasksRunning: 3 })
  })

  it('a row opens where the server says: its target\'s agent marks the open row', () => {
    const rows = buildMobileRunListRows(sources(new Set(['team:squad'])))
    expect(openAgentRunIdOf(rows.find((row) => row.key === 'agent:host/agent:helper')!)).toBe('helper')
    expect(openAgentRunIdOf(rows.find((row) => row.key === 'agent:host/team_member:squad:dev')!)).toBe('dev')
    expect(openAgentRunIdOf(rows.find((row) => row.key === 'agent:host/team:squad')!)).toBeNull()
    expect(openAgentRunIdOf(rows[0]!)).toBe('host')
  })
})
