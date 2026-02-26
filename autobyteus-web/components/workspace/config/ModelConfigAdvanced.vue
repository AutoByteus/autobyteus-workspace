<template>
  <div class="space-y-4 pt-2">
    <!-- Clean grid layout for advanced parameters -->
    <div v-for="(paramSchema, key) in schema" :key="key" class="grid grid-cols-[1.2fr,1fr] items-center gap-3">
      <label :for="inputId(key)" class="text-sm text-gray-700 font-normal" :title="key">
        {{ formatLabel(key) }}
        <span v-if="paramSchema.description" :title="paramSchema.description" class="ml-1 text-gray-400 cursor-help hover:text-gray-600 transition-colors">ⓘ</span>
      </label>

      <div>
        <select
          v-if="paramSchema.enum"
          :id="inputId(key)"
          :value="selectValue(key, paramSchema.enum)"
          :disabled="disabled"
          class="block w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          @change="handleSelectChange(key, ($event.target as HTMLSelectElement).value)"
        >
          <option v-if="paramSchema.default === undefined" :value="DEFAULT_OPTION">Default</option>
          <option v-for="option in paramSchema.enum" :key="String(option)" :value="option">
            {{ option }}
          </option>
        </select>

        <div v-else-if="paramSchema.type === 'boolean'" class="flex justify-start">
          <button
            type="button"
            :id="inputId(key)"
            :disabled="disabled"
            class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="configValue(key) === true ? 'bg-blue-600' : 'bg-gray-200'"
            @click="handleBooleanChange(key, configValue(key) !== true)"
          >
            <span 
              aria-hidden="true" 
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="configValue(key) === true ? 'translate-x-4' : 'translate-x-0'"
            />
          </button>
        </div>

        <input
          v-else-if="paramSchema.type === 'integer' || paramSchema.type === 'number'"
          :id="inputId(key)"
          type="number"
          :value="configValue(key) as number | ''"
          :disabled="disabled"
          class="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-gray-400"
          @input="handleNumberChange(key, ($event.target as HTMLInputElement).value)"
        />

        <input
          v-else
          :id="inputId(key)"
          type="text"
          :value="configValue(key) as string | ''"
          :disabled="disabled"
          class="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-gray-400"
          @input="handleTextChange(key, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema';

const DEFAULT_OPTION = '__default__';

const props = defineProps<{
  schema: UiModelConfigSchema;
  config: Record<string, unknown> | null | undefined;
  disabled?: boolean;
  compact?: boolean;
  idPrefix?: string;
}>();

const emit = defineEmits<{
  (e: 'update:config', value: Record<string, unknown> | null): void;
}>();

const normalizedConfig = computed(() => props.config ?? {});

const formatLabel = (key: string): string => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const inputId = (key: string) => {
  if (props.idPrefix) {
    return `${props.idPrefix}-${key}`;
  }
  return `config-${key}`;
};

const configValue = (key: string) => normalizedConfig.value[key];

const selectValue = (key: string, options: unknown[]) => {
  const value = normalizedConfig.value[key];
  if (value === undefined && !options.includes(DEFAULT_OPTION)) {
    return DEFAULT_OPTION;
  }
  return value as unknown;
};

const emitConfig = (nextConfig: Record<string, unknown>) => {
  emit('update:config', Object.keys(nextConfig).length > 0 ? nextConfig : null);
};

const updateKey = (key: string, value: unknown, removeIfUndefined = false) => {
  const nextConfig = { ...normalizedConfig.value } as Record<string, unknown>;
  if (removeIfUndefined && value === undefined) {
    delete nextConfig[key];
  } else {
    nextConfig[key] = value;
  }
  emitConfig(nextConfig);
};

const handleSelectChange = (key: string, rawValue: string) => {
  if (rawValue === DEFAULT_OPTION) {
    updateKey(key, undefined, true);
    return;
  }
  updateKey(key, rawValue);
};

const handleBooleanChange = (key: string, checked: boolean) => {
  updateKey(key, checked);
};

const handleNumberChange = (key: string, rawValue: string) => {
  if (rawValue === '') {
    updateKey(key, undefined, true);
    return;
  }
  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    updateKey(key, undefined, true);
    return;
  }
  updateKey(key, parsed);
};

const handleTextChange = (key: string, value: string) => {
  updateKey(key, value);
};
</script>
