<template>
  <div data-test="fixed-workspace-path">
    <div class="mb-2 text-sm font-medium text-gray-700">
      {{ t('workspace.components.workspace.config.WorkspaceSelector.workspace_directory') }}
    </div>
    <div
      role="textbox"
      aria-readonly="true"
      :aria-label="t('workspace.components.workspace.config.WorkspaceSelector.workspace_directory')"
      tabindex="0"
      class="min-w-0 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 break-words focus:outline-none focus:ring-2 focus:ring-blue-500"
      data-test="fixed-workspace-value"
    >{{ rootPath || '—' }}</div>
    <p class="mt-2 text-xs text-gray-500" data-test="fixed-workspace-context">
      {{ t('workspace.runModelConfig.fixedWorkspace') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'

defineProps<{ rootPath: string | null }>()
const { t } = useLocalization()
</script>
