import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  IMPORT_GITHUB_SKILL_SOURCE, CHECK_GITHUB_SKILL_SOURCES, UPDATE_GITHUB_SKILL_SOURCE, REMOVE_GITHUB_SKILL_SOURCE,
  GET_SKILL_SOURCES,
  ADD_SKILL_SOURCE,
  REMOVE_SKILL_SOURCE,
} from '~/graphql/skillSources'
import { readSkillNameConflictError, toSkillNameConflict } from '~/utils/skills/skillNames'

export interface SkillSource {
  sourceId: string
  sourceKind: 'DEFAULT' | 'LOCAL_PATH' | 'GITHUB_REPOSITORY'
  github: null | {
    repositoryUrl: string
    defaultBranch: string
    installedRevision: string
    latestRevision: string | null
    latestCheckedAt: string | null
    status: 'NOT_CHECKED' | 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'CHECK_FAILED' | 'UPDATE_FAILED' | 'REMOVING'
    lastError: string | null
  }
  path: string
  skillCount: number
  isDefault: boolean
}

export const useSkillSourcesStore = defineStore('skillSources', () => {

  // State
  const skillSources = ref<SkillSource[]>([])
  const loading = ref(false)
  const error = ref('')
  const registryError = ref('')
  const warnings = ref<string[]>([])
  const pending = ref<Record<string, string>>({})

  // Actions
  async function fetchSkillSources(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILL_SOURCES,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      registryError.value = data?.skillSourceRegistryError ?? ''
      if (data?.skillSources) {
        skillSources.value = data.skillSources
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function addSkillSource(path: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: ADD_SKILL_SOURCE,
        variables: { path },
      })

      if (errors && errors.length > 0) {
        throw readSkillNameConflictError(errors) ?? new Error(errors.map((e: { message: string }) => e.message).join(', '))
      }

      if (data?.addSkillSource) {
        skillSources.value = data.addSkillSource
      }
    } catch (e: any) {
      // A duplicate name is shown by the conflict dialog, not as a store error (D-19).
      const conflict = toSkillNameConflict(e)
      if (conflict) throw conflict
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function removeSkillSource(path: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: REMOVE_SKILL_SOURCE,
        variables: { path },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.removeSkillSource) {
        skillSources.value = data.removeSkillSource
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function githubOperation(
    action: 'import' | 'check' | 'update' | 'remove', sourceId?: string, repositoryUrl?: string,
  ): Promise<void> {
    const key = sourceId ?? action
    if (pending.value[key]) return
    pending.value[key] = action
    error.value = ''
    warnings.value = []
    const operations = {
      import: [IMPORT_GITHUB_SKILL_SOURCE, 'importGitHubSkillSource'],
      check: [CHECK_GITHUB_SKILL_SOURCES, 'checkGitHubSkillSourceUpdates'],
      update: [UPDATE_GITHUB_SKILL_SOURCE, 'updateGitHubSkillSource'],
      remove: [REMOVE_GITHUB_SKILL_SOURCE, 'removeGitHubSkillSource'],
    } as const
    const [mutation, field] = operations[action]
    try {
      const { data, errors } = await getApolloClient().mutate({
        mutation, variables: action === 'import' ? { repositoryUrl }
          : action === 'check' ? { sourceIds: sourceId ? [sourceId] : undefined } : { sourceId },
      })
      if (errors?.length) throw readSkillNameConflictError(errors) ?? new Error(errors.map(e => e.message).join(', '))
      if (!data?.[field]) throw new Error('No skill source result returned.')
      skillSources.value = data[field].sources
      warnings.value = data[field].warnings
    } catch (cause: any) {
      // Re-read committed removal/update state even on failure; never retry a mutation automatically.
      try {
        const { data } = await getApolloClient().query({ query: GET_SKILL_SOURCES, fetchPolicy: 'network-only' })
        if (data?.skillSources) skillSources.value = data.skillSources
        registryError.value = data?.skillSourceRegistryError ?? ''
      } catch { /* retain last usable snapshot */ }
      const conflict = toSkillNameConflict(cause)
      if (conflict) throw conflict
      error.value = cause.message
      throw cause
    } finally { delete pending.value[key] }
  }

  async function checkGitHubSources(): Promise<void> {
    const ids = skillSources.value.filter(source => source.github && source.github.status !== 'REMOVING').map(source => source.sourceId)
    if (!ids.length) return
    for (const id of ids) pending.value[id] = 'check'
    try { await githubOperation('check') }
    finally { for (const id of ids) delete pending.value[id] }
  }

  function replaceSkillSources(nextSources: SkillSource[]) {
    skillSources.value = nextSources
  }

  function clearError() {
    error.value = ''
  }

  // Getters
  const getSkillSources = computed(() => skillSources.value)
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    registryError, warnings, pending, githubOperation, checkGitHubSources,
    // State
    skillSources,
    loading,
    error,
    // Actions
    fetchSkillSources,
    addSkillSource,
    removeSkillSource,
    replaceSkillSources,
    clearError,
    // Getters
    getSkillSources,
    getLoading,
    getError,
  }
})
