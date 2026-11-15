import { watch, type WatchStopHandle } from 'vue'
import type { RunStatusRunRef } from '@autobyteus/collaboration-stream-contracts'

const KINDS: ReadonlySet<string> = new Set(['agent', 'agent_team', 'agent_org'])

/** The runs as one key: each `kind:runId` once, in order (a run ID has no `:`, a kind none either). */
export const heldRunsKey = (refs: readonly RunStatusRunRef[]): string =>
  [...new Set(refs.map((ref) => `${ref.kind}:${ref.runId}`))].sort().join('|')

const refsOfKey = (key: string): RunStatusRunRef[] => key ? key.split('|').flatMap((part): RunStatusRunRef[] => {
  const at = part.indexOf(':')
  const kind = part.slice(0, at)
  return KINDS.has(kind) ? [{ kind: kind as RunStatusRunRef['kind'], runId: part.slice(at + 1) }] : []
}) : []

/**
 * Holds the runs `refs` names while the watcher lives, changing what it holds only when that set of runs changes
 * (autobyteus-461 CR-461-094). The runs a view shows are read again whenever anything the view reads changes, such as an
 * agent's status; holding again on every such read made the node close and reopen each run's statuses (a peer run's
 * observation on its own node) in a loop, so a status never settled.
 */
export const watchHeldRuns = (
  refs: () => readonly RunStatusRunRef[],
  hold: (refs: readonly RunStatusRunRef[]) => () => void,
): WatchStopHandle => watch(() => heldRunsKey(refs()), (key, _previous, onCleanup) => {
  const runs = refsOfKey(key)
  if (runs.length) onCleanup(hold(runs))
}, { immediate: true })
