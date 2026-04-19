export type ApplicationHostTransport = {
  graphqlUrl: string
  restBaseUrl: string
  websocketUrl: string
  backendStatusUrl: string | null
  backendEnsureReadyUrl: string | null
  backendQueriesBaseUrl: string | null
  backendCommandsBaseUrl: string | null
  backendGraphqlUrl: string | null
  backendRoutesBaseUrl: string | null
  backendNotificationsUrl: string | null
}
