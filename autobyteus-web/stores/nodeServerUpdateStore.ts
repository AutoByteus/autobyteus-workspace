import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

/** The last in-place update of a node (C1 `update`, frozen; fields this window does not know are ignored). */
export interface NodeUpdateState {
  state: 'idle' | 'running' | 'succeeded' | 'failed' | 'refused'
  targetVersion: string | null
  step: string | null
  code: string | null
  message: string | null
}

/** A node's answer to `GET /rest/node-update` (C1, frozen across versions). */
export interface NodeServerStatus {
  inPlaceUpdate: 'available' | 'unavailable' | 'error'
  version: string | null
  target?: { version: string; relation: 'newer' | 'same' | 'older' }
  update?: NodeUpdateState
  message?: string
  updateBlocker?: { code: string; message: string }
}

/**
 * What this window knows about one remote node's server package and update. `connection`: `ok` after an answer;
 * `restarting` while an update this window follows gets no answer (at most `NODE_UPDATE_RESTART_GRACE_MS`);
 * `unreachable` after that, or when the node does not answer outside an update.
 */
export interface NodeServerUpdateEntry {
  address: string
  status: NodeServerStatus | null
  connection: 'unknown' | 'ok' | 'restarting' | 'unreachable'
  /** This window started the node's update, or saw it running: its result is shown when it ends. */
  followed: boolean
  requesting: boolean
  /** This window's last request, refused by the node before it started (C1 409) or not delivered. */
  refusal: { code: string | null; message: string } | null
}

export const NODE_UPDATE_POLL_MS = 2_000
export const NODE_UPDATE_SLOW_POLL_MS = 10_000
export const NODE_UPDATE_RESTART_GRACE_MS = 5 * 60_000
const NODE_UPDATE_REQUEST_TIMEOUT_MS = 10_000

const isStatus = (value: unknown): value is NodeServerStatus => {
  const inPlaceUpdate = (value as { inPlaceUpdate?: unknown } | null)?.inPlaceUpdate
  return inPlaceUpdate === 'available' || inPlaceUpdate === 'unavailable' || inPlaceUpdate === 'error'
}

/**
 * The server version and in-place update of the remote nodes on the Nodes page (design DS-001, DS-005). It asks a
 * node when its row is shown, offers this app's version as the target, sends an update request only when the user
 * clicks (AC-010), and polls only while an update runs: every 2 s, "Restarting…" while the node is down for at most
 * 5 minutes, then every 10 s as "Not reachable" until it answers again.
 */
export const useNodeServerUpdateStore = defineStore('nodeServerUpdate', () => {
  const appUpdate = useAppUpdateStore()
  const entries = reactive<Record<string, NodeServerUpdateEntry>>({})
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}
  const failingSince: Record<string, number> = {}
  /** Nodes that accepted this window's request and have not answered since. */
  const accepted = new Set<string>()

  /** The version this app offers a node: its own (the desktop's single source of its version). */
  const target = computed<string | null>(() => appUpdate.currentVersion || null)

  const stopTimer = (key: string): void => {
    clearTimeout(timers[key])
    delete timers[key]
  }
  const schedule = (key: string, delayMs: number): void => {
    stopTimer(key)
    timers[key] = setTimeout(() => { void refresh(key) }, delayMs)
  }

  const urlOf = (entry: NodeServerUpdateEntry): string => `${normalizeNodeBaseUrl(entry.address)}/rest/node-update`

  /** An update of this node is under way as far as this window knows. */
  const inUpdate = (key: string, entry: NodeServerUpdateEntry): boolean =>
    entry.requesting || accepted.has(key) || entry.status?.update?.state === 'running'

  /** Asks the node now, then schedules the next ask while an update runs. */
  const refresh = async (key: string): Promise<void> => {
    const entry = entries[key]
    if (!entry) return
    stopTimer(key)
    const address = entry.address
    let answer: unknown = null
    try {
      const query = target.value ? `?target=${encodeURIComponent(target.value)}` : ''
      const response = await fetch(`${urlOf(entry)}${query}`, { signal: AbortSignal.timeout(NODE_UPDATE_REQUEST_TIMEOUT_MS) })
      answer = await response.json()
    } catch {
      answer = null
    }
    const current = entries[key]
    if (!current || current.address !== address) return
    if (isStatus(answer)) {
      const wasInUpdate = inUpdate(key, current)
      delete failingSince[key]
      accepted.delete(key)
      current.status = answer
      current.connection = 'ok'
      const running = answer.update?.state === 'running'
      if (running) current.followed = true
      // A node whose starter did not answer keeps being asked at the same pace while its update runs (N-4).
      if (running || (answer.inPlaceUpdate === 'error' && wasInUpdate)) schedule(key, NODE_UPDATE_POLL_MS)
      return
    }
    if (!inUpdate(key, current)) {
      current.connection = 'unreachable'
      return
    }
    const since = failingSince[key] ??= Date.now()
    if (Date.now() - since < NODE_UPDATE_RESTART_GRACE_MS) {
      current.connection = 'restarting'
      schedule(key, NODE_UPDATE_POLL_MS)
    } else {
      current.connection = 'unreachable'
      schedule(key, NODE_UPDATE_SLOW_POLL_MS)
    }
  }

  /** The row of a reachable remote node is shown at `address`: ask it (again when the address changed). */
  const watch = (key: string, address: string): void => {
    if (entries[key]?.address === address) return
    stopTimer(key)
    delete failingSince[key]
    accepted.delete(key)
    entries[key] = { address, status: null, connection: 'unknown', followed: false, requesting: false, refusal: null }
    void refresh(key)
  }

  /** The row is gone, or its node is not reachable from this window: stop asking it. */
  const unwatch = (key: string): void => {
    stopTimer(key)
    delete failingSince[key]
    accepted.delete(key)
    delete entries[key]
  }

  /** The user clicked "Update to <version>": the one place this window asks a node to update (AC-010). */
  const requestUpdate = async (key: string): Promise<void> => {
    const entry = entries[key]
    const version = target.value
    if (!entry || !version || entry.requesting) return
    entry.requesting = true
    entry.refusal = null
    try {
      const response = await fetch(urlOf(entry), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version }),
        signal: AbortSignal.timeout(NODE_UPDATE_REQUEST_TIMEOUT_MS),
      })
      const answer = await response.json().catch(() => null) as { accepted?: unknown; refused?: unknown; message?: unknown } | null
      if (response.status === 202 && answer?.accepted === true) {
        entry.followed = true
        accepted.add(key)
      } else {
        entry.refusal = {
          code: typeof answer?.refused === 'string' ? answer.refused : null,
          message: typeof answer?.message === 'string' ? answer.message : `HTTP ${response.status}`,
        }
      }
    } catch (error) {
      entry.refusal = { code: null, message: error instanceof Error ? error.message : String(error) }
    } finally {
      entry.requesting = false
    }
    await refresh(key)
  }

  return { entries, target, watch, unwatch, refresh, requestUpdate }
})
