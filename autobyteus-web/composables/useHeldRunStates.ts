import type { RunStatusRunRef } from '@autobyteus/collaboration-stream-contracts'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { watchHeldRuns } from '~/services/runStatus/heldRuns'

/**
 * Holds the runs a list shows on `/ws/run-status` while the component lives (autobyteus-461 SR-086 G-A4): their own
 * states, a team's or org's status computed by its root, read with `runStateOf`.
 */
export const useHeldRunStates = (refs: () => readonly RunStatusRunRef[]): void => {
  const runStatus = useRunStatusStore()
  watchHeldRuns(refs, (held) => runStatus.hold(held))
}
