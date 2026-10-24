import type { NodeTransportReason } from '~/utils/nodeIdentityProbe'

/** What one address answered when a node looked for another node there (server `PeerAddressAttempt`). */
export type NodeAddressAttempt = { address: string; result: NodeTransportReason | 'not_autobyteus' | 'different_node' | 'identity_pending' }

/**
 * A refused remote-collaboration settings change, on this node or on another one, as the server's GraphQL error
 * extensions carry it (one-nodes-tab REQ-707, REQ-708). `PEER_UNREACHABLE` is also how a node this window could not
 * reach is reported (with the window's reason and the node's address).
 */
export interface NodeSettingsFailure {
  code: string
  message: string
  reason?: NodeTransportReason
  address?: string
  loopbackInContainer?: boolean
  attempts?: NodeAddressAttempt[]
}

export class NodeSettingsError extends Error {
  constructor(readonly failure: NodeSettingsFailure) {
    super(failure.message)
    this.name = 'NodeSettingsError'
  }
}

const REASONS = new Set<string>(['refused', 'timeout', 'not_found', 'unreachable'])

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> | null }

/** The first GraphQL error of an answer, read as a settings failure. */
export const settingsFailureOf = (error: GraphqlErrorLike): NodeSettingsFailure => {
  const ext = error.extensions ?? {}
  const failure: NodeSettingsFailure = {
    code: typeof ext.code === 'string' ? ext.code : 'REMOTE_COLLABORATION_SETTINGS_FAILED',
    message: error.message || 'The change was not made.',
  }
  if (typeof ext.reason === 'string' && REASONS.has(ext.reason)) failure.reason = ext.reason as NodeTransportReason
  if (typeof ext.address === 'string') failure.address = ext.address
  if (typeof ext.loopbackInContainer === 'boolean') failure.loopbackInContainer = ext.loopbackInContainer
  if (Array.isArray(ext.attempts)) failure.attempts = ext.attempts as NodeAddressAttempt[]
  return failure
}

/** Throws the answer's first GraphQL error as a `NodeSettingsError`. */
export const throwSettingsErrors = (errors: ReadonlyArray<GraphqlErrorLike> | undefined): void => {
  if (errors?.length) throw new NodeSettingsError(settingsFailureOf(errors[0]!))
}

/** Any error from a settings call, as a failure the page words (a thrown Apollo error carries its GraphQL errors). */
export const asSettingsFailure = (error: unknown): NodeSettingsFailure => {
  if (error instanceof NodeSettingsError) return error.failure
  const graphQLErrors = (error as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors
  if (graphQLErrors?.length) return settingsFailureOf(graphQLErrors[0]!)
  return { code: 'REMOTE_COLLABORATION_SETTINGS_FAILED', message: error instanceof Error ? error.message : String(error) }
}
