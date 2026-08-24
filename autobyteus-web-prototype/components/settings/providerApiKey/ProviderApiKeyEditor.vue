<template>
  <div class="flex gap-2">
    <div class="relative flex-1">
      <input
        v-model="apiKey"
        :type="showApiKey ? 'text' : 'password'"
        class="w-full p-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        :placeholder="configured
          ? $t('settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update')
          : $t('settings.components.settings.ProviderAPIKeyManager.enter_api_key')"
      />
      <button
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        type="button"
        @click="showApiKey = !showApiKey"
      >
        <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid w-4 h-4"></span>
        <span v-else class="i-heroicons-eye-20-solid w-4 h-4"></span>
      </button>
    </div>
    <button
      class="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
      :disabled="!apiKey || saving"
      @click="submit"
    >
      <span
        v-if="saving"
        class="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"
      ></span>
      {{ saving
        ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
        : $t('settings.components.settings.ProviderAPIKeyManager.save_key') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  configured: boolean
  saving: boolean
  resetVersion: number
}>()

const emit = defineEmits<{
  (event: 'save', apiKey: string): void
}>()

const apiKey = ref('')
const showApiKey = ref(false)

watch(
  () => props.resetVersion,
  () => {
    apiKey.value = ''
    showApiKey.value = false
  },
)

const submit = () => {
  emit('save', apiKey.value)
}
</script>
