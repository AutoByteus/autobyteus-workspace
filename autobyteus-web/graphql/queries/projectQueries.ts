import gql from 'graphql-tag'

export const ProjectFields = gql`
  fragment ProjectFields on Project {
    projectId
    name
    description
    createdAt
    updatedAt
    workspaces {
      workspaceId
      workspaceRootPath
      displayName
      description
      addedAt
      availability
    }
  }
`

export const GetProjects = gql`
  query GetProjects {
    projects {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`

export const GetProject = gql`
  query GetProject($projectId: String!) {
    project(projectId: $projectId) {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`
