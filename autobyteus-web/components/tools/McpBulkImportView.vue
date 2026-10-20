<template>
  <div class="bg-white rounded-lg border p-6 h-full flex flex-col">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b">
      <div>
         <button @click="$emit('cancel')" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <span class="i-heroicons-arrow-left-20-solid w-5 h-5 mr-2 -ml-1"></span>
          Back
        </button>
      </div>
      <h1 class="text-xl font-semibold text-gray-800">{{ $t('tools.components.tools.McpBulkImportView.bulk_import_mcp_servers') }}</h1>
    </div>

    <!-- Form Content -->
    <div class="flex-grow overflow-auto pr-2 space-y-4">
      <div>
        <label for="bulk-json-input" class="block text-base font-medium text-gray-700">{{ $t('tools.components.tools.McpBulkImportView.json_configuration') }}</label>
        <p class="text-sm text-gray-500">{{ $t('tools.components.tools.McpBulkImportView.the_json_must_have_a_top') }}</p>
        <textarea 
          id="bulk-json-input"
          ref="textareaRef"
          v-model="jsonString" 
          class="mt-2 font-mono block w-full shadow-sm text-sm border-gray-300 rounded-md p-2 min-h-[40rem] resize-none overflow-hidden"
          :placeholder="placeholderJson"
        ></textarea>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="mt-6 pt-4 border-t flex justify-end gap-3">
        <button @click="$emit('cancel')" class="px-6 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-base font-semibold">
          Cancel
        </button>
        <button 
            @click="runImport" 
            :disabled="store.getLoading || !jsonString" 
            class="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 text-base font-semibold"
        >
          <span v-if="store.getLoading" class="i-heroicons-arrow-path-20-solid w-5 h-5 animate-spin mr-2"></span>
          {{ store.getLoading ? 'Importing...' : 'Import Configurations' }}
        </button>
      </div>

    <!-- Entries that were not imported -->
    <div v-if="failures.length > 0" id="bulk-import-failures" class="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p class="font-semibold">{{ t('tools.components.tools.McpBulkImportView.entries_not_imported') }}</p>
      <ul class="mt-2 space-y-1">
        <li v-for="failure in failures" :key="failure.serverId">
          <span class="font-mono font-semibold">{{ failure.serverId }}</span>: {{ failure.reason }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { type ToastType } from '~/composables/useToasts';
import { useLocalization } from '~/composables/useLocalization';

const emit = defineEmits(['cancel', 'save-complete', 'show-toast']);
const store = useToolManagementStore();
const { t } = useLocalization();

const jsonString = ref('');
const failures = ref<Array<{ serverId: string; reason: string }>>([]);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const placeholderJson = `{
  "mcpServers": {
    "my-first-server": {
      "command": "echo",
      "args": ["hello"]
    },
    "my-second-server": {
      "transportType": "streamable_http",
      "url": "http://localhost:8000/tools"
    }
  }
}`;

const autoResize = () => {
  const el = textareaRef.value;
  if (el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
};

onMounted(() => {
  nextTick(autoResize);
});

watch(jsonString, () => {
  nextTick(autoResize);
});

const runImport = async () => {
    failures.value = [];
    try {
        const result = await store.importMcpServerConfigs(jsonString.value);
        failures.value = result.failures;
        const key = 'tools.components.tools.McpBulkImportView';
        const imported = result.importedCount;
        const failed = result.failedCount;

        if (result.success) {
            emit('show-toast', { message: t(`${key}.import_succeeded`, { count: imported }), type: 'success' as ToastType });
            // The parent returns to the server list.
            emit('save-complete');
        } else if (failed === 0) {
            // The input itself was rejected (e.g. invalid JSON); the server's message says why.
            emit('show-toast', { message: result.message, type: 'error' as ToastType });
        } else if (imported > 0) {
            // Stay here so the failed entries below can be read and fixed; the list was refreshed.
            emit('show-toast', { message: t(`${key}.import_partial`, { imported, failed }), type: 'info' as ToastType });
        } else {
            emit('show-toast', { message: t(`${key}.import_none`, { failed }), type: 'error' as ToastType });
        }
    } catch (e: any) {
        emit('show-toast', { message: e.message, type: 'error' as ToastType });
    }
};
</script>
