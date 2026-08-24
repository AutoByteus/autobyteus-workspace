import gql from 'graphql-tag'

import { ApplicationsCapabilityFields } from '~/graphql/queries/applicationCapabilityQueries'

export const SetApplicationsEnabled = gql`
  mutation SetApplicationsEnabled($enabled: Boolean!) {
    setApplicationsEnabled(enabled: $enabled) {
      ...ApplicationsCapabilityFields
    }
  }
  ${ApplicationsCapabilityFields}
`
