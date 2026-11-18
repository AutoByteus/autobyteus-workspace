import gql from 'graphql-tag'

/** Turns Model Routing on or off; answers the new status. */
export const SetModelRoutingEnabled = gql`
  mutation SetModelRoutingEnabled($enabled: Boolean!) {
    setModelRoutingEnabled(enabled: $enabled)
  }
`

/** Sets the Model Router agent's launch configuration (runtime, model, model settings); answers the new status. */
export const SetModelRouterLaunch = gql`
  mutation SetModelRouterLaunch($runtimeKind: String!, $llmModelIdentifier: String!, $llmConfig: JSON) {
    setModelRouterLaunch(runtimeKind: $runtimeKind, llmModelIdentifier: $llmModelIdentifier, llmConfig: $llmConfig)
  }
`

/** "Talk to the router": the node's Model Router agent's run ID (created or restored). */
export const OpenModelRouterAgent = gql`
  mutation OpenModelRouterAgent {
    openModelRouterAgent
  }
`
