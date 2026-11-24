import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { CONNECT_GITHUB, DISCONNECT_GITHUB, GET_GITHUB_CONNECTION } from '~/graphql/githubConnection'

/** This node's GitHub connection as the server reports it. Never carries the token. */
export interface GitHubConnection {
  connected: boolean
  login: string | null
}

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> }

/** The server's codes (`IntegrationConnectionError`, `TOKEN_REQUIRED`) and their texts. */
const ERROR_KEYS: Readonly<Record<string, string>> = {
  TOKEN_REQUIRED: 'github.connection.errorTokenRequired',
  TOKEN_REJECTED: 'github.connection.errorTokenRejected',
  TOKEN_CHECK_FAILED: 'github.connection.errorTokenCheckFailed',
  VAULT_UNAVAILABLE: 'github.connection.errorVaultUnavailable',
}

const codeOf = (cause: unknown): string => {
  const graphqlError = (cause as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors?.[0]
    ?? (cause as { errors?: GraphqlErrorLike[] } | null)?.errors?.[0]
  const code = graphqlError?.extensions?.code
  return typeof code === 'string' ? code : ''
}

/** The text for a failed action: the coded server error's own text, else the action's general failure. Never the token. */
const errorText = (cause: unknown, fallbackKey: string): string =>
  localizationRuntime.translate(ERROR_KEYS[codeOf(cause)] ?? fallbackKey)

/**
 * The GitHub connection line's state (the import areas of Agent Packages and Skill sources): this node's one GitHub
 * connection, the same one the GitHub integration uses. Load reads it; Connect sends a token once; Disconnect removes it.
 */
export const useGitHubConnectionStore = defineStore('githubConnection', () => {
  const connected = ref(false)
  const login = ref<string | null>(null)
  const loaded = ref(false)
  const busy = ref<'connect' | 'disconnect' | null>(null)
  const error = ref<string | null>(null)

  const apply = (connection: GitHubConnection) => {
    connected.value = connection.connected
    login.value = connection.login
    loaded.value = true
  }

  async function load(): Promise<void> {
    try {
      const { data, errors } = await getApolloClient().query<{ githubConnection: GitHubConnection }>({
        query: GET_GITHUB_CONNECTION, fetchPolicy: 'network-only',
      })
      if (errors?.length) throw { errors }
      apply(data.githubConnection)
      error.value = null
    } catch (cause) {
      error.value = errorText(cause, 'github.connection.loadFailed')
    }
  }

  async function run(kind: 'connect' | 'disconnect', action: () => Promise<GitHubConnection>, fallbackKey: string): Promise<boolean> {
    if (busy.value) return false
    busy.value = kind
    error.value = null
    try {
      apply(await action())
      return true
    } catch (cause) {
      error.value = errorText(cause, fallbackKey)
      return false
    } finally {
      busy.value = null
    }
  }

  /** Resolves with whether the token was checked and saved. */
  const connect = (token: string) => run('connect', async () => {
    const { data, errors } = await getApolloClient().mutate<{ connectGitHub: GitHubConnection }>({
      mutation: CONNECT_GITHUB, variables: { token },
    })
    if (errors?.length || !data) throw { errors }
    return data.connectGitHub
  }, 'github.connection.connectFailed')

  const disconnect = () => run('disconnect', async () => {
    const { data, errors } = await getApolloClient().mutate<{ disconnectGitHub: GitHubConnection }>({ mutation: DISCONNECT_GITHUB })
    if (errors?.length || !data) throw { errors }
    return data.disconnectGitHub
  }, 'github.connection.disconnectFailed')

  return { connected, login, loaded, busy, error, load, connect, disconnect }
})
