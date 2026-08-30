<template>
  <div :class="advancedListClass">
    <!-- Clean grid layout for advanced parameters -->
    <div v-for="(paramSchema, key) in schema" :key="key" :class="advancedRowClass">
      <label :for="inputId(key)" class="text-sm font-normal text-gray-700" :title="key">
        {{ displayLabel(String(key), paramSchema) }}
        <span v-if="paramSchema.description" :title="paramSchema.description" class="ml-1 text-gray-400 cursor-help hover:text-gray-600 transition-colors">ⓘ</span>
      </label>

      <div>
        <div
          v-if="missingHistoricalConfig"
          class="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          data-testid="missing-historical-config-value"
        >
          {{ missingHistoricalConfigLabel }}
        </div>
        <select
          v-else-if="paramSchema.enum"
          :id="inputId(key)"
          :value="selectValue(key, paramSchema)"
          :disabled="disabled"
          :class="advancedSelectClass"
          :aria-invalid="Boolean(validationErrors[key])"
          :aria-describedby="validationErrors[key] ? errorId(String(key)) : undefined"
          @change="handleSelectChange(key, ($event.target as HTMLSelectElement).value)"
        >
          <option v-if="shouldRenderDefaultOption(paramSchema)" :value="DEFAULT_OPTION">{{ $t('workspace.components.workspace.config.ModelConfigAdvanced.default') }}</option>
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
            :aria-invalid="Boolean(validationErrors[key])"
            :aria-describedby="validationErrors[key] ? errorId(String(key)) : undefined"
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
          :class="advancedInputClass"
          :aria-invalid="Boolean(validationErrors[key])"
          :aria-describedby="validationErrors[key] ? errorId(String(key)) : undefined"
          @input="handleNumberChange(key, ($event.target as HTMLInputElement).value)"
        />

        <input
          v-else
          :id="inputId(key)"
          type="text"
          :value="configValue(key) as string | ''"
          :disabled="disabled"
          :class="advancedInputClass"
          :aria-invalid="Boolean(validationErrors[key])"
          :aria-describedby="validationErrors[key] ? errorId(String(key)) : undefined"
          @input="handleTextChange(key, ($event.target as HTMLInputElement).value)"
        />
        <p v-if="validationErrors[key]" :id="errorId(String(key))" role="alert" class="mt-1 text-xs text-red-700">
          {{ validationErrors[key] }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  getValidSchemaDefault,
  resolveEffectiveConfigValue,
  type UiModelConfigSchema,
} from '~/utils/llmConfigSchema';

const DEFAULT_OPTION = '__default__';

const props = defineProps<{
  schema: UiModelConfigSchema;
  config: Record<string, unknown> | null | undefined;
  disabled?: boolean;
  compact?: boolean;
  idPrefix?: string;
  missingHistoricalConfig?: boolean;
  missingHistoricalConfigLabel?: string;
  controlVariant?: 'default' | 'quiet';
  validationErrors?: Readonly<Record<string, string>>;
}>();

const emit = defineEmits<{
  (e: 'update:config', value: Record<string, unknown> | null): void;
}>();

const normalizedConfig = computed(() => props.config ?? {});
const missingHistoricalConfigLabel = computed(() =>
  props.missingHistoricalConfigLabel ?? '',
);
const controlVariant = computed(() => props.controlVariant ?? 'default');
const validationErrors = computed(() => props.validationErrors ?? {});
const advancedListClass = computed(() => [
  props.compact ? 'space-y-3 pt-1' : 'space-y-3 pt-1.5',
]);
const advancedRowClass = computed(() => [
  'grid items-center gap-3',
  props.compact ? 'grid-cols-[minmax(0,1fr),minmax(7rem,0.95fr)]' : 'grid-cols-[1.2fr,1fr]',
]);
const advancedSelectClass = computed(() => [
  'block w-full rounded-md border py-2 pl-3 pr-8 text-sm text-gray-900 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
  controlVariant.value === 'quiet'
    ? 'border-transparent bg-blue-50/40 ring-1 ring-inset ring-blue-100/80 hover:bg-blue-50/70 hover:ring-blue-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/50'
    : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
]);
const advancedInputClass = computed(() => [
  'block w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
  controlVariant.value === 'quiet'
    ? 'border-transparent bg-blue-50/40 ring-1 ring-inset ring-blue-100/80 hover:bg-blue-50/70 hover:ring-blue-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/50'
    : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
]);

const formatLabel = (key: string): string => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const displayLabel = (
  key: string,
  paramSchema: UiModelConfigSchema[string],
): string => paramSchema.title ?? formatLabel(key);

const inputId = (key: string) => {
  if (props.idPrefix) {
    return `${props.idPrefix}-${key}`;
  }
  return `config-${key}`;
};
const errorId = (key: string) => `${inputId(key)}-error`;

const configValue = (key: string) => normalizedConfig.value[key];

const shouldRenderDefaultOption = (paramSchema: UiModelConfigSchema[string]) =>
  getValidSchemaDefault(paramSchema) === undefined;

const selectValue = (
  key: string,
  paramSchema: UiModelConfigSchema[string],
) => resolveEffectiveConfigValue(paramSchema, normalizedConfig.value[key]) ?? DEFAULT_OPTION;

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
