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
      <h1 class="text-xl font-semibold text-gray-800">Bulk Import MCP Servers</h1>
    </div>

    <!-- Form Content -->
    <div class="flex-grow overflow-auto pr-2 space-y-4">
      <div>
        <label for="bulk-json-input" class="block text-base font-medium text-gray-700">JSON Configuration</label>
        <p class="text-sm text-gray-500">The JSON must have a top-level `mcpServers` key containing an object of server configurations.</p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { type ToastType } from '~/composables/useToasts';

const emit = defineEmits(['cancel', 'save-complete', 'show-toast']);
const store = useToolManagementStore();

const jsonString = ref('');
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
    try {
        const result = await store.importMcpServerConfigs(jsonString.value);
        
        let toastType: ToastType = 'error'; // Default to error
        
        // The backend now correctly sets `success` to false if any imports fail.
        // We can provide more nuanced feedback based on the counts.
        if (result.success) { // This means failed_count is 0
            toastType = 'success';
        } else {
            if (result.imported_count > 0) {
                // Partial success: some imported, some failed.
                toastType = 'info';
            } else {
                // Total failure: none imported, some failed.
                toastType = 'error';
            }
        }

        emit('show-toast', { 
            message: result.message, 
            type: toastType 
        });

        // If the operation was successful (even with 0 imports) or a partial success (some imported),
        // emit the save-complete event. The parent view is responsible for listening to this and performing navigation.
        // This ensures the user is returned to the server list on any non-failure state.
        if (result.success || result.imported_count > 0) {
            emit('save-complete');
        }
    } catch (e: any) {
        emit('show-toast', { message: e.message, type: 'error' as ToastType });
    }
};
</script>
