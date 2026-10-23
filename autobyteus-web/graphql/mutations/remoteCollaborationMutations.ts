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

export const AddPeerNode = gql`
  mutation AddPeerNode($input: AddPeerNodeInput!) {
    addPeerNode(input: $input) {
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
