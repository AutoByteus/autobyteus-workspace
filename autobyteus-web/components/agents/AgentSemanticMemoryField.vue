<template>
  <div class="flex items-start gap-3">
    <input
      id="semantic_memory_enabled"
      :checked="modelValue"
      type="checkbox"
      class="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      data-testid="semantic-memory-enabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <div>
      <div class="flex flex-wrap items-center gap-3">
        <label for="semantic_memory_enabled" class="block text-base font-medium text-gray-800">{{ t('agents.components.agents.AgentSemanticMemoryField.label') }}</label>
        <PersonalSettingMark :base="personalBase" :active="personal" :busy="busy" @reset="$emit('reset-personal')" />
      </div>
      <label for="semantic_memory_enabled" class="block text-sm text-gray-500">{{ t('agents.components.agents.AgentSemanticMemoryField.help') }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import PersonalSettingMark from '~/components/definitions/PersonalSettingMark.vue';
import { useLocalization } from '~/composables/useLocalization';
import type { PersonalSettingsBase } from '~/types/personalSettings';

/** The agent form's semantic memory switch, with its personal-setting mark for package and built-in agents. */
defineProps<{
  modelValue: boolean;
  personalBase?: PersonalSettingsBase | null;
  personal: boolean;
  busy?: boolean;
}>();
defineEmits<{ 'update:modelValue': [value: boolean]; 'reset-personal': [] }>();
const { t } = useLocalization();
</script>
