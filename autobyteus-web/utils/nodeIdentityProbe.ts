import { isNodeId } from '~/types/node'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

/**
 * Why a node did not answer as an AutoByteus node (one-nodes-tab REQ-707). `refused`, `timeout`, `not_found` and
 * `unreachable` mirror the server's transport reasons; `not_autobyteus` is something that answered without an identity;
 * `identity_pending` is a node whose identity is waiting for its data migration (autobyteus-290 N-910).
 */
export type NodeTransportReason = 'refused' | 'timeout' | 'not_found' | 'unreachable'
export type NodeProbeCause = NodeTransportReason | 'not_autobyteus' | 'identity_pending'

export type NodeIdentityProbeResult =
  | { ok: true; nodeId: string }
  | { ok: false; cause: NodeProbeCause }

/** The window's own identity probe waits this long (design § Off-Spine Concerns: window, desktop-local). */
export const NODE_IDENTITY_PROBE_TIMEOUT_MS = 5_000

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const hostOf = (baseUrl: string): string => {
  try { return new URL(baseUrl).host } catch { return baseUrl }
}

const isLoopback = (baseUrl: string): boolean => {
  try { return LOOPBACK_HOSTS.has(new URL(baseUrl).hostname.toLowerCase()) } catch { return false }
}

/**
 * The cause of a request from this window that got no answer. A browser does not say why a request failed, only
 * that it did; on a loopback address that can only mean nothing answers at that port.
 */
export const windowFailureReason = (error: unknown, baseUrl: string): NodeTransportReason => {
  const name = (error as { name?: unknown } | null)?.name
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout'
  return isLoopback(baseUrl) ? 'refused' : 'unreachable'
}

/** A node answers HTTP 503 with `NODE_IDENTITY_NOT_MIGRATED` while its identity waits for its data migration. */
const isIdentityPending = async (response: Response): Promise<boolean> => {
  if (response.status !== 503) return false
  const answer = await response.json().catch(() => null) as { code?: unknown } | null
  return answer?.code === 'NODE_IDENTITY_NOT_MIGRATED'
}

/**
 * Which node answers at `baseUrl` as this window reaches it: one GET of its public `/rest/remote-access/status`, which
 * also tells whether it is reachable now (one-nodes-tab DS-001, DS-002).
 */
export async function probeNodeIdentity(
  baseUrl: string,
  options: { timeoutMs?: number; fetchImpl?: typeof globalThis.fetch } = {},
): Promise<NodeIdentityProbeResult> {
  let url: string
  try { url = `${normalizeNodeBaseUrl(baseUrl)}/rest/remote-access/status` } catch { return { ok: false, cause: 'unreachable' } }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  let response: Response
  try {
    response = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(options.timeoutMs ?? NODE_IDENTITY_PROBE_TIMEOUT_MS) })
  } catch (error) {
    return { ok: false, cause: windowFailureReason(error, baseUrl) }
  }
  if (!response.ok) return { ok: false, cause: await isIdentityPending(response) ? 'identity_pending' : 'not_autobyteus' }
  try {
    const answer = await response.json() as { nodeId?: unknown } | null
    const id = answer?.nodeId
    return isNodeId(id) ? { ok: true, nodeId: id } : { ok: false, cause: 'not_autobyteus' }
  } catch (error) {
    return windowFailureReason(error, baseUrl) === 'timeout' ? { ok: false, cause: 'timeout' } : { ok: false, cause: 'not_autobyteus' }
  }
}
