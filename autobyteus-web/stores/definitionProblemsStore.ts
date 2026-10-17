import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetDefinitionProblems } from '~/graphql/queries/definitionProblemsQueries'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { createLoadedListReloader } from '~/utils/agentPackages/loadedListReloader'
import type { DefinitionProblem, DefinitionKind } from '~/types/agentPackageDefinitions'

const KINDS: readonly DefinitionKind[] = ['AGENT', 'AGENT_TEAM', 'AGENT_ORG']

/**
 * Definition problems per kind, for the list notices on the Agents, Teams and Orgs pages.
 * A kind is loaded when its page first asks; change notifications reload loaded kinds with the
 * same in-flight sharing and follow-up as the list stores, so a change that arrives during a
 * load is never dropped.
 */
export const useDefinitionProblemsStore = defineStore('definitionProblems', () => {
  const problemsByKind = ref<Record<DefinitionKind, DefinitionProblem[]>>({ AGENT: [], AGENT_TEAM: [], AGENT_ORG: [] })

  const reloaders = Object.fromEntries(KINDS.map((kind) => [kind, createLoadedListReloader(
    `${kind} definition problems`,
    async () => {
      if (!(await useWindowNodeContextStore().waitForBoundBackendReady())) return
      const { data, errors } = await getApolloClient().query({
        query: GetDefinitionProblems,
        variables: { kind },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      problemsByKind.value = { ...problemsByKind.value, [kind]: data?.definitionProblems ?? [] }
    },
  )])) as Record<DefinitionKind, ReturnType<typeof createLoadedListReloader>>

  /** Loads a kind's problems once (pages call this on mount); later changes arrive through reloadIfLoaded. */
  const ensureLoaded = async (kind: DefinitionKind): Promise<void> => {
    const reloader = reloaders[kind]
    if (reloader.isLoaded()) return
    reloader.markLoaded()
    await reloader.reloadIfLoaded()
  }

  /** Reloads the given kinds (all when omitted) that a page has loaded. */
  const reloadIfLoaded = async (kinds: readonly DefinitionKind[] = KINDS): Promise<void> => {
    await Promise.all(kinds.map((kind) => reloaders[kind].reloadIfLoaded()))
  }

  return { problemsByKind, ensureLoaded, reloadIfLoaded }
})
