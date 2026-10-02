<template>
  <div>
    <ul class="space-y-2" data-testid="task-context-file-list">
      <li v-for="file in files" :key="file.storedFilename" class="flex min-w-0 items-center gap-3 rounded-lg bg-slate-100 p-2.5">
        <button v-if="isImage(file) && urls[file.storedFilename]" type="button" class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="t('projects.ui.preview', {name: file.displayName})" @click="previewId = previewId === file.storedFilename ? '' : file.storedFilename"><img :src="urls[file.storedFilename]" :alt="file.displayName" class="h-full w-full object-cover" /></button>
        <Icon v-else :icon="isAudio(file) ? 'heroicons:musical-note' : 'heroicons:document-text'" class="h-5 w-5 flex-shrink-0 text-slate-500" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <button type="button" class="block max-w-full truncate rounded text-left text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :title="file.displayName" data-testid="task-context-file-name" @click="download(file)">{{ file.displayName }}</button>
          <p class="mt-0.5 text-xs text-slate-500">{{ t(isImage(file) ? 'projects.ui.image' : isAudio(file) ? 'projects.ui.audio' : 'projects.ui.file') }} · {{ formatSize(file.sizeBytes) }}</p>
          <p v-if="failed[file.storedFilename]" class="mt-1 text-xs text-slate-500">{{ t('projects.ui.fileUnavailable') }}</p>
        </div>
        <button v-if="editable" type="button" :disabled="disabled" class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50" :aria-label="t('projects.ui.removeFile', {name: file.displayName})" @click="emit('remove', file.storedFilename)"><Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" /></button>
      </li>
    </ul>
    <p v-if="downloadError" role="alert" class="mt-2 text-xs text-red-700">{{ downloadError }}</p>
    <div v-if="previewFile && urls[previewId]" class="mt-3 rounded-lg border border-slate-200 bg-white p-3" data-testid="task-context-image-preview">
      <div class="mb-3 flex items-center justify-between gap-3"><p class="min-w-0 break-all text-xs text-slate-600">{{ previewFile.displayName }}</p><button type="button" class="min-h-9 flex-shrink-0 rounded px-2 text-sm text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="previewId = ''">{{ t('projects.ui.closePreview') }}</button></div>
      <img :src="urls[previewId]" :alt="previewFile.displayName" class="mx-auto max-h-80 max-w-full rounded" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectTaskContextFile } from '~/types/project'
import type { createProjectTaskContextClient } from '~/services/projects/projectTaskContextClient'
const props = defineProps<{files: ProjectTaskContextFile[]; client: ReturnType<typeof createProjectTaskContextClient>; draftId?: string; savedFilenames?: string[]; editable?: boolean; disabled?: boolean}>()
const emit = defineEmits<{remove: [name: string]}>()
const {t} = useLocalization()
const previewId = ref(''), urls = ref<Record<string, string>>({}), failed = ref<Record<string, boolean>>({}), downloadError = ref('')
const isImage = (file: ProjectTaskContextFile) => file.mimeType.startsWith('image/')
const isAudio = (file: ProjectTaskContextFile) => file.mimeType.startsWith('audio/')
const previewFile = computed(() => props.files.find((f) => f.storedFilename === previewId.value))
let generation = 0, alive = true
const revoke = () => {for (const url of Object.values(urls.value)) URL.revokeObjectURL(url); urls.value = {}}
const blob = (f: ProjectTaskContextFile) => props.client.blob(f, props.savedFilenames?.includes(f.storedFilename) ? undefined : props.draftId)
watch(() => [props.files, props.draftId], async () => {
  const token = ++generation; revoke(); failed.value = {}; previewId.value = ''
  await Promise.all(props.files.filter((f) => f.mimeType.startsWith('image/')).map(async (f) => {
    try { const result = await blob(f); if (alive && token === generation && props.client.current()) urls.value[f.storedFilename] = URL.createObjectURL(result) }
    catch { if (alive && token === generation) failed.value[f.storedFilename] = true }
  }))
}, {immediate: true, deep: true})
const download = async (file: ProjectTaskContextFile) => {
  downloadError.value = ''
  try {
    const data = await blob(file)
    if (!alive || !props.client.current()) return
    const url = URL.createObjectURL(data), link = document.createElement('a')
    link.href = url; link.download = file.displayName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch { if (alive) downloadError.value = t('projects.ui.downloadFailed') }
}
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
onBeforeUnmount(() => {alive = false; generation++; revoke()})
</script>
