import { describe, expect, it } from 'vitest'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { rowsToUnfoldFor, teamRowsAboveAgent } from '../runTreeAgents'

/** autobyteus-461 CR-461-108: the team rows a tree unfolds to show an agent's row, from the tree the server built. */
const row = (key: string, parentKey: string | null, kind: RunTreeRowDto['kind'], agentRunId: string): RunTreeRowDto =>
  ({ key, parentKey, depth: 0, kind, name: key, address: `/${key}`, openTarget: { runKind: kind === 'agent' ? 'agent' : 'agent_team', runId: key, agentRunId }, statusIds: [agentRunId] })
const rows = [
  row('team:top', null, 'team', 'top-lead'),
  row('team_member:top:top-lead', 'team:top', 'team_member', 'top-lead'),
  row('agent:worker', 'team_member:top:top-lead', 'agent', 'worker'),
  row('team:nested', 'agent:worker', 'team', 'nested-lead'),
  row('team_member:nested:nested-lead', 'team:nested', 'team_member', 'nested-lead'),
  row('team_member:nested:nested-mate', 'team:nested', 'team_member', 'nested-mate'),
]

describe('teamRowsAboveAgent (CR-461-108)', () => {
  it('names the team rows above a delegated Team\'s member, outermost first, below the run\'s own row; agent rows are not folded', () => {
    expect(teamRowsAboveAgent(rows, 'nested-mate', 'team:top')).toEqual(['team:nested'])
    expect(teamRowsAboveAgent(rows, 'nested-lead', 'team:top')).toEqual(['team:nested'])
  })

  it('names none for the run\'s own member, a delegated agent under it, or an agent the tree does not show', () => {
    expect(teamRowsAboveAgent(rows, 'top-lead', 'team:top')).toEqual([])
    expect(teamRowsAboveAgent(rows, 'worker', 'team:top')).toEqual([])
    expect(teamRowsAboveAgent(rows, 'stranger', 'team:top')).toEqual([])
  })
})

describe('rowsToUnfoldFor (CR-461-108)', () => {
  it('names every row above a picked row, outermost first, and a picked team row itself (it opens at its coordinator)', () => {
    expect(rowsToUnfoldFor(rows, 'team_member:nested:nested-mate').map((r) => r.key))
      .toEqual(['team:top', 'team_member:top:top-lead', 'agent:worker', 'team:nested'])
    expect(rowsToUnfoldFor(rows, 'team:nested').map((r) => r.key)).toEqual(['team:top', 'team_member:top:top-lead', 'agent:worker', 'team:nested'])
    expect(rowsToUnfoldFor(rows, 'agent:worker').map((r) => r.key)).toEqual(['team:top', 'team_member:top:top-lead'])
    expect(rowsToUnfoldFor(rows, 'missing')).toEqual([])
  })
})
