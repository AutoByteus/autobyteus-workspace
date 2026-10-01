<template>
  <FeatureCapabilityToggleCard
    :store="skillImprovementCapabilityStore"
    :title="labels.title"
    :description="labels.description"
    test-id-prefix="skill-improvement"
    :status-labels="statusLabels"
    :status-message="statusMessage"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FeatureCapabilityToggleCard from '~/components/settings/FeatureCapabilityToggleCard.vue'
import { useSkillImprovementCapabilityStore } from '~/stores/skillImprovementCapabilityStore'

const skillImprovementCapabilityStore = useSkillImprovementCapabilityStore()

const labels = {
  title: 'Skill Improvement',
  description: 'Control whether manual Skill Improvement can be started on the currently bound node. Disabled by default.',
}

const statusLabels = {
  loading: 'Loading',
  error: 'Error',
  enabled: 'Enabled',
  disabled: 'Disabled',
  saving: 'Saving...',
}

const statusMessage = computed(() => {
  const source = skillImprovementCapabilityStore.capability?.source
  if (!source) {
    return null
  }

  if (source === 'INITIALIZED_DISABLED') {
    return 'Initialized disabled for safety. Enable only when you want visible helper runs to edit configured skill files.'
  }

  return 'Persisted as an explicit runtime setting for this node.'
})
</script>
