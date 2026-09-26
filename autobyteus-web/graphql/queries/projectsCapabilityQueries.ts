import gql from 'graphql-tag'

export const ProjectsCapabilityFields = gql`
  fragment ProjectsCapabilityFields on ProjectsCapability {
    enabled
    settingKey
    source
  }
`

export const GetProjectsCapability = gql`
  query GetProjectsCapability {
    projectsCapability {
      ...ProjectsCapabilityFields
    }
  }
  ${ProjectsCapabilityFields}
`
