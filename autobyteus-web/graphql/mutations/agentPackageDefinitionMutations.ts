import { gql } from 'graphql-tag'

/** The Reload buttons on the Agents, Teams and Orgs pages: a full reload of every registered agent package. */
export const ReloadAgentPackageDefinitions = gql`
  mutation ReloadAgentPackageDefinitions {
    reloadAgentPackageDefinitions
  }
`
