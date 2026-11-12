import { defineStore } from 'pinia'
import { shallowRef, watch } from 'vue'
import type { CollaborationRootKind, ListedRunRefDto } from '@autobyteus/collaboration-stream-contracts'
import { readListedRunChildren, type ListedRunAnswer } from '~/services/listedRuns/listedRunChildrenQuery'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const keyOf = (kind: CollaborationRootKind, runId: string): string => `${kind}:${runId}`

/**
 * The children of the listed runs, from the history poll (autobyteus-461 SR-055): for each listed run of every kind, its
 * activity and the runs on this node it delegated to that its view shows, each by its identity with its agents'
 * statuses. The run list draws the delegated rows of a listed run that is not open from its answer (the open run's rows
 * come from its view); a child no longer answered leaves at the next poll, a reopened one comes back. No view is read.
 */
export const useListedRunChildrenStore = defineStore('listedRunChildren', () => {
  const answers = shallowRef<Readonly<Record<string, ListedRunAnswer>>>({})
  const binding = useWindowNodeContextStore()
  /** The read in flight; a poll that finds one shares it. */
  let reading: Promise<boolean> | null = null

  /**
   * Reads the given listed runs' children and keeps the answers (a run no longer listed drops its answer). Settles with
   * whether any answer changed. A failed read keeps the previous answers and reports nothing changed.
   */
  const refresh = (runs: readonly ListedRunRefDto[]): Promise<boolean> => {
    if (reading) return reading
    const revision = binding.bindingRevision
    const read = (async (): Promise<boolean> => {
      let read: ListedRunAnswer[]
      try {
        read = runs.length ? await readListedRunChildren(runs) : []
      } catch (cause) {
        console.warn('[listedRunChildren] Could not read the listed runs\' children.', cause)
        return false
      }
      if (binding.bindingRevision !== revision) return false
      const next = Object.freeze(Object.fromEntries(read.map((answer) => [keyOf(answer.kind, answer.runId), answer])))
      if (JSON.stringify(next) === JSON.stringify(answers.value)) return false
      answers.value = next
      return true
    })().finally(() => { if (reading === read) reading = null })
    reading = read
    return read
  }

  /** A listed run's last answer; null before its first. */
  const answerOf = (kind: CollaborationRootKind, runId: string): ListedRunAnswer | null => answers.value[keyOf(kind, runId)] ?? null

  // Another node's runs: nothing answered for this one holds.
  watch(() => binding.bindingRevision, () => { answers.value = {} }, { flush: 'sync' })

  return { answers, refresh, answerOf }
})
