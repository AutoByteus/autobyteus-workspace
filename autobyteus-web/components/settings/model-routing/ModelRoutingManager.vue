<template>
  <div class="flex w-full flex-col gap-5" data-testid="settings-model-routing-panel">
    <header class="px-1">
      <h2 class="text-2xl font-semibold leading-tight text-gray-900">{{ t('settings.modelRouting.title') }}</h2>
      <p class="mt-1 text-sm text-gray-500">{{ t('settings.modelRouting.description') }}</p>
    </header>
    <AgentRuntimesNowSection />
  </div>
</template>

<script setup lang="ts">
import AgentRuntimesNowSection from './AgentRuntimesNowSection.vue'

const { t } = useLocalization()
</script>
