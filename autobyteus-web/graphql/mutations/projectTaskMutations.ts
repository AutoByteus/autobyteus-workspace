import gql from 'graphql-tag'

import { ProjectTaskFields } from '~/graphql/queries/projectTaskQueries'

export const CreateProjectTask = gql`
  mutation CreateProjectTask($input: CreateProjectTaskInput!) {
    createProjectTask(input: $input) {
      ...ProjectTaskFields
    }
  }
  ${ProjectTaskFields}
`

export const UpdateProjectTask = gql`
  mutation UpdateProjectTask($input: UpdateProjectTaskInput!) {
    updateProjectTask(input: $input) {
      ...ProjectTaskFields
    }
  }
  ${ProjectTaskFields}
`

export const DeleteProjectTask = gql`
  mutation DeleteProjectTask($input: DeleteProjectTaskInput!) {
    deleteProjectTask(input: $input)
  }
`
