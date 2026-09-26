<template>
  <div class="flex h-full items-center justify-center px-6 py-16" data-testid="projects-select-prompt">
    <div class="max-w-sm text-center">
      <Icon icon="heroicons:folder-open" class="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
      <h2 class="mt-3 text-base font-semibold text-slate-900">{{ t('projects.pages.projects.index.title') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('projects.pages.projects.index.help') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'

const { t } = useLocalization()
</script>
