<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <!-- Header -->
    <div class="p-6 border-b flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ isEditMode ? 'Edit' : 'Add' }} MCP Server</h2>
        <p class="text-base text-gray-500 mt-1">Configure a connection to a remote tool server.</p>
      </div>
      <button @click="$emit('cancel')" class="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-base">Cancel</button>
    </div>

    <!-- Tabs -->
    <div class="px-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-6" aria-label="Tabs">
            <button v-for="tab in tabs" :key="tab.name" @click="activeTab = tab.name"
                    :class="[tab.name === activeTab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']">
                {{ tab.label }}
            </button>
        </nav>
    </div>

    <!-- Form Content -->
    <div class="p-6 space-y-6">
      <!-- Form View -->
      <div v-show="activeTab === 'form'">
        <!-- Common Fields -->
        <div>
          <label for="serverId" class="block text-base font-medium text-gray-700">Server ID</label>
          <input type="text" v-model="form.serverId" id="serverId" :disabled="isEditMode"
                class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-md disabled:bg-gray-100 p-2">
        </div>

        <div>
          <label for="transportType" class="block text-base font-medium text-gray-700">Transport Type</label>
          <select v-model="form.transportType" id="transportType"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md">
            <option>STDIO</option>
            <option>STREAMABLE_HTTP</option>
          </select>
        </div>

        <div>
          <label for="toolNamePrefix" class="block text-base font-medium text-gray-700">Tool Name Prefix (Optional)</label>
          <input type="text" v-model="form.toolNamePrefix" id="toolNamePrefix"
                class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
        </div>

        <div class="flex items-center">
          <input id="enabled" v-model="form.enabled" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
          <label for="enabled" class="ml-3 block text-base text-gray-900">Enable this server on save</label>
        </div>

        <div class="relative">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center">
            <span class="px-3 bg-white text-base text-gray-500">{{ form.transportType }} Config</span>
          </div>
        </div>
        
        <!-- STDIO Config -->
        <div v-if="form.transportType === 'STDIO'" class="space-y-4 p-4 border rounded-md bg-gray-50">
          <div>
            <label for="stdio_command" class="block text-base font-medium text-gray-700">Command</label>
            <input type="text" v-model="form.stdioConfig.command" id="stdio_command" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
          </div>
          <div>
            <label class="block text-base font-medium text-gray-700">Arguments</label>
            <div class="space-y-2 mt-1">
              <div v-for="item in argList" :key="item.id" class="flex items-center space-x-2">
                <input type="text" v-model="item.value" placeholder="Argument" class="block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
                <button @click="removeArgument(item.id)" class="p-2 text-gray-500 hover:text-red-600 rounded-full">
                  <span class="i-heroicons-trash-20-solid w-5 h-5"></span>
                </button>
              </div>
            </div>
            <button @click="addArgument" class="mt-2 inline-flex items-center px-3 py-1.5 border border-dashed border-gray-400 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <span class="i-heroicons-plus-20-solid w-5 h-5 mr-1 text-gray-500"></span>
              Add Argument
            </button>
          </div>
          <div>
            <label for="stdio_cwd" class="block text-base font-medium text-gray-700">Current Working Directory (Optional)</label>
            <input type="text" v-model="form.stdioConfig.cwd" id="stdio_cwd" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
          </div>
          <div>
            <label class="block text-base font-medium text-gray-700">Environment Variables</label>
            <div class="space-y-2 mt-1">
              <div v-for="item in envList" :key="item.id" class="flex items-center space-x-2">
                <input type="text" v-model="item.key" placeholder="KEY" class="block w-full shadow-sm text-base border-gray-300 rounded-md p-2 font-mono">
                <span class="text-gray-500">=</span>
                <input type="text" v-model="item.value" placeholder="Value" class="block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
                <button @click="removeEnvVariable(item.id)" class="p-2 text-gray-500 hover:text-red-600 rounded-full">
                  <span class="i-heroicons-trash-20-solid w-5 h-5"></span>
                </button>
              </div>
            </div>
            <button @click="addEnvVariable" class="mt-2 inline-flex items-center px-3 py-1.5 border border-dashed border-gray-400 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <span class="i-heroicons-plus-20-solid w-5 h-5 mr-1 text-gray-500"></span>
              Add Variable
            </button>
          </div>
        </div>

        <!-- HTTP Config -->
        <div v-if="form.transportType === 'STREAMABLE_HTTP'" class="space-y-4 p-4 border rounded-md bg-gray-50">
          <div>
            <label for="http_url" class="block text-base font-medium text-gray-700">URL</label>
            <input type="text" v-model="form.streamableHttpConfig.url" id="http_url" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
          </div>
          <div>
            <label for="http_token" class="block text-base font-medium text-gray-700">Token (Optional)</label>
            <input type="password" v-model="form.streamableHttpConfig.token" id="http_token" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-md p-2">
          </div>
        </div>
      </div>

      <!-- JSON View -->
       <div v-show="activeTab === 'json'">
        <div class="space-y-4">
          <div>
            <label for="json-input" class="block text-base font-medium text-gray-700">JSON Configuration</label>
            <p class="text-sm text-gray-500">Paste a standard `mcpServers` JSON object below. When applied, the first valid server config will populate the form.</p>
            <textarea 
                id="json-input"
                ref="jsonTextarea"
                v-model="jsonInput" 
                class="mt-2 font-mono block w-full shadow-sm text-sm border-gray-300 rounded-md p-2 resize-none overflow-hidden"
            ></textarea>
          </div>
          <div class="flex justify-end">
            <button @click="applyJsonToForm" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base font-semibold">Apply JSON to Form</button>
          </div>
        </div>
      </div>

      <!-- Preview Results Section -->
      <div v-if="store.getPreviewResult" class="mt-4 p-4 rounded-md" :class="store.getPreviewResult.isError ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'">
         <h4 class="font-bold">{{ store.getPreviewResult.isError ? 'Error' : 'Discovered Tools' }}</h4>
         <p v-if="store.getPreviewResult.isError" class="text-base">{{ store.getPreviewResult.message }}</p>
         <div v-else-if="store.getPreviewResult.tools.length > 0" class="space-y-3 mt-2">
            <div v-for="tool in store.getPreviewResult.tools" :key="tool.name">
                <code class="font-mono text-sm font-semibold text-green-900">{{ tool.name }}</code>
                <p class="text-sm text-gray-600 pl-2">{{ tool.description }}</p>
            </div>
         </div>
         <p v-else class="text-base">No tools were discovered for this configuration.</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="p-6 bg-gray-50 border-t flex justify-between items-center">
      <div class="flex items-center">
          <input id="sync-on-save" v-model="syncOnSave" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
          <label for="sync-on-save" class="ml-2 block text-sm text-gray-900">Discover & register tools on save</label>
      </div>

      <div class="flex items-center space-x-4">
        <button @click="runPreview" :disabled="store.getLoading" class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 text-base font-semibold">
          <span v-if="store.getLoading" class="i-heroicons-arrow-path-20-solid w-5 h-5 animate-spin mr-2"></span>
          {{ store.getLoading ? 'Checking...' : 'Preview Tools' }}
        </button>
      
        <button @click="save" :disabled="store.getLoading" class="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 text-base font-semibold">
          <span v-if="store.getLoading" class="i-heroicons-arrow-path-20-solid w-5 h-5 animate-spin mr-2"></span>
          {{ store.getLoading ? 'Saving...' : 'Save Configuration' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive, onUnmounted, nextTick } from 'vue';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import type { McpServer } from '~/stores/toolManagementStore';
import type { ToastType } from '~/composables/useToasts';

type EnvItem = { id: number; key: string; value: string };
type ArgItem = { id: number; value: string };

const props = defineProps<{
  server: McpServer | null;
}>();

const emit = defineEmits(['cancel', 'save-complete', 'show-toast']);

const store = useToolManagementStore();

const isEditMode = computed(() => !!props.server);

const createFreshForm = () => ({
  serverId: '',
  transportType: 'STDIO' as 'STDIO' | 'STREAMABLE_HTTP',
  toolNamePrefix: '',
  enabled: true,
  stdioConfig: {
    command: '',
    args: [] as string[],
    env: {} as Record<string, any>,
    cwd: '',
  },
  streamableHttpConfig: {
    url: '',
    token: '',
    headers: {},
  },
});

const form = reactive(createFreshForm());
const envList = ref<EnvItem[]>([]);
const argList = ref<ArgItem[]>([]);
const syncOnSave = ref(true);

// --- Tabs and JSON input ---
const activeTab = ref('form');
const tabs = [
    { name: 'form', label: 'Form View' },
    { name: 'json', label: 'JSON View' },
];
const jsonInput = ref('');
const jsonTextarea = ref<HTMLTextAreaElement | null>(null);

const autoResizeTextarea = () => {
  const el = jsonTextarea.value;
  if (el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
};

watch(jsonInput, () => {
  nextTick(autoResizeTextarea);
});

watch(activeTab, (newTab) => {
    if (newTab === 'json') {
        updateJsonFromForm();
    }
});

const updateJsonFromForm = () => {
    const serverId = form.serverId || 'new-server';
    const config: any = {
        transportType: form.transportType.toLowerCase(),
        enabled: form.enabled,
    };
    if (form.toolNamePrefix) {
        config.toolNamePrefix = form.toolNamePrefix;
    }

    if (form.transportType === 'STDIO') {
        Object.assign(config, {
            command: form.stdioConfig.command,
            args: form.stdioConfig.args.length > 0 ? form.stdioConfig.args : undefined,
            env: Object.keys(form.stdioConfig.env).length > 0 ? form.stdioConfig.env : undefined,
            cwd: form.stdioConfig.cwd || undefined,
        });
    } else { // STREAMABLE_HTTP
         Object.assign(config, {
            url: form.streamableHttpConfig.url,
            token: form.streamableHttpConfig.token || undefined,
         });
    }

    Object.keys(config).forEach(key => config[key] === undefined && delete config[key]);

    const output = {
        mcpServers: {
            [serverId]: config
        }
    };
    jsonInput.value = JSON.stringify(output, null, 2);
};

const syncFormFromJson = (): boolean => {
    try {
        const parsed = JSON.parse(jsonInput.value);
        if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
            throw new Error("Invalid JSON structure. Must contain a top-level 'mcpServers' object.");
        }
        
        const serverIds = Object.keys(parsed.mcpServers);
        if (serverIds.length === 0) {
            throw new Error("The 'mcpServers' object is empty.");
        }

        const serverId = serverIds[0];
        const config = parsed.mcpServers[serverId];

        Object.assign(form, createFreshForm());
        envList.value = [];
        argList.value = [];

        form.serverId = isEditMode.value ? props.server!.serverId : serverId;
        form.transportType = (config.transportType || 'stdio').toUpperCase() as 'STDIO' | 'STREAMABLE_HTTP';
        form.toolNamePrefix = config.toolNamePrefix || '';
        form.enabled = config.enabled !== false;

        if (form.transportType === 'STDIO') {
            form.stdioConfig.command = config.command || '';
            form.stdioConfig.cwd = config.cwd || '';
            form.stdioConfig.args = config.args || [];
            form.stdioConfig.env = config.env || {};
            argList.value = (config.args || []).map((arg: string) => ({ id: Date.now() + Math.random(), value: arg }));
            envList.value = Object.entries(config.env || {}).map(([key, value]) => ({
                id: Date.now() + Math.random(),
                key,
                value: String(value),
            }));
        } else { // STREAMABLE_HTTP
            form.streamableHttpConfig.url = config.url || '';
            form.streamableHttpConfig.token = config.token || '';
        }
        return true;
    } catch (e: any) {
        emit('show-toast', { message: `Error parsing JSON: ${e.message}`, type: 'error' as ToastType });
        return false;
    }
};

const applyJsonToForm = () => {
    if (syncFormFromJson()) {
        emit('show-toast', { message: 'Successfully applied JSON to form. Switching to Form View.', type: 'success' as ToastType });
        activeTab.value = 'form';
    }
};


// --- Environment Variables ---
const addEnvVariable = () => {
  envList.value.push({ id: Date.now(), key: '', value: '' });
};
const removeEnvVariable = (id: number) => {
  envList.value = envList.value.filter(item => item.id !== id);
};
watch(envList, (newList) => {
  const newEnv: Record<string, any> = {};
  newList.forEach(item => {
    if (item.key) {
      newEnv[item.key] = item.value;
    }
  });
  form.stdioConfig.env = newEnv;
}, { deep: true });

// --- Arguments ---
const addArgument = () => {
  argList.value.push({ id: Date.now(), value: '' });
};
const removeArgument = (id: number) => {
  argList.value = argList.value.filter(item => item.id !== id);
};
watch(argList, (newList) => {
  form.stdioConfig.args = newList.map(item => item.value).filter(item => item);
}, { deep: true });

// --- Lifecycle ---
const populateFormFromServer = (server: McpServer | null) => {
  store.clearPreviewResult();
  Object.assign(form, createFreshForm()); // Reset form
  envList.value = [];
  argList.value = [];

  if (server) {
    form.serverId = server.serverId;
    form.transportType = server.transportType;
    form.toolNamePrefix = server.toolNamePrefix || '';
    form.enabled = server.enabled;

    if (server.__typename === 'StdioMcpServerConfig') {
      form.stdioConfig.command = server.command || '';
      form.stdioConfig.cwd = server.cwd || '';
      form.stdioConfig.args = server.args || [];
      if (server.args) {
        argList.value = server.args.map(arg => ({ id: Date.now() + Math.random(), value: arg }));
      }
      form.stdioConfig.env = server.env || {};
      if (server.env) {
        envList.value = Object.entries(server.env).map(([key, value]) => ({
          id: Date.now() + Math.random(),
          key,
          value: String(value)
        }));
      }
    } else if (server.__typename === 'StreamableHttpMcpServerConfig') {
      form.streamableHttpConfig.url = server.url || '';
      form.streamableHttpConfig.token = server.token || '';
    }
  }
};

watch(() => props.server, (newVal) => {
    populateFormFromServer(newVal);
}, { immediate: true });


onUnmounted(() => {
    store.clearPreviewResult();
});

const buildInput = () => {
    const input: any = {
        serverId: form.serverId,
        transportType: form.transportType,
        toolNamePrefix: form.toolNamePrefix || null,
        enabled: form.enabled,
        stdioConfig: null,
        streamableHttpConfig: null,
    };
    if (form.transportType === 'STDIO') {
        input.stdioConfig = { 
          ...form.stdioConfig,
          cwd: form.stdioConfig.cwd || null,
        };
    } else if (form.transportType === 'STREAMABLE_HTTP') {
        input.streamableHttpConfig = {
          ...form.streamableHttpConfig,
          token: form.streamableHttpConfig.token || null,
        };
    }
    return input;
}

const runPreview = () => {
  if (form.serverId) {
    store.previewMcpServer(buildInput());
  } else {
    store.$patch(state => {
        state.previewResult = {
            tools: [],
            isError: true,
            message: 'Server ID is required to run a preview.'
        }
    })
  }
};

const save = async () => {
  if (activeTab.value === 'json') {
    const success = syncFormFromJson();
    if (!success) return;
  }
  
  const payload = buildInput();
  if (!payload.serverId) {
    emit('show-toast', { message: 'Cannot save: Server ID is missing.', type: 'error' as ToastType });
    return;
  }
  
  try {
    // --- SAVE ---
    await store.configureMcpServer(payload);
    emit('show-toast', { message: `Server '${payload.serverId}' saved successfully.`, type: 'success' as ToastType });
    
    // --- SYNC (if requested) ---
    if (syncOnSave.value) {
      try {
        const syncResult = await store.discoverAndRegisterMcpServerTools(payload.serverId);
        emit('show-toast', { message: syncResult.message, type: syncResult.success ? 'success' : 'error' });
      } catch (syncError: any) {
        emit('show-toast', { message: `Config saved, but tool sync failed: ${syncError.message}`, type: 'error' as ToastType });
      }
    }
    
    emit('save-complete', { serverId: payload.serverId, didSync: syncOnSave.value });

  } catch (saveError: any) {
    emit('show-toast', { message: `Failed to save server: ${saveError.message}`, type: 'error' as ToastType });
  }
};

const cancel = () => {
  emit('cancel');
};
</script>
