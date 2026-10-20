import gql from 'graphql-tag'
import {
  PeerNodeFields,
  PublishedAgentFields,
  RemoteCollaborationCapabilityFields,
} from '~/graphql/queries/remoteCollaborationQueries'

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

export const PublishAgent = gql`
  mutation PublishAgent($input: PublishedAgentInput!) {
    publishAgent(input: $input) {
      ...PublishedAgentFields
    }
  }
  ${PublishedAgentFields}
`

export const UpdatePublishedAgent = gql`
  mutation UpdatePublishedAgent($input: PublishedAgentInput!) {
    updatePublishedAgent(input: $input) {
      ...PublishedAgentFields
    }
  }
  ${PublishedAgentFields}
`

export const UnpublishAgent = gql`
  mutation UnpublishAgent($agentDefinitionId: String!) {
    unpublishAgent(agentDefinitionId: $agentDefinitionId) {
      ...PublishedAgentFields
    }
  }
  ${PublishedAgentFields}
`
