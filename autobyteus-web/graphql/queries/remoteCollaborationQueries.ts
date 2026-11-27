import gql from 'graphql-tag'

export const PeerNodeFields = gql`
  fragment PeerNodeFields on PeerNodeGql {
    nodeId
    name
    address
    machine
    account
    relation
    sandbox
    addedAt
    paired
  }
`

export const GetRemoteCollaborationSettings = gql`
  query GetRemoteCollaborationSettings {
    peerNodes {
      ...PeerNodeFields
    }
  }
  ${PeerNodeFields}
`

/** One peer's offer now, answered by this node's server (autobyteus-267); the window never contacts the peer. */
export const GetPeerNodeOffer = gql`
  query GetPeerNodeOffer($nodeId: String!) {
    peerNodeOffer(nodeId: $nodeId) {
      entries {
        name
        kind
        description
      }
      refusalCode
      unreachableReason
    }
  }
`

/** one-nodes-tab DS-004: does the peer `nodeId` admit this node now? (Asked on the other node for "it → this node".) */
export const GetPeerNodeAvailability = gql`
  query GetPeerNodeAvailability($nodeId: String!) {
    peerNodeAvailability(nodeId: $nodeId) {
      available
      refusalCode
      unreachableReason
    }
  }
`
