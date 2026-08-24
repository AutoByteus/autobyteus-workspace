<template>
  <div v-if="show && tool" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="close">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ tool.name }}</h2>
            <p class="text-sm text-gray-500 mt-1">{{ tool.description }}</p>
          </div>
          <button @click="close" class="p-2 text-gray-500 hover:text-gray-800 rounded-full">
            <span class="i-heroicons-x-mark-20-solid w-6 h-6"></span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Parameters</h3>
        <div v-if="displayRows.length > 0" class="border rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="param in displayRows" :key="param.id" :class="param.depth > 0 ? 'bg-gray-50/60' : 'bg-white'">
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                  <div :style="parameterNameIndentStyle(param.depth)">
                    <code>{{ param.name }}</code>
                    <div v-if="param.depth > 0" class="mt-1 text-xs font-normal text-gray-500">
                      {{ param.path }}
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {{ param.paramType }}
                  </span>
                  <div v-if="param.enumValues" class="text-xs text-gray-500 mt-1">
                    Enum: [{{ param.enumValues.join(', ') }}]
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span :class="param.required ? 'text-red-500' : 'text-green-600'">
                    {{ param.required ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="px-4 py-4 text-sm text-gray-600">
                  <p>{{ param.description }}</p>
                  <p v-if="param.defaultValue !== null" class="text-xs text-gray-500 mt-1">{{ $t('tools.components.tools.ToolDetailsModal.default') }}<code>{{ param.defaultValue }}</code>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-8 bg-gray-50 rounded-lg">
          <p class="text-gray-500">{{ $t('tools.components.tools.ToolDetailsModal.this_tool_does_not_require_any') }}</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 bg-gray-50 border-t flex justify-end items-center space-x-3">
        <button 
            @click="reloadSchema" 
            :disabled="isReloading"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-base font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isReloading" class="i-heroicons-arrow-path-20-solid w-5 h-5 animate-spin mr-2"></span>
          <span v-else class="i-heroicons-arrow-path-20-solid w-5 h-5 mr-2"></span>
          {{ isReloading ? 'Reloading...' : 'Reload Schema' }}
        </button>
        <button @click="close" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { useToasts } from '~/composables/useToasts';
import type { Tool } from '~/stores/toolManagementStore';
import { buildToolParameterDisplayRows } from './toolParameterDisplayRows';

const props = defineProps<{
  show: boolean;
  tool: Tool | null;
}>();

const emit = defineEmits<{
  close: [];
  'schema-reloaded': [tool: Tool];
}>();
const store = useToolManagementStore();
const { addToast } = useToasts();
const isReloading = ref(false);

const close = () => {
  emit('close');
};

const displayRows = computed(() =>
  buildToolParameterDisplayRows(props.tool?.argumentSchema?.parameters || []),
);

const parameterNameIndentStyle = (depth: number) => ({
  paddingLeft: `${depth * 1.25}rem`,
});

const reloadSchema = async () => {
  if (!props.tool) return;
  isReloading.value = true;
  try {
    const result = await store.reloadToolSchema(props.tool.name);
    addToast(result.message, result.success ? 'success' : 'error');
    if (result.success && result.tool) {
      emit('schema-reloaded', result.tool);
    }
  } catch (e: any) {
    addToast(`Failed to reload schema: ${e.message}`, 'error');
  } finally {
    isReloading.value = false;
  }
};
</script>
