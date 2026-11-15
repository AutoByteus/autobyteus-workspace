import { defineStore } from 'pinia'
import { shallowRef, watch } from 'vue'
import {
  applyRunTreeChange,
  runTreeDtoSchema,
  type RunStatusRunRef,
  type RunTreeChangeDto,
  type RunTreeDto,
  type RunTreeRowDto,
} from '@autobyteus/collaboration-stream-contracts'
import { GetRunTree } from '~/graphql/queries/runTreeQueries'
import { getApolloClient } from '~/utils/apolloClient'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { watchHeldRuns } from '~/services/runStatus/heldRuns'

export type RunTreeRef = Readonly<Pick<RunStatusRunRef, 'kind' | 'runId'>>

/** A run's tree as the client has it: from its open view's stream, or from the `runTree` query. */
type HeldTree = Readonly<{ rows: readonly RunTreeRowDto[]; via: 'stream' | 'query' }>

const keyOf = (ref: RunTreeRef): string => `${ref.kind}:${ref.runId}`

/**
 * An agent of a run on a peer node, as its tree row has it (autobyteus-461 G-D1): its run and node, and what the node
 * last answered about it (`null` while not answered).
 */
export type PeerRunOfAgent = Readonly<{
  runId: string
  nodeId: string
  nodeName: string
  reachable: boolean | null
  title: string | null
}>

/** The runs whose statuses a tree's rows show (SR-083): each row's own run, never the org's own parts (its stream has them). */
export const statusRunsOf = (rows: readonly RunTreeRowDto[]): RunStatusRunRef[] => rows.flatMap((row): RunStatusRunRef[] => {
  const target = row.openTarget
  if (!target || target.runKind === 'agent_org') return []
  return [{ kind: target.runKind, runId: target.runId }]
})

/**
 * Every run tree the window shows (autobyteus-461 SR-082, SR-084): the rows the server built, and nothing derived from
 * them. A run's open view feeds its tree from its stream (`RUN_TREE_SNAPSHOT`, then each `run_tree_changed`); a listed
 * run that is not open reads `runTree(run)` when it is first shown and again on its `RUN_TREE_CHANGED`
 * (`/ws/run-status`). Only the newest answer applies: a stream snapshot, or a later read, supersedes a read in flight.
 *
 * A shown tree is held (`hold`): its run and its rows' runs are held on `/ws/run-status`, for their statuses and its
 * notices. Desktop, phone, the Task card and Settings all read their rows here.
 */
export const useRunTreeStore = defineStore('runTree', () => {
  const trees = shallowRef<Record<string, HeldTree>>({})
  /** The trees shown now, by count. */
  const held = shallowRef<Record<string, { ref: RunTreeRef; count: number }>>({})
  /** Per tree, the newest answer's number: a read applies only while it is still the newest. */
  const generations = new Map<string, number>()
  const runStatus = useRunStatusStore()

  const set = (key: string, tree: HeldTree | null): void => {
    const next = { ...trees.value }
    if (tree) next[key] = Object.freeze(tree)
    else delete next[key]
    trees.value = next
  }
  const nextGeneration = (key: string): number => {
    const generation = (generations.get(key) ?? 0) + 1
    generations.set(key, generation)
    return generation
  }

  /** The run's open view sent its tree (at its snapshot's base): it replaces the rows, and any read in flight. */
  const streamSnapshot = (ref: RunTreeRef, rows: readonly RunTreeRowDto[]): void => {
    const key = keyOf(ref)
    nextGeneration(key)
    set(key, { rows: Object.freeze([...rows]), via: 'stream' })
  }

  /** A numbered change on the run's open view, applied to the rows its snapshot gave. */
  const streamChange = (ref: RunTreeRef, change: RunTreeChangeDto): void => {
    const key = keyOf(ref)
    const tree = trees.value[key]
    if (tree?.via !== 'stream') throw new Error(`A tree change for ${key} arrived before its tree snapshot.`)
    set(key, { rows: Object.freeze(applyRunTreeChange(tree.rows, change)), via: 'stream' })
  }

  /**
   * The run's view closed: its rows stay, and from now on its notices (`RUN_TREE_CHANGED`, the shown run is held) read it
   * again; a view that opens again sends its own snapshot. Nothing is read at the close itself.
   */
  const streamEnded = (ref: RunTreeRef): void => {
    const key = keyOf(ref)
    const tree = trees.value[key]
    if (tree?.via !== 'stream') return
    set(key, { rows: tree.rows, via: 'query' })
  }

  /** Reads the run's tree, unless its open view feeds it; a later read or a stream snapshot supersedes this one. */
  const read = async (ref: RunTreeRef): Promise<void> => {
    const key = keyOf(ref)
    if (trees.value[key]?.via === 'stream') return
    const generation = nextGeneration(key)
    const revision = useWindowNodeContextStore().bindingRevision
    try {
      const result = await getApolloClient().query<{ runTree: unknown }>({
        query: GetRunTree, variables: { kind: ref.kind, runId: ref.runId },
        fetchPolicy: 'network-only', context: { queryDeduplication: false },
      })
      if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
      const tree: RunTreeDto = runTreeDtoSchema.parse(result.data?.runTree)
      if (tree.kind !== ref.kind || tree.runId !== ref.runId) throw new Error(`The run tree answered for ${tree.kind}:${tree.runId}, not ${key}.`)
      if (generations.get(key) !== generation || useWindowNodeContextStore().bindingRevision !== revision) return
      set(key, { rows: Object.freeze(tree.rows), via: 'query' })
    } catch (cause) {
      // The rows shown stay; the next notice or showing reads again.
      if (generations.get(key) === generation) console.warn(`[runTree] Could not read the tree of ${key}.`, cause)
    }
  }

  /** Shows the run's tree until the returned release is called: read when first shown (unless its view feeds it). */
  const hold = (ref: RunTreeRef): (() => void) => {
    const key = keyOf(ref)
    const entry = held.value[key]
    held.value = { ...held.value, [key]: { ref, count: (entry?.count ?? 0) + 1 } }
    if (!entry) void read(ref)
    let released = false
    return () => {
      if (released) return
      released = true
      const current = held.value[key]
      if (!current) return
      const next = { ...held.value }
      if (current.count > 1) next[key] = { ref, count: current.count - 1 }
      else delete next[key]
      held.value = next
    }
  }

  const rowsOf = (ref: RunTreeRef): readonly RunTreeRowDto[] => trees.value[keyOf(ref)]?.rows ?? []

  /**
   * The peer's run an agent run belongs to, from the shown trees' peer rows (the row's `peer` and `openTarget`); `null`
   * for a run of this node. Run IDs are unique, so any tree that shows it answers the same.
   */
  const peerRunOf = (agentRunId: string | null | undefined): PeerRunOfAgent | null => {
    if (!agentRunId) return null
    for (const tree of Object.values(trees.value)) {
      const row = tree.rows.find((candidate) => candidate.peer && candidate.openTarget?.agentRunId === agentRunId)
      if (row?.peer && row.openTarget) {
        const { nodeId, nodeName, reachable, title } = row.peer
        return Object.freeze({ runId: row.openTarget.runId, nodeId, nodeName, reachable, title })
      }
    }
    return null
  }
  /** Whether the run's tree has been answered (by its view or a read). */
  const hasTree = (ref: RunTreeRef): boolean => Boolean(trees.value[keyOf(ref)])

  // The shown trees' runs and their rows' runs, held for their statuses and notices (SR-083).
  watchHeldRuns(() => Object.values(held.value).flatMap(({ ref }) => [{ kind: ref.kind, runId: ref.runId }, ...statusRunsOf(rowsOf(ref))]),
    (refs) => runStatus.hold(refs))
  // A shown tree that is read, not fed by its view, reads again when its rows changed (AR-028).
  watch(() => Object.values(held.value).map(({ ref }) => [ref, runStatus.treeRevisionOf(ref)] as const), (next, previous) => {
    const before = new Map((previous ?? []).map(([ref, revision]) => [keyOf(ref), revision]))
    for (const [ref, revision] of next) {
      const was = before.get(keyOf(ref))
      if (was !== undefined && revision !== was) void read(ref)
    }
  })
  // Another node: nothing read from the last one applies.
  watch(() => useWindowNodeContextStore().bindingRevision, () => {
    for (const key of Object.keys(trees.value)) nextGeneration(key)
    trees.value = {}
    for (const { ref } of Object.values(held.value)) void read(ref)
  }, { flush: 'sync' })

  return { trees, streamSnapshot, streamChange, streamEnded, read, hold, rowsOf, hasTree, peerRunOf }
})
