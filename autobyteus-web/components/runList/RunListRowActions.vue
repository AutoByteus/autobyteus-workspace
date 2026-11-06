<template>
  <!-- A run row's actions, the trees' run-row actions: Stop while it runs; Archive and Delete on hover or focus (always
       below md); then the age. Titles and disabled states are the existing ones, passed by the row per kind. -->
  <div class="flex flex-shrink-0 items-start gap-1 py-1 pr-2">
    <div class="flex items-center gap-1 leading-5" data-test="run-list-row-actions">
      <button
        v-if="stoppable"
        type="button"
        data-test="run-list-stop"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
        :title="labels.stop"
        :aria-label="labels.stop"
        :disabled="busyStop"
        @click.stop="emit('stop')"
      >
        <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
      </button>
      <button
        v-if="archivable"
        type="button"
        data-test="run-list-archive"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="labels.archive"
        :aria-label="labels.archive"
        :disabled="busyArchive"
        @click.stop="emit('archive')"
      >
        <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
      </button>
      <button
        v-if="deletable"
        type="button"
        data-test="run-list-delete"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="labels.delete"
        :aria-label="labels.delete"
        :disabled="busyDelete"
        @click.stop="emit('delete')"
      >
        <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
      </button>
      <span class="text-xs text-gray-400" data-test="run-list-age">{{ age }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(defineProps<{
  stoppable?: boolean
  archivable?: boolean
  deletable?: boolean
  busyStop?: boolean
  busyArchive?: boolean
  busyDelete?: boolean
  labels: Readonly<{ stop: string; archive: string; delete: string }>
  age: string
}>(), { stoppable: false, archivable: false, deletable: false, busyStop: false, busyArchive: false, busyDelete: false })
const emit = defineEmits<{ (event: 'stop'): void; (event: 'archive'): void; (event: 'delete'): void }>()
</script>
