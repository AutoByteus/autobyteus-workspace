<template>
  <div class="mt-4 border-t border-slate-100 pt-4 first:border-t-0" :data-testid="`project-workspace-draft-${index}`">
    <div class="flex items-center gap-2">
      <div class="flex min-w-0 flex-1 rounded-lg bg-slate-100 p-1" :aria-label="t('projects.ui.workspaceSource', {index: index + 1})">
        <button v-for="mode in (['existing', 'new'] as const)" :key="mode" type="button" :disabled="disabled" :aria-pressed="row.mode === mode" class="min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="row.mode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-white/60'" :data-testid="`workspace-mode-${mode}-${index}`" @click="row.mode = mode; row.error = ''">{{ t(mode === 'existing' ? 'projects.ui.existingWorkspace' : 'projects.ui.newFolder') }}</button>
      </div>
      <button type="button" :disabled="disabled" class="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="t('projects.ui.removeWorkspace', {index: index + 1})" @click="emit('remove')"><Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" /></button>
    </div>
    <label :for="`workspace-choice-${row.key}`" class="mt-3 block text-sm font-medium text-slate-700">{{ t(row.mode === 'existing' ? 'projects.ui.workspace' : 'projects.ui.folderPath') }}</label>
    <select v-if="row.mode === 'existing'" :id="`workspace-choice-${row.key}`" v-model="row.workspaceId" :disabled="disabled" :aria-invalid="Boolean(row.error)" :aria-describedby="row.error ? `workspace-error-${row.key}` : undefined" :class="inputClass" :data-testid="`workspace-select-${index}`" @change="row.error = ''"><option value="" disabled>{{ t('projects.ui.selectWorkspace') }}</option><option v-for="workspace in choices" :key="workspace.workspaceId" :value="workspace.workspaceId">{{ workspace.displayName }}</option></select>
    <input v-else :id="`workspace-choice-${row.key}`" v-model="row.path" :disabled="disabled" type="text" placeholder="/path/to/workspace" :aria-invalid="Boolean(row.error)" :aria-describedby="row.error ? `workspace-error-${row.key}` : undefined" :class="inputClass" :data-testid="`workspace-path-${index}`" @input="row.error = ''" />
    <p v-if="row.mode === 'existing' && selected" class="mt-1.5 break-all font-mono text-xs leading-5 text-slate-500">{{ selected.workspaceRootPath }}</p>
    <p v-if="row.error" :id="`workspace-error-${row.key}`" class="mt-2 text-sm text-red-600" role="alert">{{ row.error }}</p>
    <label :for="`workspace-description-${row.key}`" class="mt-3 block text-sm font-medium text-slate-700">{{ t('projects.ui.description') }} <span class="font-normal text-slate-500">{{ t('projects.ui.optional') }}</span></label>
    <textarea :id="`workspace-description-${row.key}`" v-model="row.description" :disabled="disabled" rows="2" :placeholder="t('projects.ui.workspaceDescriptionPlaceholder')" class="mt-2 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-base leading-6 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm" :data-testid="`workspace-description-${index}`" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectWorkspaceDraft } from '~/types/projectWorkspaceDraft'
const row = defineModel<ProjectWorkspaceDraft>({required: true})
const props = defineProps<{index: number; disabled?: boolean; choices: Array<{workspaceId: string; displayName: string; workspaceRootPath: string}>}>()
const emit = defineEmits<{remove: []}>()
const {t} = useLocalization()
const selected = computed(() => props.choices.find((c) => c.workspaceId === row.value.workspaceId))
const inputClass = 'mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm'
</script>
