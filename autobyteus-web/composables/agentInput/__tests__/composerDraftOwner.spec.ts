import { describe, expect, it, vi } from 'vitest'

/**
 * autobyteus-461 CR-461-106 (F-80): the composer's drafts belong to the run it sends to (rule 2), in whichever view it is
 * shown: an Org's or a Team's delegated run uploads under its own run's owner, which its own send finalizes from, not
 * under the delegating Org's or Team's. A run on another node takes no uploads.
 */
const active = vi.hoisted(() => ({ target: null as unknown }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({
  get activeWorkspaceTarget() { return active.target }, send: vi.fn(), interruptGeneration: vi.fn(),
}) }))
vi.mock('~/stores/runTreeStore', () => ({ useRunTreeStore: () => ({ peerRunOf: () => null }) }))
vi.mock('~/composables/agentInput/runMentionScope', () => ({ resolveRunMentionScope: () => null }))

import { useComposerTarget } from '../useComposerTarget'

const target = (kind: string, browse: unknown, extra: Record<string, unknown> = {}) =>
  ({ kind, access: 'live', browse, context: { state: { runId: 'shown-run' } }, ...extra })
const ownerOf = (value: unknown) => { active.target = value; return useComposerTarget().value?.draftOwner ?? null }

describe('the composer draft owner (CR-461-106)', () => {
  it.each([
    ['a standalone agent run', target('standalone_agent', { kind: 'run', runId: 'agent-1' }), { kind: 'agent_draft', draftRunId: 'agent-1' }],
    ['a Team\'s own member', target('standalone_team_member', { kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/lead', agentRunId: 'lead-1' }),
      { kind: 'team_member_draft', teamDraftId: 'team-1', memberAddress: '/lead' }],
    ['an Org\'s own agent', target('agent_org_direct_agent', { kind: 'agentOrgMember', orgRunId: 'org-1', memberAddress: '/writer', agentRunId: 'writer-1' }, { root: { orgRunId: 'org-1' } }),
      { kind: 'org_member_draft', orgRunId: 'org-1', agentRunId: 'writer-1' }],
    ['an agent run an Org delegated', target('agent_org_task_agent', { kind: 'run', runId: 'task-agent' }, { root: { orgRunId: 'org-1' } }),
      { kind: 'agent_draft', draftRunId: 'task-agent' }],
    ['a member of a team run an Org delegated', target('agent_org_task_team_member', { kind: 'teamMember', teamRunId: 'task-team', memberAddress: '/coordinator', agentRunId: 'coord' }, { root: { orgRunId: 'org-1' } }),
      { kind: 'team_member_draft', teamDraftId: 'task-team', memberAddress: '/coordinator' }],
    ['an agent run a Team delegated', target('standalone_team_member', { kind: 'run', runId: 'team-worker' }, { team: { rootRunId: 'team-1', focusedMemberAddress: '/lead' } }),
      { kind: 'agent_draft', draftRunId: 'team-worker' }],
    ['an agent run an agent run delegated', target('agent_run_task_agent', { kind: 'run', runId: 'child-1' }, { viewRun: { runId: 'host-1' } }),
      { kind: 'agent_draft', draftRunId: 'child-1' }],
  ])('%s: its own run\'s owner', (_label, value, owner) => {
    expect(ownerOf(value)).toEqual(owner)
  })

  it('a run on another node takes no uploads; a read-only delegated run none either', () => {
    expect(ownerOf(target('agent_org_task_agent', { kind: 'peerRun', nodeId: 'node-b', runId: 'peer', agentRunId: 'peer' }, { root: { orgRunId: 'org-1' } }))).toBeNull()
    expect(ownerOf({ ...target('agent_org_task_agent', { kind: 'run', runId: 'task-agent' }, { root: { orgRunId: 'org-1' } }), access: 'read_only' })).toBeNull()
  })
})
