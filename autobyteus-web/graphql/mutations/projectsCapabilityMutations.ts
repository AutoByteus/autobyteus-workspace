import gql from 'graphql-tag'

import { ProjectsCapabilityFields } from '~/graphql/queries/projectsCapabilityQueries'

export const SetProjectsEnabled = gql`
  mutation SetProjectsEnabled($enabled: Boolean!) {
    setProjectsEnabled(enabled: $enabled) {
      ...ProjectsCapabilityFields
    }
  }
  ${ProjectsCapabilityFields}
`
