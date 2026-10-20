import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { AgentRuntimes } from '~/graphql/queries/agentRuntimesQueries'
import {
  CancelAgentRuntimeSignIn, CheckAgentRuntimes, StartAgentRuntimeSignIn, UpdateAgentRuntime,
} from '~/graphql/mutations/agentRuntimesMutations'
import type { AgentRuntime } from '~/types/agentRuntimes'

/** While a check, an update or a sign-in runs, the rows are read this often. */
export const BUSY_POLL_MS = 2000
/** Otherwise this often, which also refreshes running-agent counts so a blocked Update enables itself. */
export const IDLE_POLL_MS = 10000

/** What the polite live region says after a reading (the view words it). */
export type AgentRuntimeAnnouncement =
  | { kind: 'checked' }
  | { kind: 'updated'; runtimeKind: string; version: string }
  | { kind: 'updateFailed'; runtimeKind: string }
  | { kind: 'signedIn'; runtimeKind: string }

type GraphqlErrorLike = { message?: string }

export const isRowChecking = (runtime: AgentRuntime) =>
  runtime.updates.state === 'CHECKING' || runtime.account.state === 'CHECKING'

const isBusy = (runtimes: AgentRuntime[]) =>
  runtimes.some((runtime) => isRowChecking(runtime) || runtime.operation?.state === 'RUNNING')

/** Finished checks, updates and sign-ins between two readings. */
const announcementsBetween = (before: AgentRuntime[], after: AgentRuntime[]): AgentRuntimeAnnouncement[] => {
  const previous = new Map(before.map((runtime) => [runtime.runtimeKind, runtime]))
  const done: AgentRuntimeAnnouncement[] = []
  for (const runtime of after) {
    const was = previous.get(runtime.runtimeKind)
    if (was?.operation?.state !== 'RUNNING') continue
    if (was.operation.kind === 'UPDATE' && runtime.operation?.kind === 'UPDATE') {
      if (runtime.operation.state === 'SUCCEEDED') {
        done.push({ kind: 'updated', runtimeKind: runtime.runtimeKind, version: runtime.operation.toVersion ?? '' })
      } else if (runtime.operation.state === 'FAILED') {
        done.push({ kind: 'updateFailed', runtimeKind: runtime.runtimeKind })
      }
    }
    if (was.operation.kind === 'SIGN_IN' && !runtime.operation && runtime.account.state === 'SIGNED_IN') {
      done.push({ kind: 'signedIn', runtimeKind: runtime.runtimeKind })
    }
  }
  if (before.some(isRowChecking) && !after.some(isRowChecking)) done.push({ kind: 'checked' })
  return done
}

/**
 * The Agent Runtimes section's data: `open()` asks the node to check its runtimes, then one read-only request is polled
 * every 2 s while anything runs and every 10 s otherwise, until the caller's scope ends; the latest request wins. A
 * running update or sign-in keeps running on the node while the page is closed.
 */
export const useAgentRuntimes = () => {
  const node = useWindowNodeContextStore()
  const runtimes = shallowRef<AgentRuntime[] | null>(null)
  const loadStatus = ref<'loading' | 'error' | 'ready'>('loading')
  /** True while the page's own check request is in flight (the rows then report their own checks). */
  const requestingCheck = ref(false)
  const announcements = shallowRef<AgentRuntimeAnnouncement[]>([])
  let latest = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const clearTimer = () => { if (timer) clearTimeout(timer); timer = null }
  const schedule = (delay: number) => {
    clearTimer()
    if (!disposed) timer = setTimeout(() => { timer = null; void refresh() }, delay)
  }

  const refresh = async (): Promise<void> => {
    clearTimer()
    const seq = ++latest
    const revision = node.bindingRevision
    const current = () => !disposed && seq === latest && node.bindingRevision === revision
    try {
      if (!await node.waitForBoundBackendReady()) throw new Error(node.lastReadyError || 'Bound backend is not ready')
      const { data, errors } = await getApolloClient().query({
        query: AgentRuntimes, fetchPolicy: 'network-only', context: { queryDeduplication: false },
      })
      if (errors?.length) throw new Error(errors.map((entry: GraphqlErrorLike) => entry.message).join(', '))
      if (!current()) return
      const next = data.agentRuntimes as AgentRuntime[]
      const done = runtimes.value ? announcementsBetween(runtimes.value, next) : []
      if (done.length) announcements.value = done
      runtimes.value = next
      loadStatus.value = 'ready'
    } catch {
      if (!current()) return
      // The first reading failed: the page offers Retry. A later failed poll keeps the rows and tries again.
      if (!runtimes.value) {
        loadStatus.value = 'error'
        return
      }
    }
    schedule(runtimes.value && isBusy(runtimes.value) ? BUSY_POLL_MS : IDLE_POLL_MS)
  }

  /**
   * One action. A refused or failed request shows no message of its own: the rows read right after show the node's
   * state (e.g. Update blocked by agents, an operation already running).
   */
  const mutate = async (mutation: DocumentNode, variables?: Record<string, unknown>): Promise<boolean> => {
    try {
      const { errors } = await getApolloClient().mutate({ mutation, variables })
      return !errors?.length
    } catch {
      return false
    }
  }

  /** A user-started check (page open, Check again, Retry): the node checks, then the rows are read. */
  const check = async (): Promise<void> => {
    const revision = node.bindingRevision
    if (!runtimes.value) loadStatus.value = 'loading'
    requestingCheck.value = true
    try {
      const ready = await node.waitForBoundBackendReady()
      if (ready) await mutate(CheckAgentRuntimes)
    } finally {
      if (node.bindingRevision === revision) requestingCheck.value = false
    }
    if (!disposed && node.bindingRevision === revision) await refresh()
  }

  const act = async (mutation: DocumentNode, runtimeKind: string): Promise<boolean> => {
    const ok = await mutate(mutation, { runtimeKind })
    void refresh()
    return ok
  }

  // Another node bound to this window: start over with its runtimes.
  watch(() => node.bindingRevision, () => {
    runtimes.value = null
    announcements.value = []
    void check()
  })
  onScopeDispose(() => { disposed = true; latest++; clearTimer() })

  return {
    runtimes,
    loadStatus,
    requestingCheck,
    /** What the latest reading finished (for the polite live region). */
    announcements,
    check,
    update: (runtimeKind: string) => act(UpdateAgentRuntime, runtimeKind),
    signIn: (runtimeKind: string) => act(StartAgentRuntimeSignIn, runtimeKind),
    cancelSignIn: (runtimeKind: string) => act(CancelAgentRuntimeSignIn, runtimeKind),
  }
}

export type AgentRuntimesState = ReturnType<typeof useAgentRuntimes>
