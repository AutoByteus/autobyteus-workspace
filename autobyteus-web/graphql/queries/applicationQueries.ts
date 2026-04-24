import { gql } from 'graphql-tag'

export const ApplicationCatalogFields = gql`
  fragment ApplicationCatalogFields on Application {
    __typename
    id
    name
    description
    iconAssetPath
    entryHtmlAssetPath
    resourceSlots {
      slotKey
      required
    }
  }
`

export const ApplicationTechnicalDetailsFields = gql`
  fragment ApplicationTechnicalDetailsFields on Application {
    __typename
    localApplicationId
    packageId
    writable
    bundleResources {
      kind
      localId
      definitionId
    }
  }
`

export const ApplicationDetailFields = gql`
  fragment ApplicationDetailFields on Application {
    ...ApplicationCatalogFields
    ...ApplicationTechnicalDetailsFields
  }
  ${ApplicationCatalogFields}
  ${ApplicationTechnicalDetailsFields}
`

export const ListApplications = gql`
  query ListApplications {
    listApplications {
      ...ApplicationCatalogFields
    }
  }
  ${ApplicationCatalogFields}
`

export const GetApplicationById = gql`
  query GetApplicationById($id: String!) {
    application(id: $id) {
      ...ApplicationDetailFields
    }
  }
  ${ApplicationDetailFields}
`
