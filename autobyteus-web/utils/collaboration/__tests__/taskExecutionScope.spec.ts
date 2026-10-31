/**
 * taskExecutionScope (projects-left-navigation, REQ-008, AC-007): a scope keeps every non-delegated row, keeps a
 * top-level delegated row only when its copy is listed under the Project, carries each kept or dropped row's subtree
 * with it, reports the dropped copies, and recomputes the tree connectors for what remains.
 */
import { describe, expect, it } from 'vitest'
import { branchConnectors, scopeTaskRows } from '../taskExecutionScope'

type Row = { id: string; depth: number; copy: string | null }
const view = { depth: (row: Row) => row.depth, copyKey: (row: Row) => row.copy }
const ids = (rows: Row[]) => rows.map((row) => row.id)

describe('scopeTaskRows', () => {
  const agentRoot: Row[] = [
    { id: 'team-a', depth: 0, copy: 'team:a' }, { id: 'team-a-member', depth: 1, copy: 'agent:a1' },
    { id: 'agent-b', depth: 0, copy: 'agent:b' },
    { id: 'sub-c', depth: 0, copy: 'agent:c' },
  ]

  it('keeps no-scope rows as they are (Workspaces)', () => {
    expect(ids(scopeTaskRows(agentRoot, null, view).kept)).toEqual(ids(agentRoot))
  })

  it("keeps a root's copies in the scope with everything under them, and reports the others", () => {
    const { kept, droppedKeys } = scopeTaskRows(agentRoot, new Set(['team:a', 'agent:c']), view)
    expect(ids(kept)).toEqual(['team-a', 'team-a-member', 'sub-c'])
    expect(droppedKeys).toEqual(['agent:b'])
  })

  it('keeps Team members and scopes the copies they started', () => {
    const team: Row[] = [
      { id: 'lead', depth: 0, copy: null }, { id: 'lead-copy', depth: 1, copy: 'agent:x' }, { id: 'lead-copy-sub', depth: 2, copy: 'agent:x1' },
      { id: 'reviewer', depth: 0, copy: null }, { id: 'reviewer-copy', depth: 1, copy: 'team:y' },
    ]
    expect(ids(scopeTaskRows(team, new Set(['team:y']), view).kept)).toEqual(['lead', 'reviewer', 'reviewer-copy'])
  })

  it('recomputes the connectors of the remaining rows', () => {
    const { kept } = scopeTaskRows(agentRoot, new Set(['team:a']), view)
    expect(branchConnectors(kept, (row) => row.depth)).toEqual([
      { continuingAncestorDepths: [], hasFollowingSibling: false },
      { continuingAncestorDepths: [], hasFollowingSibling: false },
    ])
  })
})
