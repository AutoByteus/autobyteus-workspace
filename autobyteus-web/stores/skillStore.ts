import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_SKILLS,
  GET_SKILL,
  GET_SKILL_FILE_TREE,
  GET_SKILL_FILE_CONTENT,
  CREATE_SKILL,
  UPDATE_SKILL,
  DELETE_SKILL,
  UPLOAD_SKILL_FILE,
  DELETE_SKILL_FILE,
  DISABLE_SKILL,
  ENABLE_SKILL,
  GET_SKILL_VERSIONS,
  GET_SKILL_VERSION_DIFF,
  ENABLE_SKILL_VERSIONING,
  ACTIVATE_SKILL_VERSION,
} from '~/graphql/skills'
import type {
  Skill,
  CreateSkillInput,
  UpdateSkillInput,
  DeleteSkillResult,
  SkillVersion,
  SkillDiff,
} from '~/types/skill'

export const useSkillStore = defineStore('skill', () => {

  // State
  const skills = ref<Skill[]>([])
  const currentSkill = ref<Skill | null>(null)
  const currentSkillTree = ref<string | null>(null)
  const loading = ref(false)
  const error = ref('')

  function updateSkillVersionMetadata(skillName: string, updates: Partial<Skill>) {
    const index = skills.value.findIndex((s) => s.name === skillName)
    if (index !== -1) {
      const newSkills = [...skills.value]
      newSkills[index] = { ...newSkills[index], ...updates }
      skills.value = newSkills
    }
    if (currentSkill.value?.name === skillName) {
      currentSkill.value = { ...currentSkill.value, ...updates }
    }
  }

  // Actions
  async function fetchAllSkills(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILLS,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.skills) {
        skills.value = data.skills
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSkill(name: string): Promise<Skill | null> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILL,
        variables: { name },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.skill) {
        currentSkill.value = data.skill
        return data.skill
      }
      return null
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSkillFileTree(name: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILL_FILE_TREE,
        variables: { name },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.skillFileTree) {
        currentSkillTree.value = data.skillFileTree
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function readFileContent(skillName: string, path: string): Promise<string | null> {
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILL_FILE_CONTENT,
        variables: { skillName, path },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      return data?.skillFileContent ?? null
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function createSkill(input: CreateSkillInput): Promise<Skill> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: CREATE_SKILL,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.createSkill) {
        skills.value = [...skills.value, data.createSkill]
        return data.createSkill
      }
      throw new Error('Failed to create skill: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateSkill(input: UpdateSkillInput): Promise<Skill> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: UPDATE_SKILL,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.updateSkill) {
        const updatedSkill = data.updateSkill
        const index = skills.value.findIndex((s) => s.name === updatedSkill.name)
        if (index !== -1) {
          const newSkills = [...skills.value]
          newSkills[index] = updatedSkill
          skills.value = newSkills
        }
        if (currentSkill.value?.name === updatedSkill.name) {
          currentSkill.value = updatedSkill
        }
        return updatedSkill
      }
      throw new Error('Failed to update skill: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteSkill(name: string): Promise<DeleteSkillResult> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DELETE_SKILL,
        variables: { name },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.deleteSkill) {
        if (data.deleteSkill.success) {
          skills.value = skills.value.filter((s) => s.name !== name)
          if (currentSkill.value?.name === name) {
            currentSkill.value = null
          }
        }
        return data.deleteSkill
      }
      throw new Error('Failed to delete skill: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function uploadFile(
    skillName: string,
    path: string,
    content: string
  ): Promise<boolean> {
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: UPLOAD_SKILL_FILE,
        variables: { skillName, path, content },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      return data?.uploadSkillFile ?? false
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function deleteFile(skillName: string, path: string): Promise<boolean> {
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DELETE_SKILL_FILE,
        variables: { skillName, path },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      return data?.deleteSkillFile ?? false
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }


  async function disableSkill(name: string): Promise<Skill> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DISABLE_SKILL,
        variables: { name },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.disableSkill) {
        const updatedSkill = data.disableSkill
        const index = skills.value.findIndex((s) => s.name === updatedSkill.name)
        if (index !== -1) {
          const newSkills = [...skills.value]
          newSkills[index] = updatedSkill
          skills.value = newSkills
        }
        if (currentSkill.value?.name === updatedSkill.name) {
          currentSkill.value = updatedSkill
        }
        return updatedSkill
      }
      throw new Error('Failed to disable skill: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function enableSkill(name: string): Promise<Skill> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: ENABLE_SKILL,
        variables: { name },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.enableSkill) {
        const updatedSkill = data.enableSkill
        const index = skills.value.findIndex((s) => s.name === updatedSkill.name)
        if (index !== -1) {
          const newSkills = [...skills.value]
          newSkills[index] = updatedSkill
          skills.value = newSkills
        }
        if (currentSkill.value?.name === updatedSkill.name) {
          currentSkill.value = updatedSkill
        }
        return updatedSkill
      }
      throw new Error('Failed to enable skill: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSkillVersions(skillName: string): Promise<SkillVersion[]> {
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILL_VERSIONS,
        variables: { skillName },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      return data?.skillVersions ?? []
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function fetchSkillVersionDiff(
    skillName: string,
    fromVersion: string,
    toVersion: string
  ): Promise<SkillDiff | null> {
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_SKILL_VERSION_DIFF,
        variables: { skillName, fromVersion, toVersion },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      return data?.skillVersionDiff ?? null
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function enableSkillVersioning(skillName: string): Promise<SkillVersion> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: ENABLE_SKILL_VERSIONING,
        variables: { input: { skillName } },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.enableSkillVersioning) {
        const version = data.enableSkillVersioning
        updateSkillVersionMetadata(skillName, {
          isVersioned: true,
          activeVersion: version.tag,
        })
        return version
      }

      throw new Error('Failed to enable skill versioning: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function activateSkillVersion(
    skillName: string,
    version: string
  ): Promise<SkillVersion> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: ACTIVATE_SKILL_VERSION,
        variables: { input: { skillName, version } },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '))
      }

      if (data?.activateSkillVersion) {
        const activatedVersion = data.activateSkillVersion
        updateSkillVersionMetadata(skillName, {
          isVersioned: true,
          activeVersion: activatedVersion.tag,
        })
        return activatedVersion
      }

      throw new Error('Failed to activate skill version: No data returned')
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  function setCurrentSkill(skill: Skill | null) {
    currentSkill.value = skill
  }

  function clearError() {
    error.value = ''
  }

  // Getters
  const getSkills = computed(() => skills.value)
  const getCurrentSkill = computed(() => currentSkill.value)
  const getCurrentSkillTree = computed(() => currentSkillTree.value)
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    // State
    skills,
    currentSkill,
    currentSkillTree,
    loading,
    error,
    // Actions
    fetchAllSkills,
    fetchSkill,
    fetchSkillFileTree,
    readFileContent,
    createSkill,
    updateSkill,
    deleteSkill,
    uploadFile,
    deleteFile,
    disableSkill,
    enableSkill,
    fetchSkillVersions,
    fetchSkillVersionDiff,
    enableSkillVersioning,
    activateSkillVersion,
    setCurrentSkill,
    clearError,
    // Getters
    getSkills,
    getCurrentSkill,
    getCurrentSkillTree,
    getLoading,
    getError,
  }
})
