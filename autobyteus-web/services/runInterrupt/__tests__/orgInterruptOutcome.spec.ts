import { describe, expect, it, vi } from 'vitest'
import { AgentOrgConnectionLostError } from '~/services/agentOrgExecution/agentOrgConnectionLostError'
import { orgInterruptOutcome } from '../orgInterruptOutcome'

const service = (ready: boolean, interrupt: () => Promise<void>) => ({ isReady: () => ready, interrupt: vi.fn(interrupt) })

describe('orgInterruptOutcome (autobyteus-533 D-W4)', () => {
  it('a stream that is not ready sends nothing: not_sent', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const org = service(false, async () => undefined)
    await expect(orgInterruptOutcome(org, 'agent-run')).resolves.toEqual({ kind: 'not_sent' })
    expect(org.interrupt).not.toHaveBeenCalled()
  })

  it('an accepted command: accepted', async () => {
    const org = service(true, async () => undefined)
    await expect(orgInterruptOutcome(org, 'agent-run')).resolves.toEqual({ kind: 'accepted' })
    expect(org.interrupt).toHaveBeenCalledWith('agent-run')
  })

  it('a command lost with its connection: connection_lost', async () => {
    const org = service(true, async () => { throw new AgentOrgConnectionLostError() })
    await expect(orgInterruptOutcome(org, 'agent-run')).resolves.toEqual({ kind: 'connection_lost' })
  })

  it('any other rejection (node refusal, timeout, send failure): refused with its detail', async () => {
    const org = service(true, async () => { throw new Error('Failed to interrupt run.') })
    await expect(orgInterruptOutcome(org, 'agent-run')).resolves.toEqual({ kind: 'refused', detail: 'Failed to interrupt run.' })
  })
})
