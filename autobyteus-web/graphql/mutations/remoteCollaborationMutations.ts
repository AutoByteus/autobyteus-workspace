import gql from 'graphql-tag'
import { PeerNodeFields, RemoteCollaborationCapabilityFields } from '~/graphql/queries/remoteCollaborationQueries'

export const SetRemoteCollaborationEnabled = gql`
  mutation SetRemoteCollaborationEnabled($enabled: Boolean!) {
    setRemoteCollaborationEnabled(enabled: $enabled) {
      ...RemoteCollaborationCapabilityFields
    }
  }
  ${RemoteCollaborationCapabilityFields}
`

/** autobyteus-437: on node A, an invite for one other node (10 minutes, single use). */
export const CreatePeerInvite = gql`
  mutation CreatePeerInvite {
    createPeerInvite {
      inviteText
      expiresAt
    }
  }
`

/** autobyteus-437: on node B, pairs with the node that created the invite; both then hold the peer secret. */
export const AcceptPeerInvite = gql`
  mutation AcceptPeerInvite($inviteText: String!, $name: String!, $nameOnInviter: String) {
    acceptPeerInvite(inviteText: $inviteText, name: $name, nameOnInviter: $nameOnInviter) {
      ...PeerNodeFields
    }
  }
  ${PeerNodeFields}
`

export const RenamePeerNode = gql`
  mutation RenamePeerNode($nodeId: String!, $name: String!) {
    renamePeerNode(nodeId: $nodeId, name: $name) {
      ...PeerNodeFields
    }
  }
  ${PeerNodeFields}
`

/** one-nodes-tab TR-711: the address this node uses for a peer; the pinned node must answer there. */
export const ChangePeerAddress = gql`
  mutation ChangePeerAddress($nodeId: String!, $baseUrl: String!) {
    changePeerAddress(nodeId: $nodeId, baseUrl: $baseUrl) {
      ...PeerNodeFields
    }
  }
  ${PeerNodeFields}
`

export const RemovePeerNode = gql`
  mutation RemovePeerNode($nodeId: String!) {
    removePeerNode(nodeId: $nodeId)
  }
`
