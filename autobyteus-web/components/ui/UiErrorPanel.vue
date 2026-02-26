<template>
  <div class="fixed right-4 bottom-4 z-[1000] max-w-[520px] w-[92vw] sm:w-[420px] font-sans">
    <button
      v-if="!isOpen && errorCount > 0"
      @click="open"
      class="w-full bg-red-600 text-white text-sm font-semibold rounded-lg shadow-lg px-3 py-2 flex items-center justify-between"
    >
      <span>Errors ({{ errorCount }})</span>
      <span class="text-xs opacity-80">Show</span>
    </button>

    <div v-else-if="isOpen" class="bg-white border border-red-200 rounded-lg shadow-xl overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 bg-red-50 border-b border-red-100">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-red-700">Errors</span>
          <span class="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            {{ errorCount }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs text-red-700 hover:text-red-900"
            @click="clear"
          >
            Clear
          </button>
          <button
            class="text-xs text-gray-600 hover:text-gray-900"
            @click="close"
          >
            Hide
          </button>
        </div>
      </div>

      <div v-if="errorCount === 0" class="px-3 py-4 text-sm text-gray-500">
        No errors captured.
      </div>

      <div v-else class="max-h-[60vh] overflow-auto divide-y divide-gray-100">
        <div v-for="err in errors" :key="err.id" class="px-3 py-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-semibold text-gray-900 break-words">
                {{ err.message }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ formatTime(err.time) }}
                <span v-if="err.source">· {{ err.source }}</span>
                <span v-if="err.count > 1">· x{{ err.count }}</span>
              </div>
            </div>
            <button
              class="text-xs text-gray-500 hover:text-gray-800"
              @click="toggleDetails(err.id)"
            >
              {{ isExpanded(err.id) ? 'Hide' : 'Details' }}
            </button>
          </div>

          <div v-if="isExpanded(err.id)" class="mt-2 text-xs text-gray-700">
            <pre v-if="err.stack" class="bg-gray-50 border border-gray-200 rounded p-2 overflow-auto whitespace-pre-wrap">{{ err.stack }}</pre>
            <pre v-else-if="err.detail" class="bg-gray-50 border border-gray-200 rounded p-2 overflow-auto whitespace-pre-wrap">{{ err.detail }}</pre>
            <div v-else class="text-gray-500">No additional details.</div>
          </div>

          <div class="mt-2">
            <button
              class="text-xs text-red-600 hover:text-red-800"
              @click="remove(err.id)"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiErrorStore } from '~/stores/uiErrorStore'

const store = useUiErrorStore()
const expanded = ref<Record<string, boolean>>({})

const errors = computed(() => store.errors)
const errorCount = computed(() => store.errors.length)
const isOpen = computed(() => store.isOpen)

const open = () => store.open()
const close = () => store.close()
const clear = () => store.clear()
const remove = (id: string) => store.remove(id)

const toggleDetails = (id: string) => {
  expanded.value[id] = !expanded.value[id]
}

const isExpanded = (id: string) => !!expanded.value[id]

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    return iso
  }
}
</script>
