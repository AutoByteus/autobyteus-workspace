import type { RemoteBrowserBridgeDescriptor } from '~/types/node'
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints'

type GraphqlError = {
  message?: string
}

type GraphqlResponse<T> = {
  data?: T
  errors?: GraphqlError[]
}

const REGISTER_REMOTE_BROWSER_BRIDGE_MUTATION = `
  mutation RegisterRemoteBrowserBridge($input: RemoteBrowserBridgeInput!) {
    registerRemoteBrowserBridge(input: $input) {
      success
      message
    }
  }
`

const CLEAR_REMOTE_BROWSER_BRIDGE_MUTATION = `
  mutation ClearRemoteBrowserBridge {
    clearRemoteBrowserBridge {
      success
      message
    }
  }
`

async function postGraphql<TData>(
  nodeBaseUrl: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const response = await fetch(deriveNodeEndpoints(nodeBaseUrl).graphqlHttp, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  const payload = (await response.json()) as GraphqlResponse<TData>
  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.message || `GraphQL request failed with HTTP ${response.status}.`)
  }

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message || 'GraphQL request failed.')
  }

  if (!payload.data) {
    throw new Error('GraphQL request returned no data.')
  }

  return payload.data
}

export async function registerRemoteBrowserBridge(
  nodeBaseUrl: string,
  descriptor: RemoteBrowserBridgeDescriptor,
): Promise<void> {
  const data = await postGraphql<{
    registerRemoteBrowserBridge: {
      success: boolean
      message: string
    }
  }>(
    nodeBaseUrl,
    REGISTER_REMOTE_BROWSER_BRIDGE_MUTATION,
    { input: descriptor },
  )

  if (!data.registerRemoteBrowserBridge.success) {
    throw new Error(data.registerRemoteBrowserBridge.message)
  }
}

export async function clearRemoteBrowserBridge(nodeBaseUrl: string): Promise<void> {
  const data = await postGraphql<{
    clearRemoteBrowserBridge: {
      success: boolean
      message: string
    }
  }>(
    nodeBaseUrl,
    CLEAR_REMOTE_BROWSER_BRIDGE_MUTATION,
  )

  if (!data.clearRemoteBrowserBridge.success) {
    throw new Error(data.clearRemoteBrowserBridge.message)
  }
}
