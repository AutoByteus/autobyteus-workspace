import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

export interface ResolvedRemoteNodeIdentity {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
}

type DiscoverySelfResponse = {
  nodeId?: string;
  nodeName?: string;
  baseUrl?: string;
}

export async function resolveRemoteNodeIdentity(
  targetBaseUrl: string,
  options?: {
    fetchImpl?: typeof globalThis.fetch;
  },
): Promise<ResolvedRemoteNodeIdentity> {
  const normalizedBaseUrl = normalizeNodeBaseUrl(targetBaseUrl)
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch

  if (typeof fetchImpl !== 'function') {
    throw new Error('REMOTE_IDENTITY_UNRESOLVED: fetch API is unavailable')
  }

  const response = await fetchImpl(`${normalizedBaseUrl}/rest/node-discovery/self`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`REMOTE_IDENTITY_UNRESOLVED: self endpoint returned status ${response.status}`)
  }

  const payload = (await response.json()) as DiscoverySelfResponse
  const nodeId = typeof payload.nodeId === 'string' ? payload.nodeId.trim() : ''
  const nodeName = typeof payload.nodeName === 'string' ? payload.nodeName.trim() : ''
  const payloadBaseUrl = typeof payload.baseUrl === 'string' ? payload.baseUrl.trim() : ''

  if (!nodeId) {
    throw new Error('REMOTE_IDENTITY_UNRESOLVED: nodeId is missing in discovery self payload')
  }

  return {
    nodeId,
    nodeName: nodeName || nodeId,
    baseUrl: payloadBaseUrl ? normalizeNodeBaseUrl(payloadBaseUrl) : normalizedBaseUrl,
  }
}
