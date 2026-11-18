import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { useToasts } from '~/composables/useToasts'
import type { InterruptOutcome } from '~/services/agentStreaming/protocol/agentCommandTypes'
import { resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { runInterrupt } from '../runInterrupt'

const RUN_ID = 'solution_designer_e7ba41c2'
const NOT_SENT_TEXT = 'Stop was not sent: not connected to the node. Check the connection and try again.'

const runningContext = (): AgentContext => {
  const context = reactive(new AgentContext(
    { agentDefinitionName: 'Solution Designer' } as AgentRunConfig,
    new AgentRunState(RUN_ID, { id: RUN_ID, messages: [], createdAt: '', updatedAt: '' } as never),
  )) as AgentContext
  context.state.currentStatus = AgentStatus.Running
  return context
}

/** A route whose Stop the test settles. */
const deferredRoute = () => {
  let settle!: (outcome: InterruptOutcome) => void
  const interrupt = vi.fn(() => new Promise<InterruptOutcome>((resolve) => { settle = resolve }))
  return { interrupt, settle: (outcome: InterruptOutcome) => settle(outcome) }
}

const primaryActionOf = (context: AgentContext) => resolveAgentPrimaryAction({
  hasContext: true, status: context.state.currentStatus, submissionPending: false,
  interruptPending: context.interruptPending, isUploading: false, hasDraft: false,
})

const toastTexts = () => useToasts().toasts.value.map((toast) => toast.message)
const flush = async () => { await Promise.resolve(); await nextTick() }

describe('runInterrupt (autobyteus-533 D-W3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('a press shows Stopping and sends one Stop; a second press sends nothing (AC-006)', async () => {
    const context = runningContext()
    const route = deferredRoute()
    const first = runInterrupt({ context, interrupt: route.interrupt, agentName: 'Solution Designer' })
    expect(context.interruptPending).toBe(true)
    expect(primaryActionOf(context)).toEqual({ kind: 'stopping', enabled: false })
    await runInterrupt({ context, interrupt: route.interrupt, agentName: 'Solution Designer' })
    expect(route.interrupt).toHaveBeenCalledTimes(1)
    route.settle({ kind: 'accepted' })
    await first
  })

  it('accepted: Stopping stays while the status is Running, ends with the status, and nothing is shown (AC-007)', async () => {
    const context = runningContext()
    const route = deferredRoute()
    const done = runInterrupt({ context, interrupt: route.interrupt, agentName: 'Solution Designer' })
    route.settle({ kind: 'accepted' })
    await done
    expect(context.interruptPending).toBe(true)
    context.state.currentStatus = AgentStatus.Idle
    await flush()
    expect(context.interruptPending).toBe(false)
    expect(primaryActionOf(context).kind).not.toBe('stopping')
    expect(toastTexts()).toEqual([])
  })

  it('the status watch runs from the press: a status before the answer ends Stopping', async () => {
    const context = runningContext()
    const route = deferredRoute()
    const done = runInterrupt({ context, interrupt: route.interrupt, agentName: 'Solution Designer' })
    context.state.currentStatus = AgentStatus.Offline
    await flush()
    expect(context.interruptPending).toBe(false)
    route.settle({ kind: 'accepted' })
    await done
    expect(context.interruptPending).toBe(false)
    expect(toastTexts()).toEqual([])
  })

  it('connection_lost: Stopping ends and nothing is shown; the status then decides (AC-008)', async () => {
    const context = runningContext()
    const route = deferredRoute()
    const done = runInterrupt({ context, interrupt: route.interrupt, agentName: 'Solution Designer' })
    route.settle({ kind: 'connection_lost' })
    await done
    expect(context.interruptPending).toBe(false)
    expect(primaryActionOf(context)).toEqual({ kind: 'interrupt', enabled: true })
    expect(toastTexts()).toEqual([])
  })

  it.each([
    ['not_sent', { kind: 'not_sent' } as InterruptOutcome, NOT_SENT_TEXT],
    ['refused', { kind: 'refused', detail: `[RUNTIME_COMMAND_FAILED] AgentRun '${RUN_ID}' failed` } as InterruptOutcome,
      'Could not stop Solution Designer. Please try again.'],
  ])('%s: Stopping ends, Stop is available again, and one plain message names the agent (AC-009)', async (_kind, outcome, text) => {
    const context = runningContext()
    const route = deferredRoute()
    const done = runInterrupt({ context, interrupt: route.interrupt, agentName: 'Solution Designer' })
    route.settle(outcome)
    await done
    expect(context.interruptPending).toBe(false)
    expect(primaryActionOf(context)).toEqual({ kind: 'interrupt', enabled: true })
    expect(toastTexts()).toEqual([text])
    expect(toastTexts()[0]).not.toContain(RUN_ID)
  })

  it('a route that throws counts as not sent', async () => {
    const context = runningContext()
    await runInterrupt({ context, interrupt: () => { throw new Error('AgentOrg live command target is stale.') }, agentName: 'Solution Designer' })
    expect(context.interruptPending).toBe(false)
    expect(toastTexts()).toEqual([NOT_SENT_TEXT])
  })

  it('a press ends only its own Stopping: an earlier press\'s late outcome never clears a later press', async () => {
    const context = runningContext()
    const first = deferredRoute()
    const firstDone = runInterrupt({ context, interrupt: first.interrupt, agentName: 'Solution Designer' })
    context.state.currentStatus = AgentStatus.Idle
    await flush()
    context.state.currentStatus = AgentStatus.Running
    const second = deferredRoute()
    void runInterrupt({ context, interrupt: second.interrupt, agentName: 'Solution Designer' })
    expect(context.interruptPending).toBe(true)
    first.settle({ kind: 'connection_lost' })
    await firstDone
    expect(context.interruptPending).toBe(true)
    second.settle({ kind: 'accepted' })
  })
})
