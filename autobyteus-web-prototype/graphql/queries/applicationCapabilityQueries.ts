import gql from 'graphql-tag'

export const ApplicationsCapabilityFields = gql`
  fragment ApplicationsCapabilityFields on ApplicationsCapability {
    enabled
    scope
    settingKey
    source
  }
`

export const GetApplicationsCapability = gql`
  query GetApplicationsCapability {
    applicationsCapability {
      ...ApplicationsCapabilityFields
    }
  }
  ${ApplicationsCapabilityFields}
`
