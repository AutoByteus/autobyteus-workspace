import gql from 'graphql-tag'

/** Checks every runtime that is not checking or busy; answers once installed versions are known. */
export const CheckAgentRuntimes = gql`
  mutation CheckAgentRuntimes {
    checkAgentRuntimes
  }
`

/** Runs the runtime's own update command; refused while its agents run. */
export const UpdateAgentRuntime = gql`
  mutation UpdateAgentRuntime($runtimeKind: String!) {
    updateAgentRuntime(runtimeKind: $runtimeKind)
  }
`

/** Starts the runtime's own browser sign-in (Codex, Grok). */
export const StartAgentRuntimeSignIn = gql`
  mutation StartAgentRuntimeSignIn($runtimeKind: String!) {
    startAgentRuntimeSignIn(runtimeKind: $runtimeKind)
  }
`

/** Stops a running sign-in. */
export const CancelAgentRuntimeSignIn = gql`
  mutation CancelAgentRuntimeSignIn($runtimeKind: String!) {
    cancelAgentRuntimeSignIn(runtimeKind: $runtimeKind)
  }
`
