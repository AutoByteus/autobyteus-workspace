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
      }
      ... on AgentTeamRootHistoryObject {
        root_subject_kind
        root_run_id
      }
    }
  }
`
