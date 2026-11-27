import gql from 'graphql-tag'
import { PeerNodeFields } from '~/graphql/queries/remoteCollaborationQueries'

/** autobyteus-661 contract §3: on node B, a one-time grant for one pair from a node the same app controls. */
export const CreatePairingGrant = gql`
  mutation CreatePairingGrant($relation: String!, $forMachine: String, $nameForAsker: String) {
    createPairingGrant(relation: $relation, forMachine: $forMachine, nameForAsker: $nameForAsker) {
      grant
      expiresAt
    }
  }
`

/** autobyteus-661 contract §3: on node A, Pair with the node at `address` (with B's grant: at once). */
export const PairWithNode = gql`
  mutation PairWithNode($address: String!, $grant: String, $nodeId: String, $name: String) {
    pairWithNode(address: $address, grant: $grant, nodeId: $nodeId, name: $name) {
      state
      requestId
      peer {
        ...PeerNodeFields
      }
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
  mutation ChangePeerAddress($nodeId: String!, $address: String!) {
    changePeerAddress(nodeId: $nodeId, address: $address) {
      ...PeerNodeFields
    }
  }
  ${PeerNodeFields}
`

/** autobyteus-661 contract §2: Unpair; the other node is told when it can be reached. */
export const UnpairPeerNode = gql`
  mutation UnpairPeerNode($nodeId: String!) {
    unpairPeerNode(nodeId: $nodeId)
  }
`
