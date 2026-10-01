import { describe, expect, it } from 'vitest'
import { selectLinkableWorkspaceIds } from '../linkableWorkspaces'

const workspaces = [
  { workspaceId: 'agent_ws_a1', kind: 'filesystem', isTemp: false },
  { workspaceId: 'temp_ws_default', kind: 'temp', isTemp: true },
  { workspaceId: 'agent_ws_b2', kind: 'filesystem', isTemp: false },
  { workspaceId: 'skill_ws_foo', kind: 'skill', isTemp: false },
  { workspaceId: 'agent_ws_c3', kind: 'filesystem' },
  { workspaceId: 'transient_ws', kind: 'filesystem', isTemp: false },
  { workspaceId: 'agent_ws_tmp', kind: 'filesystem', isTemp: true },
]

describe('selectLinkableWorkspaceIds', () => {
  it('keeps registered filesystem workspaces in store order', () => {
    expect(selectLinkableWorkspaceIds(workspaces, [])).toEqual(['agent_ws_a1', 'agent_ws_b2', 'agent_ws_c3'])
  })

  it('excludes workspaces already linked to the project', () => {
    expect(selectLinkableWorkspaceIds(workspaces, [{ workspaceId: 'agent_ws_a1' }])).toEqual([
      'agent_ws_b2',
      'agent_ws_c3',
    ])
  })

  it('excludes temp, skill and non-registered transient workspaces', () => {
    const result = selectLinkableWorkspaceIds(workspaces, [])
    expect(result).not.toContain('temp_ws_default')
    expect(result).not.toContain('skill_ws_foo')
    expect(result).not.toContain('transient_ws')
    expect(result).not.toContain('agent_ws_tmp')
  })

  it('returns an empty list when every workspace is linked', () => {
    expect(selectLinkableWorkspaceIds(workspaces, [
      { workspaceId: 'agent_ws_a1' },
      { workspaceId: 'agent_ws_b2' },
      { workspaceId: 'agent_ws_c3' },
    ])).toEqual([])
  })
})
