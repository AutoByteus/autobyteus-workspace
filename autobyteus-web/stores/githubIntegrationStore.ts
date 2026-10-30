import { defineStore } from 'pinia'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { GET_GITHUB_INTEGRATION } from '~/graphql/queries/githubIntegrationQueries'
import {
  CONNECT_GITHUB_INTEGRATION,
  DISCONNECT_GITHUB_INTEGRATION,
  SET_GITHUB_INTEGRATION_AGENT_ACCESS,
  TEST_GITHUB_INTEGRATION,
} from '~/graphql/mutations/githubIntegrationMutations'

/** GitHub's connection on the bound node. The server never returns the token. */
export interface GitHubIntegrationStatus {
  connected: boolean
  login: string | null
  connectedAt: string | null
  agentDefinitionIds: string[]
}

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> }

/** A failed GitHub integration request; `code` is the server's code (e.g. `TOKEN_REJECTED`) when there is one. */
export class GitHubIntegrationError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(message)
    this.name = 'GitHubIntegrationError'
  }
}

const toError = (cause: unknown): GitHubIntegrationError => {
  if (cause instanceof GitHubIntegrationError) return cause
  const first = (cause as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors?.[0]
  const code = typeof first?.extensions?.code === 'string' ? first.extensions.code : null
  return new GitHubIntegrationError(first?.message || (cause instanceof Error ? cause.message : String(cause)), code)
}

const throwGraphqlErrors = (errors: readonly GraphqlErrorLike[] | null | undefined): void => {
  const first = errors?.[0]
  if (!first) return
  const code = typeof first.extensions?.code === 'string' ? first.extensions.code : null
  throw new GitHubIntegrationError(first.message || 'GitHub integration request failed', code)
}

const notConnected = (): GitHubIntegrationStatus => ({ connected: false, login: null, connectedAt: null, agentDefinitionIds: [] })

export const useGitHubIntegrationStore = defineStore('githubIntegration', {
  state: () => ({
    status: notConnected() as GitHubIntegrationStatus,
    loaded: false,
    loading: false,
  }),

  actions: {
    async fetchStatus(): Promise<GitHubIntegrationStatus> {
      this.loading = true
      try {
        const { data, errors } = await getApolloClient().query<{ githubIntegration: GitHubIntegrationStatus }>({
          query: GET_GITHUB_INTEGRATION,
          fetchPolicy: 'network-only',
        })
        throwGraphqlErrors(errors)
        this.status = { ...data.githubIntegration, agentDefinitionIds: [...data.githubIntegration.agentDefinitionIds] }
        this.loaded = true
        return this.status
      } catch (cause) {
        throw toError(cause)
      } finally {
        this.loading = false
      }
    },

    /** Sends the token once; the server checks it with GitHub before storing it. */
    connect(token: string): Promise<GitHubIntegrationStatus> {
      return this.mutate('connectGitHubIntegration', CONNECT_GITHUB_INTEGRATION, { token })
    },

    test(): Promise<GitHubIntegrationStatus> {
      return this.mutate('testGitHubIntegration', TEST_GITHUB_INTEGRATION)
    },

    disconnect(): Promise<GitHubIntegrationStatus> {
      return this.mutate('disconnectGitHubIntegration', DISCONNECT_GITHUB_INTEGRATION)
    },

    setAgentAccess(agentDefinitionIds: string[]): Promise<GitHubIntegrationStatus> {
      return this.mutate('setGitHubIntegrationAgentAccess', SET_GITHUB_INTEGRATION_AGENT_ACCESS, { agentDefinitionIds })
    },

    async mutate(field: string, mutation: DocumentNode, variables: Record<string, unknown> = {}): Promise<GitHubIntegrationStatus> {
      try {
        const { data, errors } = await getApolloClient().mutate<Record<string, GitHubIntegrationStatus>>({ mutation, variables })
        throwGraphqlErrors(errors)
        const status = data?.[field]
        if (!status) throw new GitHubIntegrationError('GitHub integration request returned no status', null)
        this.status = { ...status, agentDefinitionIds: [...status.agentDefinitionIds] }
        this.loaded = true
        return this.status
      } catch (cause) {
        throw toError(cause)
      }
    },
  },
})
