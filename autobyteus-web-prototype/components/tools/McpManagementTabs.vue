<template>
  <div
    class="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 p-1"
    role="tablist"
    :aria-label="t('tools.components.tools.McpManagementTabs.mcp_management_sections')"
    data-testid="mcp-management-tabs"
  >
    <button
      v-for="tab in tabs"
      :id="`mcp-management-tab-${tab.id}`"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :aria-controls="`mcp-management-panel-${tab.id}`"
      :tabindex="modelValue === tab.id ? 0 : -1"
      class="rounded-full px-4 py-2 text-sm font-semibold transition"
      :class="modelValue === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
      :data-testid="`mcp-management-tab-${tab.id}`"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ t(tab.labelKey) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useLocalization();

const tabs = [
  { id: 'servers', labelKey: 'tools.components.tools.McpManagementTabs.mcp_servers' },
  { id: 'gateway', labelKey: 'tools.components.tools.McpManagementTabs.mcp_gateway' },
];
</script>
