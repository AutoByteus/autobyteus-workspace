import type { NodeProbeCause } from '~/utils/nodeIdentityProbe'
import type { NodeSettingsFailure } from '~/utils/nodeSettingsError'

type Translate = (key: string, params?: Record<string, string | number>) => string

export const NODES_PAGE_KEY = 'settings.components.settings.NodesPage.'
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`

const hostName = (host: string): string => host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
const hostOf = (address: string | undefined): string => {
  if (!address) return ''
  try { return new URL(address).host } catch { return address }
}

/**
 * The plain-words cause of a node that did not answer (one-nodes-tab REQ-707): "fetch failed" is never shown. A name
 * that cannot be found says from where when another node looked for it.
 */
export const causeText = (t: Translate, cause: NodeProbeCause | 'host_refused' | undefined, host: string, fromNode?: string): string => {
  switch (cause) {
    // autobyteus-426 REQ-020: the node at the address refuses the name it was addressed by (its Host gate).
    case 'host_refused': return t(k('cause.hostRefused'), { host: hostName(host) })
    case 'refused': return t(k('cause.refused'))
    case 'timeout': return t(k('cause.timeout'))
    case 'not_found': return fromNode ? t(k('cause.dnsFrom'), { host: hostName(host), node: fromNode }) : t(k('cause.dns'), { host: hostName(host) })
    case 'not_autobyteus': return t(k('cause.notAutobyteus'))
    case 'identity_pending': return t(k('cause.identityPending'))
    // autobyteus-437 M-8b: the node refuses this network (it is not this computer, its Tailscale or an allowed network).
    case 'network_refused': return t(k('cause.networkRefused'))
    default: return t(k('cause.unreachable'))
  }
}

/** The Docker hint (design § Loopback Hint Surface): only for a node in a container whose first address was loopback. */
export interface NodeAddressHintModel {
  firstTried: string
  suggestion: string | null
}

export const addressHintOf = (failure: NodeSettingsFailure | undefined): NodeAddressHintModel | null => {
  if (!failure?.loopbackInContainer || !failure.address) return null
  let suggestion: string | null = null
  try {
    const url = new URL(failure.address)
    suggestion = `${url.protocol}//host.docker.internal:${url.port || (url.protocol === 'https:' ? '443' : '80')}`
  } catch { suggestion = null }
  return { firstTried: failure.address, suggestion }
}

/**
 * A refused change or a failed step, in words. `node` is the other node's name; `fromNode` names the node that looked
 * for an address, when it is not this window; `name` is the name a register or rename step wrote.
 */
export const failureText = (
  t: Translate, failure: NodeSettingsFailure, context: { node: string; fromNode?: string; name?: string },
): string => {
  const { node, fromNode } = context
  switch (failure.code) {
    case 'PEER_UNREACHABLE': {
      const first = failure.attempts?.[0]
      if (first?.result === 'different_node') return t(k('address.different'))
      if (first) return causeText(t, first.result, hostOf(first.address), fromNode)
      return causeText(t, failure.reason, hostOf(failure.address), fromNode)
    }
    case 'PEER_IDENTITY_MISMATCH': return t(k('address.different'))
    case 'PEER_NOT_AUTOBYTEUS': return t(k('cause.notAutobyteus'))
    case 'PEER_HOST_REFUSED': return t(k('cause.hostRefused'), { host: failure.host ?? hostName(hostOf(failure.address)) })
    case 'NODE_IDENTITY_NOT_MIGRATED': return t(k('cause.identityPending'))
    case 'PEER_IS_THIS_NODE': return t(k('cause.thisNode'))
    case 'REMOTE_COLLABORATION_OFF': return t(k('line.offThere'), { name: node })
    case 'PEER_NOT_REGISTERED': return t(k('line.notRegisteredThere'), { name: node })
    case 'PEER_NAME_INVALID': return t(k('rename.errorName'))
    case 'PEER_URL_INVALID': return t(k('add.errorAddress'))
    // autobyteus-437: pairing (an invite used or expired; the inviting node refused; a node paired already).
    case 'PEER_INVITE_INVALID': return t(k('error.inviteInvalid'))
    case 'PEER_ALREADY_REGISTERED': return t(k('error.alreadyPaired'), { node })
    case 'PEER_NAME_TAKEN': return t(k('error.nameTaken'), { node, name: context.name ?? '' })
    default: return t(k('error.other'), { node, message: failure.message })
  }
}
