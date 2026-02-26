import { gql } from 'graphql-tag'

export const ListApplications = gql`
  query listApplications {
    listApplications {
      __typename
      id
      name
      description
      icon
      type
      teamDefinitionName
    }
  }
`

// GetApplicationConfiguration has been removed.
