import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetDefinitionDiagnostics } from '~/graphql/queries/definitionDiagnosticsQueries'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { createLoadedListReloader } from '~/utils/definitionCatalog/loadedListReloader'
import type { DefinitionDiagnostic, DefinitionDiagnosticSubject } from '~/types/definitionCatalog'

const SUBJECTS: readonly DefinitionDiagnosticSubject[] = ['AGENT', 'AGENT_TEAM', 'AGENT_ORG']

/**
 * Definition diagnostics per subject, for the list notices on the Agents, Teams and Orgs pages.
 * A subject is loaded when its page first asks; catalog change notifications reload loaded
 * subjects with the same in-flight sharing and follow-up as the list stores, so a change that
 * arrives during a load is never dropped.
 */
export const useDefinitionDiagnosticsStore = defineStore('definitionDiagnostics', () => {
  const diagnosticsBySubject = ref<Record<DefinitionDiagnosticSubject, DefinitionDiagnostic[]>>({ AGENT: [], AGENT_TEAM: [], AGENT_ORG: [] })

  const reloaders = Object.fromEntries(SUBJECTS.map((subject) => [subject, createLoadedListReloader(
    `${subject} definition diagnostics`,
    async () => {
      if (!(await useWindowNodeContextStore().waitForBoundBackendReady())) return
      const { data, errors } = await getApolloClient().query({
        query: GetDefinitionDiagnostics,
        variables: { subject },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      diagnosticsBySubject.value = { ...diagnosticsBySubject.value, [subject]: data?.definitionDiagnostics ?? [] }
    },
  )])) as Record<DefinitionDiagnosticSubject, ReturnType<typeof createLoadedListReloader>>

  /** Loads a subject's diagnostics once (pages call this on mount); later changes arrive through reloadIfLoaded. */
  const ensureLoaded = async (subject: DefinitionDiagnosticSubject): Promise<void> => {
    const reloader = reloaders[subject]
    if (reloader.isLoaded()) return
    reloader.markLoaded()
    await reloader.reloadIfLoaded()
  }

  /** Reloads the given subjects (all when omitted) that a page has loaded. */
  const reloadIfLoaded = async (subjects: readonly DefinitionDiagnosticSubject[] = SUBJECTS): Promise<void> => {
    await Promise.all(subjects.map((subject) => reloaders[subject].reloadIfLoaded()))
  }

  return { diagnosticsBySubject, ensureLoaded, reloadIfLoaded }
})
