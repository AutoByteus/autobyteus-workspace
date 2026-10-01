<template>
  <FeatureCapabilityToggleCard
    :store="applicationsCapabilityStore"
    :title="t('settings.components.settings.ApplicationsFeatureToggleCard.title')"
    :description="t('settings.components.settings.ApplicationsFeatureToggleCard.description')"
    test-id-prefix="applications"
    :status-labels="statusLabels"
    :status-message="statusMessage"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FeatureCapabilityToggleCard from '~/components/settings/FeatureCapabilityToggleCard.vue'
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'

const { t } = useLocalization()
const applicationsCapabilityStore = useApplicationsCapabilityStore()

const statusLabels = computed(() => ({
  loading: t('settings.components.settings.ApplicationsFeatureToggleCard.status.loading'),
  error: t('settings.components.settings.ApplicationsFeatureToggleCard.status.error'),
  enabled: t('settings.components.settings.ApplicationsFeatureToggleCard.status.enabled'),
  disabled: t('settings.components.settings.ApplicationsFeatureToggleCard.status.disabled'),
  saving: t('settings.components.settings.ApplicationsFeatureToggleCard.saving'),
}))

const statusMessage = computed(() => {
  const source = applicationsCapabilityStore.capability?.source
  if (!source) {
    return null
  }

  if (source === 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS') {
    return t('settings.components.settings.ApplicationsFeatureToggleCard.source.initializedFromDiscoveredApplications')
  }

  if (source === 'INITIALIZED_EMPTY_CATALOG') {
    return t('settings.components.settings.ApplicationsFeatureToggleCard.source.initializedEmptyCatalog')
  }

  return t('settings.components.settings.ApplicationsFeatureToggleCard.source.serverSetting')
})
</script>
