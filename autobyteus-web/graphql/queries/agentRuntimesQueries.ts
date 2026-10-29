import gql from 'graphql-tag'

/**
 * The node's four agent runtimes as the server holds them now, and whether their own logins can open a browser on the
 * node's desktop. Read-only: it never starts a check.
 */
export const AgentRuntimes = gql`
  query AgentRuntimes {
    agentRuntimes {
      runtimeKind
      installed
      installedVersion
      updates { state latestVersion }
      account { state }
      signInRoute
      installInstructionsUrl
      runningAgentCount
      operation { kind state command step fromVersion toVersion error }
      checkedAt
    }
    agentRuntimeSignInBrowserAvailable
  }
`
