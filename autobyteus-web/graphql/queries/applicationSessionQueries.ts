import { gql } from 'graphql-tag'

export const ApplicationProducerFields = gql`
  fragment ApplicationProducerFields on ApplicationProducerProvenanceGraph {
    memberRouteKey
    displayName
    teamPath
    runId
    runtimeKind
  }
`

export const ApplicationDeliveryStateFields = gql`
  fragment ApplicationDeliveryStateFields on ApplicationDeliveryStateProjectionGraph {
    publicationKey
    deliveryState
    title
    summary
    artifactType
    artifactRef
    updatedAt
    producer {
      ...ApplicationProducerFields
    }
  }
  ${ApplicationProducerFields}
`

export const ApplicationMemberFields = gql`
  fragment ApplicationMemberFields on ApplicationMemberProjectionGraph {
    memberRouteKey
    displayName
    teamPath
    runtimeTarget {
      runId
      runtimeKind
    }
    artifactsByKey
    primaryArtifactKey
    progressByKey
    primaryProgressKey
  }
`

export const ApplicationSessionFields = gql`
  fragment ApplicationSessionFields on ApplicationSessionGraph {
    applicationSessionId
    application {
      applicationId
      localApplicationId
      packageId
      name
      description
      iconAssetPath
      entryHtmlAssetPath
      writable
    }
    runtime {
      kind
      runId
      definitionId
    }
    view {
      delivery {
        current {
          ...ApplicationDeliveryStateFields
        }
      }
      members {
        ...ApplicationMemberFields
      }
    }
    createdAt
    terminatedAt
  }
  ${ApplicationDeliveryStateFields}
  ${ApplicationMemberFields}
`

export const ApplicationSessionBindingFields = gql`
  fragment ApplicationSessionBindingFields on ApplicationSessionBindingGraph {
    applicationId
    requestedSessionId
    resolvedSessionId
    resolution
    session {
      ...ApplicationSessionFields
    }
  }
  ${ApplicationSessionFields}
`

export const GetApplicationSession = gql`
  query GetApplicationSession($id: String!) {
    applicationSession(id: $id) {
      ...ApplicationSessionFields
    }
  }
  ${ApplicationSessionFields}
`

export const GetApplicationSessionBinding = gql`
  query GetApplicationSessionBinding($applicationId: String!, $requestedSessionId: String) {
    applicationSessionBinding(applicationId: $applicationId, requestedSessionId: $requestedSessionId) {
      ...ApplicationSessionBindingFields
    }
  }
  ${ApplicationSessionBindingFields}
`
