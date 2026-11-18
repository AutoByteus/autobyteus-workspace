import { watch } from 'vue'
import { useToasts } from '~/composables/useToasts'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { InterruptOutcome } from '~/services/agentStreaming/protocol/agentCommandTypes'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'

/**
 * One user Stop for one run's context (autobyteus-533 D-W3): the only owner of what the user sees about it, for every
 * run kind, on desktop and phone.
 *
 * - The press marks the context "Stopping…" (`interruptPending`), so the composer sends nothing more, and sends one Stop.
 * - Stopping ends with the run's status: the first status that is not Running, watched from the press (so the order of
 *   the status and the answer does not matter); or with an outcome that ends it: `not_sent`, `refused`, or
 *   `connection_lost` (the stream settles that one only after its rebind's status is applied, D-W7).
 * - Only a real failure shows a message, in plain words naming the agent as the view does; the node's detail goes to the
 *   console. A Stop the node accepted (it stopped a turn, or found nothing to stop) shows nothing.
 *
 * Each press ends only its own Stopping: a later press is never cleared by an earlier press's outcome.
 */
export const runInterrupt = async (input: Readonly<{
  context: AgentContext
  /** The run kind's route: sends one Stop and resolves with its outcome. */
  interrupt: () => Promise<InterruptOutcome>
  /** The agent's name as the view shows it. */
  agentName: string
}>): Promise<void> => {
  const { context } = input
  if (context.interruptPending) return
  context.interruptPending = true
  let ended = false
  let stopWatching: (() => void) | null = null
  const end = (): void => {
    if (ended) return
    ended = true
    stopWatching?.()
    context.interruptPending = false
  }
  stopWatching = watch(() => context.state.currentStatus, (status) => {
    if (status !== AgentStatus.Running) end()
  }, { immediate: true })
  if (ended) stopWatching()

  let outcome: InterruptOutcome
  try {
    outcome = await input.interrupt()
  } catch (error) {
    console.warn('Stop was not sent:', error)
    outcome = { kind: 'not_sent' }
  }
  // Accepted: Stopping ends with the status.
  if (outcome.kind === 'accepted') return
  end()
  if (outcome.kind === 'not_sent') {
    useToasts().addToast(localizationRuntime.translate('agents.interrupt.notSent'), 'error')
  } else if (outcome.kind === 'refused') {
    console.warn(`Could not stop ${input.agentName}: ${outcome.detail}`)
    useToasts().addToast(localizationRuntime.translate('agents.interrupt.failed', { name: input.agentName }), 'error')
  }
}
