<template>
  <section class="rounded-xl border border-gray-200 bg-white p-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">{{ $t('workspace.components.launchConfig.DefinitionLaunchPreferencesSection.title') }}</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ $t('workspace.components.launchConfig.DefinitionLaunchPreferencesSection.help') }}
        </p>
      </div>
      <button
        v-if="hasConfiguredPreferences"
        type="button"
        class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="clearPreferences"
      >
        {{ $t('workspace.components.launchConfig.DefinitionLaunchPreferencesSection.clear') }}
      </button>
    </div>

    <div class="mt-4">
      <RuntimeModelConfigFields
        :runtime-kind="runtimeKind"
        :llm-model-identifier="llmModelIdentifier"
        :llm-config="llmConfig"
        :allow-blank-runtime="true"
        :blank-runtime-label="$t('workspace.components.launchConfig.DefinitionLaunchPreferencesSection.blankRuntime')"
        :runtime-label="$t('workspace.components.launchConfig.RuntimeModelConfigFields.runtimeLabel')"
        :model-label="$t('workspace.components.launchConfig.RuntimeModelConfigFields.modelLabel')"
        :model-placeholder="$t('workspace.components.launchConfig.RuntimeModelConfigFields.modelPlaceholder')"
        :id-prefix="idPrefix"
        @update:runtime-kind="emit('update:runtimeKind', $event)"
        @update:llm-model-identifier="emit('update:llmModelIdentifier', $event)"
        @update:llm-config="emit('update:llmConfig', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import RuntimeModelConfigFields from './RuntimeModelConfigFields.vue'
import { hasMeaningfulDefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'

const props = defineProps<{
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
  llmConfig?: Record<string, unknown> | null
  idPrefix?: string
}>()

const emit = defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void
  (e: 'clear'): void
}>()

const { t: $t } = useLocalization()

const hasConfiguredPreferences = computed(() => hasMeaningfulDefaultLaunchConfig({
  runtimeKind: props.runtimeKind,
  llmModelIdentifier: props.llmModelIdentifier,
  llmConfig: props.llmConfig,
}))

const clearPreferences = () => {
  emit('update:runtimeKind', '')
  emit('update:llmModelIdentifier', '')
  emit('update:llmConfig', null)
  emit('clear')
}
</script>
