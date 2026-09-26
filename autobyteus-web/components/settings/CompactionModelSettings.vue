<template>
  <div>
    <label class="mb-1 block text-sm font-medium text-gray-900">{{ label('model') }}</label>
    <SearchableGroupedSelect
      :model-value="modelValue.modelIdentifier ?? ''"
      :options="options"
      :placeholder="label('inheritModel')"
      :disabled="disabled"
      :selected-display="unavailable ? modelValue.modelIdentifier : null"
      data-testid="compaction-model-select"
      @update:model-value="selectModel"
    />
    <p class="mt-1 text-xs text-gray-500">{{ label('modelHelp') }}</p>
    <p v-if="isLoadingModels" class="mt-2 text-sm text-gray-500" role="status">{{ label('loadingModels') }}</p>
    <p v-if="unavailable" class="mt-2 text-sm text-amber-700" role="alert">{{ label('unavailableModel') }} {{ modelValue.modelIdentifier }}</p>
    <div v-if="modelLoadError" class="mt-2 text-sm text-red-700" role="alert">
      {{ label('modelError') }}
      <button type="button" class="ml-2 underline" :disabled="disabled" @click="reloadModelsForRuntime('autobyteus')">{{ label('retry') }}</button>
    </div>
    <ModelConfigSection :schema="schema" :model-config="modelValue.llmConfig" :disabled="disabled"
      :apply-defaults="false" :preserve-invalid-draft="true" compact id-prefix="compaction-model"
      @update:config="setConfig" />
    <button v-if="modelValue.llmConfig" type="button" class="mt-2 text-xs text-blue-700 underline"
      :disabled="disabled" @click="setConfig(null)">{{ label('resetModelConfig') }}</button>
    <p v-if="!valid" class="mt-2 text-sm text-red-700" role="alert">{{ label('invalidModelConfig') }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ModelConfigSection from '~/components/workspace/config/ModelConfigSection.vue'
import { useRuntimeScopedModelSelection } from '~/composables/useRuntimeScopedModelSelection'
import { useLocalization } from '~/composables/useLocalization'
import { validateUiModelConfig } from '~/utils/llmConfigSchema'
import type { CompactionModelSettings } from '~/utils/compactionModelSettings'
const props = defineProps<{ modelValue: CompactionModelSettings; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: CompactionModelSettings]; valid: [value: boolean] }>()
const { t } = useLocalization()
const label = (key: string) => t(`settings.components.settings.CompactionConfigCard.${key}`)
const { groupedModelOptions, hasModelIdentifier, modelConfigSchemaByIdentifier, isLoadingModels,
  modelLoadError, reloadModelsForRuntime } = useRuntimeScopedModelSelection({ runtimeKind: ref('autobyteus') })
const options = computed(() => [{ label: label('model'), items: [{ id: '', name: label('inheritModel') }] }, ...groupedModelOptions.value])
const unavailable = computed(() => !!props.modelValue.modelIdentifier && !isLoadingModels.value && !hasModelIdentifier(props.modelValue.modelIdentifier))
const selectedModelIdentifier = computed(() => props.modelValue.modelIdentifier)
const schema = computed(() => modelConfigSchemaByIdentifier(selectedModelIdentifier.value))
const valid = computed(() => !props.modelValue.llmConfig || validateUiModelConfig(schema.value, props.modelValue.llmConfig).length === 0)
watch(valid, (value) => emit('valid', value), { immediate: true })
const selectModel = (value: string) => emit('update:modelValue', { modelIdentifier: value || null, llmConfig: null })
const setConfig = (llmConfig: Record<string, unknown> | null) => emit('update:modelValue', { ...props.modelValue, llmConfig })
</script>
