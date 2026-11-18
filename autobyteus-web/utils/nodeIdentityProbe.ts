import { isNodeId } from '~/types/node'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

/**
 * Why a node did not answer as an AutoByteus node (one-nodes-tab REQ-707). `refused`, `timeout`, `not_found` and
 * `unreachable` mirror the server's transport reasons; `not_autobyteus` is something that answered without an identity;
 * `identity_pending` is a node whose identity is waiting for its data migration (autobyteus-290 N-910);
 * `network_refused` is a node that does not accept connections from this computer's network (autobyteus-437 M-8b);
 * `host_refused` is a node whose Host gate refuses the name in the address, read from its answer (the desktop window
 * reads it; the same reason a node gives for an address it checked, autobyteus-426 REQ-020); `window_refused` is
 * something that answers but refuses this window's request, which the window cannot read, so it cannot say why (a
 * browser window, autobyteus-435 REQ-003, DEC-019).
 */
export type NodeTransportReason = 'refused' | 'timeout' | 'not_found' | 'unreachable'
export type NodeProbeCause = NodeTransportReason | 'not_autobyteus' | 'identity_pending' | 'network_refused' | 'host_refused' | 'window_refused'

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

/** The code of a node's 403 answer, read from a clone (the body stays readable). */
const refusalCodeOf = async (response: Response): Promise<unknown> => {
  if (response.status !== 403) return null
  const answer = await response.clone().json().catch(() => null) as { code?: unknown } | null
  return answer?.code ?? null
}

/**
 * Whether anything answers `url` at all, asked without reading the answer (an opaque `no-cors` GET): it resolves when
 * something answers, even a refusal without CORS headers, and rejects when nothing does.
 */
const answersOpaquely = (url: string, fetchImpl: typeof globalThis.fetch, timeoutMs: number): Promise<boolean> =>
  fetchImpl(url, { method: 'GET', mode: 'no-cors', signal: AbortSignal.timeout(timeoutMs) }).then(() => true, () => false)

/**
 * Which node answers at `baseUrl` as this window reaches it: one GET of its public `/rest/remote-access/status`, which
 * also tells whether it is reachable now (one-nodes-tab DS-001, DS-002). When that GET fails for a reason other than
 * time, the window asks once more without reading the answer: an answer means something there refuses this window (in
 * a browser window a node's Host gate refusal carries no CORS headers, so its 403 cannot be read), autobyteus-435
 * REQ-003.
 */
export async function probeNodeIdentity(
  baseUrl: string,
  options: { timeoutMs?: number; fetchImpl?: typeof globalThis.fetch } = {},
): Promise<NodeIdentityProbeResult> {
  let url: string
  try { url = `${normalizeNodeBaseUrl(baseUrl)}/rest/remote-access/status` } catch { return { ok: false, cause: 'unreachable' } }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? NODE_IDENTITY_PROBE_TIMEOUT_MS
  let response: Response
  try {
    response = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    const reason = windowFailureReason(error, baseUrl)
    if (reason === 'timeout') return { ok: false, cause: 'timeout' }
    return { ok: false, cause: await answersOpaquely(url, fetchImpl, timeoutMs) ? 'window_refused' : reason }
  }
  // A node answers 403 `NODE_NETWORK_REFUSED` when it does not accept this network (node access model NA-3), and
  // `REMOTE_ACCESS_HOST_REFUSED` when its Host gate refuses the name: a window that can read it (the desktop window,
  // whose `file://` requests Electron does not subject to CORS) says exactly that (autobyteus-435 DEC-019).
  const refusalCode = await refusalCodeOf(response)
  if (refusalCode === 'NODE_NETWORK_REFUSED') return { ok: false, cause: 'network_refused' }
  if (refusalCode === 'REMOTE_ACCESS_HOST_REFUSED') return { ok: false, cause: 'host_refused' }
  if (!response.ok) return { ok: false, cause: await isIdentityPending(response) ? 'identity_pending' : 'not_autobyteus' }
  try {
    const answer = await response.json() as { nodeId?: unknown } | null
    const id = answer?.nodeId
    return isNodeId(id) ? { ok: true, nodeId: id } : { ok: false, cause: 'not_autobyteus' }
  } catch (error) {
    return windowFailureReason(error, baseUrl) === 'timeout' ? { ok: false, cause: 'timeout' } : { ok: false, cause: 'not_autobyteus' }
  }
}
