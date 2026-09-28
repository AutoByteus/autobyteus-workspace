<template>
  <p v-if="state === 'loading' || state === 'idle'" class="flex items-center gap-2 px-2 py-2 text-xs text-gray-400" data-test="chat-model-loading">
    <span class="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400 motion-reduce:animate-none" aria-hidden="true"></span>
    {{ $t('chat.model.loading') }}
  </p>
  <div v-else-if="state === 'error'" class="flex items-center justify-between gap-2 px-2 py-1.5 text-xs" data-test="chat-model-error">
    <span class="text-red-600">{{ $t('chat.model.loadError') }}</span>
    <button
      type="button"
      data-row
      data-test="chat-model-retry"
      class="rounded px-1.5 py-0.5 font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
      @click="emit('retry')"
    >{{ $t('chat.model.retry') }}</button>
  </div>
  <p v-else-if="!groups.length" class="px-2 py-2 text-xs text-gray-400">{{ $t('chat.model.noModels') }}</p>
  <div v-else :data-test="`chat-model-list-${runtimeKind}`">
    <template v-for="group in groups" :key="group.providerName">
      <p v-if="showProviderLabels" class="px-2 pb-0.5 pt-1.5 text-[0.6875rem] font-medium text-gray-400">{{ group.providerName }}</p>
      <button
        v-for="model in group.models"
        :key="model.llmModelIdentifier"
        type="button"
        role="menuitemradio"
        data-row
        :aria-checked="model.llmModelIdentifier === currentModelIdentifier ? 'true' : 'false'"
        :data-test="`chat-model-option-${model.llmModelIdentifier}`"
        :title="[model.title, model.description].filter(Boolean).join(' — ') || undefined"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
        @click="emit('choose', model)"
      >
        <span class="min-w-0 flex-1 truncate whitespace-nowrap">{{ model.name }}</span>
        <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          <Icon v-if="model.llmModelIdentifier === currentModelIdentifier" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
        </span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ChatCatalogState, ChatModelGroup, ChatModelOption } from '~/composables/chat/useChatModelCatalog'

const props = defineProps<{
  runtimeKind: string
  state: ChatCatalogState
  groups: ChatModelGroup[]
  currentModelIdentifier: string | null
}>()
// Provider sub-labels appear only when a runtime has more than one provider.
const showProviderLabels = computed(() => props.groups.length > 1)
const emit = defineEmits<{
  (event: 'choose', model: ChatModelOption): void
  (event: 'retry'): void
}>()
</script>
