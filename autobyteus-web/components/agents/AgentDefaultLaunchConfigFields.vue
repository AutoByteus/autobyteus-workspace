<template>
  <fieldset class="border-t border-gray-200 pt-8">
    <legend class="text-xl font-semibold text-gray-900">{{ $t('agents.components.agents.AgentDefaultLaunchConfigFields.defaultLaunchSettings') }}</legend>
    <p class="mt-2 text-sm text-gray-500">
      {{ $t('agents.components.agents.AgentDefaultLaunchConfigFields.launchDefaultsHelp') }}
    </p>
    <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <label for="default-launch-runtime-kind" class="block text-base font-medium text-gray-800">{{ $t('agents.components.agents.AgentDefaultLaunchConfigFields.runtimeKind') }}</label>
        <input
          id="default-launch-runtime-kind"
          :value="runtimeKind"
          type="text"
          class="mt-2 block w-full rounded-md border border-gray-300 px-4 py-2 text-base shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          placeholder="autobyteus"
          @input="emit('update:runtimeKind', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label for="default-launch-model" class="block text-base font-medium text-gray-800">{{ $t('agents.components.agents.AgentDefaultLaunchConfigFields.llmModelIdentifier') }}</label>
        <input
          id="default-launch-model"
          :value="modelIdentifier"
          type="text"
          class="mt-2 block w-full rounded-md border border-gray-300 px-4 py-2 text-base shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          placeholder="gpt-5.4-mini"
          @input="emit('update:modelIdentifier', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="md:col-span-2">
        <label for="default-launch-llm-config" class="block text-base font-medium text-gray-800">{{ $t('agents.components.agents.AgentDefaultLaunchConfigFields.llmConfigJson') }}</label>
        <textarea
          id="default-launch-llm-config"
          :value="llmConfigJson"
          rows="5"
          class="mt-2 block w-full rounded-md border border-gray-300 px-4 py-2 font-mono text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          placeholder="{&quot;reasoning_effort&quot;: &quot;medium&quot;}"
          @input="emit('update:llmConfigJson', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <p v-if="jsonError" class="mt-2 text-sm text-red-600">{{ jsonError }}</p>
      </div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'

defineProps<{
  runtimeKind: string
  modelIdentifier: string
  llmConfigJson: string
  jsonError: string | null
}>()

const { t: $t } = useLocalization()

const emit = defineEmits<{
  'update:runtimeKind': [value: string]
  'update:modelIdentifier': [value: string]
  'update:llmConfigJson': [value: string]
}>()
</script>
