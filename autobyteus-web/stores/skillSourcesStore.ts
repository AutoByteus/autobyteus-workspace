import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_SKILL_SOURCES,
  ADD_SKILL_SOURCE,
  REMOVE_SKILL_SOURCE,
} from '~/graphql/skillSources'
import { readSkillNameConflictError, toSkillNameConflict } from '~/utils/skills/skillNames'

export interface SkillSource {
  path: string
  skillCount: number
  isDefault: boolean
}

export const useSkillSourcesStore = defineStore('skillSources', () => {

  // State
  const skillSources = ref<SkillSource[]>([])
  const loading = ref(false)
  const error = ref('')

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
