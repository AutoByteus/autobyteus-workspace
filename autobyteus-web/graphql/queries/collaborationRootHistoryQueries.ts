import { gql } from 'graphql-tag'

export const ListCollaborationRootHistory = gql`
  query ListCollaborationRootHistory {
    listCollaborationRootHistory {
      __typename
      ... on AgentOrgRootHistoryObject {
        root_subject_kind
        root_run_id
        created_at
        archived_at
        is_active
        summary
        org
        closed_task_executions
      }
      ... on AgentTeamRootHistoryObject {
        root_subject_kind
        root_run_id
      }
    }
  }
`

export const GetAgentOrgRootHistory = gql`
  query GetAgentOrgRootHistory($orgRunId: String!) {
    getAgentOrgRootHistory(orgRunId: $orgRunId) {
      root_subject_kind root_run_id created_at archived_at is_active summary org closed_task_executions
    }
  }
`
