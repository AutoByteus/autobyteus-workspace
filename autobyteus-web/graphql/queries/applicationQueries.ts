import { gql } from 'graphql-tag'

export const ApplicationFields = gql`
  fragment ApplicationFields on Application {
    __typename
    id
    localApplicationId
    packageId
    name
    description
    iconAssetPath
    entryHtmlAssetPath
    writable
    resourceSlots {
      slotKey
      required
    }
    bundleResources {
      kind
      localId
      definitionId
    }
  }
`

export const ListApplications = gql`
  query ListApplications {
    listApplications {
      ...ApplicationFields
    }
  }
  ${ApplicationFields}
`

export const GetApplicationById = gql`
  query GetApplicationById($id: String!) {
    application(id: $id) {
      ...ApplicationFields
    }
  }
  ${ApplicationFields}
`
