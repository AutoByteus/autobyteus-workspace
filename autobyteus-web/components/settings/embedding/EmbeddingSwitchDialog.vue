<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" data-testid="embedding-switch-overlay">
      <div
        ref="dialogRef"
        class="relative max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="embedding-switch-title"
        aria-describedby="embedding-switch-body"
        data-testid="embedding-switch-dialog"
        @keydown.esc.prevent="$emit('cancel')"
        @keydown.tab="trapFocus"
      >
        <h3 id="embedding-switch-title" class="text-lg font-semibold text-gray-900">{{ t('settings.search.switch.title', { model: model.displayName }) }}</h3>

        <div id="embedding-switch-body" class="mt-3 space-y-3 text-sm text-gray-600">
          <p class="font-medium text-gray-900">{{ t('settings.search.switch.lead') }}</p>
          <ul class="list-disc space-y-1.5 pl-5">
            <li>{{ t('settings.search.switch.limited') }}</li>
          </ul>
        </div>

        <p class="mt-4 text-sm" data-testid="embedding-switch-cost">
          <span class="text-gray-500">{{ t('settings.search.switch.costDownload') }}: </span>
          <span class="font-medium text-gray-900" data-testid="embedding-switch-cost-download">{{ downloaded ? t('settings.search.switch.costDownloadDone') : t('settings.search.switch.costDownloadNeeded', { size: toMb(model.downloadBytes) }) }}</span>
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button ref="cancelRef" type="button" class="inline-flex min-h-9 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" data-testid="embedding-switch-cancel" @click="$emit('cancel')">{{ t('settings.search.switch.cancel') }}</button>
          <button type="button" class="inline-flex min-h-9 items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" data-testid="embedding-switch-confirm" @click="$emit('confirm')">{{ t('settings.search.switch.confirm') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { EmbeddingModelInfo } from '~/types/embeddingSettings'
import { toMb } from './embeddingPresentation'

const props = defineProps<{ model: EmbeddingModelInfo }>()
defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>()

const { t } = useLocalization()
const downloaded = computed(() => props.model.file.state === 'DOWNLOADED')

const dialogRef = ref<HTMLElement | null>(null)
const cancelRef = ref<HTMLButtonElement | null>(null)
let opener: HTMLElement | null = null

// Focus moves into the dialog on Cancel (the safe action) and returns to the opener on close; Tab stays inside.
// After a confirmed switch the panel then moves focus on to the new Active row.
onMounted(async () => {
  opener = document.activeElement as HTMLElement | null
  await nextTick()
  cancelRef.value?.focus()
})
onBeforeUnmount(() => opener?.focus?.())

const trapFocus = (event: KeyboardEvent) => {
  const nodes = Array.from(dialogRef.value?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])
  if (nodes.length === 0) return
  const first = nodes[0]!
  const last = nodes[nodes.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>
