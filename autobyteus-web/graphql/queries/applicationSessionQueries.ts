import { gql } from 'graphql-tag'

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
      members {
        ...ApplicationMemberFields
      }
    }
    createdAt
    terminatedAt
  }
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
