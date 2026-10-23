import gql from 'graphql-tag'

export const RemoteCollaborationCapabilityFields = gql`
  fragment RemoteCollaborationCapabilityFields on RemoteCollaborationCapabilityGql {
    enabled
    settingKey
    source
  }
`

export const PeerNodeFields = gql`
  fragment PeerNodeFields on PeerNodeGql {
    nodeId
    name
    baseUrl
    addedAt
  }
`

export const GetRemoteCollaborationCapability = gql`
  query GetRemoteCollaborationCapability {
    remoteCollaborationCapability {
      ...RemoteCollaborationCapabilityFields
    }
  }
  ${RemoteCollaborationCapabilityFields}
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
    }
  }
`
