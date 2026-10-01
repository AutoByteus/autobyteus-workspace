<template>
  <FeatureCapabilityToggleCard
    :store="projectsCapabilityStore"
    :title="t('settings.components.settings.ProjectsFeatureToggleCard.title')"
    :description="t('settings.components.settings.ProjectsFeatureToggleCard.description')"
    test-id-prefix="projects"
    :status-labels="statusLabels"
    :status-message="statusMessage"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FeatureCapabilityToggleCard from '~/components/settings/FeatureCapabilityToggleCard.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectsCapabilityStore } from '~/stores/projectsCapabilityStore'

const { t } = useLocalization()
const projectsCapabilityStore = useProjectsCapabilityStore()

const statusLabels = computed(() => ({
  loading: t('settings.components.settings.ProjectsFeatureToggleCard.status.loading'),
  error: t('settings.components.settings.ProjectsFeatureToggleCard.status.error'),
  enabled: t('settings.components.settings.ProjectsFeatureToggleCard.status.enabled'),
  disabled: t('settings.components.settings.ProjectsFeatureToggleCard.status.disabled'),
  saving: t('settings.components.settings.ProjectsFeatureToggleCard.saving'),
}))

const statusMessage = computed(() => {
  const source = projectsCapabilityStore.capability?.source
  if (!source) {
    return null
  }

  return source === 'INITIALIZED_DISABLED'
    ? t('settings.components.settings.ProjectsFeatureToggleCard.source.initializedDisabled')
    : t('settings.components.settings.ProjectsFeatureToggleCard.source.serverSetting')
})
</script>
