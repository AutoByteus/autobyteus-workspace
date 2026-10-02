import gql from 'graphql-tag'

export const ProjectTaskFields = gql`
  fragment ProjectTaskFields on ProjectTask {
    taskId
    projectId
    description
    status
    createdAt
    contextFiles { storedFilename displayName mimeType sizeBytes locator }
    updatedAt
  }
`

export const GetProjectTasks = gql`
  query GetProjectTasks($projectId: String!) {
    projectTasks(projectId: $projectId) {
      ...ProjectTaskFields
    }
  }
  ${ProjectTaskFields}
`
