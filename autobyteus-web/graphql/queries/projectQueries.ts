import gql from 'graphql-tag'

export const ProjectFields = gql`
  fragment ProjectFields on Project {
    projectId
    name
    description
    createdAt
    updatedAt
    workspaces {
      workspaceRootPath
      displayName
      description
      availability
    }
    taskCount
    openTaskCount
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
