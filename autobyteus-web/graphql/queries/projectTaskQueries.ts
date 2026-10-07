import gql from 'graphql-tag'

export const TaskRootFields = gql`
  fragment TaskRootFields on TaskRoot {
    kind
    recipientAddress
    ingressAgentRunId
    teamRunId
    hostRoot { kind runId }
    start
    startError { code message }
    closed
    status
  }
`

export const ProjectTaskFields = gql`
  fragment ProjectTaskFields on ProjectTask {
    taskId
    projectId
    description
    status
    createdAt
    contextFiles { storedFilename displayName mimeType sizeBytes locator }
    updatedAt
    root { ...TaskRootFields }
  }
  ${TaskRootFields}
`

export const GetProjectTasks = gql`
  query GetProjectTasks($projectId: String!) {
    projectTasks(projectId: $projectId) {
      ...ProjectTaskFields
    }
  }
  ${ProjectTaskFields}
`

export const GetTasksWithoutProject = gql`
  query GetTasksWithoutProject {
    tasksWithoutProject {
      taskId
      description
      status
      referenceFiles
      createdAt
      updatedAt
      root { ...TaskRootFields }
    }
  }
  ${TaskRootFields}
`
