import { describe, expect, it } from 'vitest'
import { agentOrgFirstMemberAddress } from '~/utils/agentOrgHistoryRows'

const run = (members: unknown[]) => ({ executionTree: { rootOrg: { members } } }) as never

// autobyteus-277 DEC-012: the member an Org run row opens.
describe('agentOrgFirstMemberAddress', () => {
  it('is the first configured member, an agent or a Team', () => {
    expect(agentOrgFirstMemberAddress(run([{ address: '/launch_lead', agentRunId: 'a' }, { address: '/content', teamRunId: 't' }]))).toBe('/launch_lead')
    expect(agentOrgFirstMemberAddress(run([{ address: '/software_team', teamRunId: 't' }]))).toBe('/software_team')
  })
  it('is null for an Org without members', () => {
    expect(agentOrgFirstMemberAddress(run([]))).toBeNull()
  })
})
