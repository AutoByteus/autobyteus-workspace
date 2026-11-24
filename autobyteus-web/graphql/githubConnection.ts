import gql from 'graphql-tag'

/** This node's GitHub connection (its GitHub token in the vault), for the import areas. Never carries the token. */
export const GET_GITHUB_CONNECTION = gql`
  query GetGitHubConnection {
    githubConnection { connected login }
  }
`

/** Sends the token once; the server checks it with GitHub before saving it in this node's vault. */
export const CONNECT_GITHUB = gql`
  mutation ConnectGitHub($token: String!) {
    connectGitHub(token: $token) { connected login }
  }
`

export const DISCONNECT_GITHUB = gql`
  mutation DisconnectGitHub {
    disconnectGitHub { connected login }
  }
`
