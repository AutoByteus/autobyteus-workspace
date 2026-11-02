import { describe, expect, it } from 'vitest'
import { resolveSettingsSubject } from '../settingsSubject'
import type { RunMemberNode } from '../runMemberTree'

// autobyteus-366: the design's "Subject and group rules", one case per focused kind.
const node = (key: string, agentRunId: string | null, children: readonly RunMemberNode[] = []): RunMemberNode => ({
  key, kind: agentRunId ? 'agent' : 'team', name: key, ...(agentRunId ? { agentRunId } : {}), children,
}) as RunMemberNode

const teamMember = node('/lead', 'lead-run')
const orgDirect = node('/writer', 'writer-run')
const placedMember = node('/delivery/reviewer', 'reviewer-run')
const placedTeam = node('/delivery', null, [placedMember])
const agentCopy = node('/cr@cr-run', 'cr-run')
const copyMember = node('/se/lead@copy-lead-run', 'copy-lead-run')
const teamCopy = node('/se@se-copy', null, [copyMember])
const remoteCopy = node('/publisher@docker', 'remote-run')
const remoteMember = node('/rt/lead@docker', 'remote-lead-run')
const remoteTeam = node('/rt@docker', null, [remoteMember])
const delegated = [agentCopy, teamCopy, remoteCopy, remoteTeam]
const NONE = { origin: 'none', subject: null, group: 'root' }

describe('resolveSettingsSubject', () => {
  it.each([
    ['a standalone run itself', 'hub-run', [], { origin: 'root', subject: 'root', group: null }],
    ['a delegated Agent copy has no group', 'cr-run', [], { origin: 'delegated', subject: agentCopy, group: null }],
    ['a member of a Team copy has that copy as its group', 'copy-lead-run', [], { origin: 'delegated', subject: copyMember, group: teamCopy }],
    ['a remote Agent copy', 'remote-run', [], { origin: 'delegated', subject: remoteCopy, group: null }],
    ['a member of a remote Team copy', 'remote-lead-run', [], { origin: 'delegated', subject: remoteMember, group: remoteTeam }],
    ['a Team member has the run as its group', 'lead-run', [teamMember], { origin: 'member', subject: teamMember, group: 'root' }],
    ['an Org direct agent', 'writer-run', [orgDirect, placedTeam], { origin: 'member', subject: orgDirect, group: 'root' }],
    ['a member of an Org\'s placed team has the Org as its group', 'reviewer-run', [orgDirect, placedTeam], { origin: 'member', subject: placedMember, group: 'root' }],
    ['a copy of a Team or Org root is a copy', 'cr-run', [teamMember], { origin: 'delegated', subject: agentCopy, group: null }],
    ['no row for the focused agent falls back to the group view', 'unknown-run', [teamMember], NONE],
  ] as const)('%s', (_name, focusedAgentRunId, members, expected) => {
    const rootAgentRunId = members.length ? null : 'hub-run'
    expect(resolveSettingsSubject({ rootAgentRunId, members, delegated, focusedAgentRunId })).toEqual(expected)
  })

  it('with nothing focused (an Org with no selection, a run not loaded yet) falls back to the group view', () => {
    expect(resolveSettingsSubject({ rootAgentRunId: null, members: [teamMember], delegated, focusedAgentRunId: null })).toEqual(NONE)
  })

  it('never takes a Team or placed team row for an agent', () => {
    expect(resolveSettingsSubject({ rootAgentRunId: null, members: [placedTeam], delegated: [teamCopy], focusedAgentRunId: 'se-copy' })).toEqual(NONE)
  })
})
