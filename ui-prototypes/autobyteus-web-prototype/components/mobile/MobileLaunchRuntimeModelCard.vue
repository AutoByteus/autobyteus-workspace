<template>
  <section class="rounded-3xl border border-blue-200 bg-white p-4" data-testid="mobile-launch-runtime-model-card">
    <div class="mb-3">
      <p class="text-sm font-bold text-blue-950">Runtime and model</p>
    </div>

    <RuntimeModelConfigFields
      :runtime-kind="runtimeKind"
      :llm-model-identifier="llmModelIdentifier"
      :llm-config="llmConfig"
      :disabled="disabled"
      :read-only="disabled"
      :model-label="modelLabel"
      :id-prefix="idPrefix"
      @update:runtime-kind="$emit('update:runtimeKind', $event)"
      @update:llm-model-identifier="$emit('update:llmModelIdentifier', $event)"
      @update:llm-config="$emit('update:llmConfig', $event)"
    />

  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'

const props = defineProps<{
  variant: 'agent' | 'team'
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig?: Record<string, unknown> | null
  disabled?: boolean
}>()

defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void
}>()

const modelLabel = computed(() => props.variant === 'team' ? 'Default team model' : 'Model')
const idPrefix = computed(() => `mobile-${props.variant}-run`)
</script>
