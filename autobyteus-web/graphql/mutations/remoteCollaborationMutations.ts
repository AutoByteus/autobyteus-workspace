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

export const RemovePeerNode = gql`
  mutation RemovePeerNode($nodeId: String!) {
    removePeerNode(nodeId: $nodeId)
  }
`
