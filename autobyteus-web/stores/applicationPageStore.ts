import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ApplicationPageMode = 'application' | 'execution'

export const useApplicationPageStore = defineStore('applicationPage', () => {
  const modeByApplicationId = ref<Record<string, ApplicationPageMode>>({})
  const selectedMemberRouteKeyByApplicationId = ref<Record<string, string | null>>({})

  const getMode = computed(
    () => (applicationId: string): ApplicationPageMode =>
      modeByApplicationId.value[applicationId] ?? 'application',
  )

  const getSelectedMemberRouteKey = computed(
    () => (applicationId: string): string | null =>
      selectedMemberRouteKeyByApplicationId.value[applicationId] ?? null,
  )

  const setMode = (applicationId: string, mode: ApplicationPageMode): void => {
    modeByApplicationId.value = {
      ...modeByApplicationId.value,
      [applicationId]: mode,
    }
  }

  const setSelectedMemberRouteKey = (
    applicationId: string,
    memberRouteKey: string | null,
  ): void => {
    selectedMemberRouteKeyByApplicationId.value = {
      ...selectedMemberRouteKeyByApplicationId.value,
      [applicationId]: memberRouteKey,
    }
  }

  return {
    getMode,
    getSelectedMemberRouteKey,
    setMode,
    setSelectedMemberRouteKey,
  }
})
