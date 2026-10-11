import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetDefinitionDiagnostics } from '~/graphql/queries/definitionDiagnosticsQueries'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { DefinitionDiagnostic, DefinitionDiagnosticSubject } from '~/types/definitionCatalog'

const SUBJECTS: readonly DefinitionDiagnosticSubject[] = ['AGENT', 'AGENT_TEAM', 'AGENT_ORG']

/**
 * Definition diagnostics per subject, for the list notices on the Agents, Teams and Orgs pages.
 * A subject is loaded when its page first asks; the catalog change feed reloads loaded subjects.
 */
export const useDefinitionDiagnosticsStore = defineStore('definitionDiagnostics', () => {
  const diagnosticsBySubject = ref<Record<DefinitionDiagnosticSubject, DefinitionDiagnostic[]>>({ AGENT: [], AGENT_TEAM: [], AGENT_ORG: [] })
  const loadedSubjects = ref<Set<DefinitionDiagnosticSubject>>(new Set())
  const inFlight = new Map<DefinitionDiagnosticSubject, Promise<void>>()

  const load = (subject: DefinitionDiagnosticSubject): Promise<void> => {
    const running = inFlight.get(subject)
    if (running) return running
    const run = (async () => {
      try {
        if (!(await useWindowNodeContextStore().waitForBoundBackendReady())) return
        const { data, errors } = await getApolloClient().query({
          query: GetDefinitionDiagnostics,
          variables: { subject },
          fetchPolicy: 'network-only',
        })
        if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        diagnosticsBySubject.value = { ...diagnosticsBySubject.value, [subject]: data?.definitionDiagnostics ?? [] }
        loadedSubjects.value = new Set([...loadedSubjects.value, subject])
      } catch (cause) {
        // Diagnostics are advisory: keep the previous notice when a reload fails.
        console.error(`Failed to load ${subject} definition diagnostics:`, cause)
      } finally {
        inFlight.delete(subject)
      }
    })()
    inFlight.set(subject, run)
    return run
  }

  /** Loads a subject's diagnostics once (pages call this on mount). */
  const ensureLoaded = async (subject: DefinitionDiagnosticSubject): Promise<void> => {
    if (!loadedSubjects.value.has(subject)) await load(subject)
  }

  /** Reloads the given subjects (all when omitted) that a page has loaded. */
  const reloadIfLoaded = async (subjects: readonly DefinitionDiagnosticSubject[] = SUBJECTS): Promise<void> => {
    await Promise.all(subjects.filter((subject) => loadedSubjects.value.has(subject)).map((subject) => load(subject)))
  }

  return { diagnosticsBySubject, ensureLoaded, reloadIfLoaded }
})
