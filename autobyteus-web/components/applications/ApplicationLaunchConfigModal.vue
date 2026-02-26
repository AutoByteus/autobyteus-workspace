<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-60 backdrop-blur-sm" @click.self="closeModal">
      <div v-if="application" class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 transform transition-all flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Launch: {{ application.name }}</h3>
          <p class="mt-1 text-sm text-gray-500">{{ application.description }}</p>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
            <div v-if="isLoading" class="flex flex-col items-center justify-center text-gray-500 py-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-3 font-semibold">Loading Configuration...</p>
            </div>
            <div v-else-if="error" class="text-red-500 bg-red-50 p-4 rounded-lg">
                <h3 class="font-bold mb-2">Error Loading Configuration</h3>
                <p>{{ error }}</p>
            </div>
            <form v-else @submit.prevent="handleLaunch" class="space-y-6">
                <h2 class="text-lg font-semibold text-gray-800 border-b pb-2">Configure Team Models</h2>
                <p class="text-sm text-gray-600 -mt-4">Your selections will be automatically saved as the default profile for this application.</p>
                
                <!-- Default Model Selector -->
                <div>
                    <label for="default-llm-select" class="block text-sm font-medium text-gray-700 mb-1">
                        Default Model (for all agents)
                    </label>
                    <SearchableGroupedSelect
                        id="default-llm-select"
                        v-model="config.globalLlmModelIdentifier"
                        :options="llmOptions"
                        :loading="llmStore.isLoadingModels"
                        placeholder="Select a default model..."
                    />
                </div>

                <!-- Per-Agent Overrides -->
                <div>
                    <h3 class="text-md font-semibold text-gray-800 border-b pb-2 mb-3">Model Overrides (Optional)</h3>
                    <div class="space-y-4">
                        <div v-for="agentName in requiredAgentNames" :key="agentName">
                            <label :for="`llm-select-${agentName}`" class="block text-sm font-medium text-gray-700 mb-1">
                                {{ agentName }}
                            </label>
                            <div class="w-full">
                                <button
                                    type="button"
                                    @click="toggleOverrideEditor(agentName)"
                                    class="w-full flex items-start justify-between text-left text-sm p-2 rounded-md transition-colors bg-gray-100 text-gray-800 hover:bg-gray-200"
                                >
                                    <span class="break-words">{{ formatLlmButtonLabel(agentName) }}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" :class="['w-4 h-4 transition-transform flex-shrink-0 ml-2', { 'rotate-180': isOverrideEditorOpen(agentName) }]">
                                        <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                                <div v-if="isOverrideEditorOpen(agentName)" class="mt-2 border rounded-md p-2 bg-white max-h-80 overflow-y-auto">
                                    <input type="text" v-model="uiState.agentLlmSearch" placeholder="Search models..." class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sticky top-0 z-10" />
                                    <div class="mt-2">
                                        <div v-if="filteredOverrideLlmOptions.length === 0" class="p-3 text-sm text-center text-gray-500">No models found.</div>
                                        <div v-for="group in filteredOverrideLlmOptions" :key="group.label" class="py-1">
                                            <div class="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ group.label }}</div>
                                            <ul>
                                            <li v-for="item in group.items" :key="item.id" @click="selectAgentLlm(agentName, item.id)" class="pl-6 pr-3 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-100">
                                                {{ item.name }}
                                            </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        
        <!-- Footer -->
        <div class="bg-gray-50 px-6 py-4 flex flex-row-reverse border-t border-gray-200">
            <button 
                type="button"
                @click="handleLaunch"
                :disabled="isLaunchDisabled"
                class="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
                <svg v-if="applicationRunStore.isLaunching" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ applicationRunStore.isLaunching ? 'Launching...' : `Launch Application` }}</span>
            </button>
            <button 
                type="button" 
                @click="closeModal"
                class="mr-3 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { ApplicationManifest } from '~/stores/applicationStore';
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import { useApplicationRunStore } from '~/stores/applicationRunStore';
import { useApplicationLaunchProfileStore } from '~/stores/applicationLaunchProfileStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import SearchableGroupedSelect, { type GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';
import type { ApplicationLaunchProfile } from '~/types/application/ApplicationLaunchProfile';

const props = defineProps<{
  show: boolean;
  application: ApplicationManifest | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', payload: { appId: string, applicationRunId: string }): void;
}>();

const DEFAULT_OPTION_ID = '---use-default---';

// STORES
const teamDefStore = useAgentTeamDefinitionStore();
const applicationRunStore = useApplicationRunStore();
const appProfileStore = useApplicationLaunchProfileStore();
const llmStore = useLLMProviderConfigStore();

// STATE
const isLoading = ref(true);
const error = ref<string | null>(null);
const teamDef = ref<AgentTeamDefinition | null>(null);
const activeProfile = ref<ApplicationLaunchProfile | null>(null);
const config = reactive({
  globalLlmModelIdentifier: '',
  memberLlmConfigOverrides: {} as Record<string, string>
});
const uiState = reactive({
  agentLlmSearch: '',
  editingAgentOverride: null as string | null,
});

// --- DATA FETCHING & INITIALIZATION ---
watch(() => props.application, async (newApp) => {
    if (newApp) {
        isLoading.value = true;
        error.value = null;
        teamDef.value = null;
        activeProfile.value = null;
        config.globalLlmModelIdentifier = '';
        config.memberLlmConfigOverrides = {};
        
        try {
            await Promise.all([
                teamDefStore.fetchAllAgentTeamDefinitions(),
                llmStore.fetchProvidersWithModels(),
                appProfileStore.loadLaunchProfiles()
            ]);

            if (newApp.type !== 'AGENT_TEAM') throw new Error(`Application '${newApp.name}' is not a team-based application.`);
            
            const foundTeamDef = teamDefStore.getAgentTeamDefinitionByName(newApp.teamDefinitionName!);
            if (!foundTeamDef) throw new Error(`Required team definition '${newApp.teamDefinitionName}' not found.`);
            teamDef.value = foundTeamDef;

            // Find the latest saved profile for this app to pre-populate selections
            const profiles = appProfileStore.getProfilesForApp(newApp.id);
            if (profiles.length > 0) {
                activeProfile.value = profiles[0];
                config.globalLlmModelIdentifier = activeProfile.value.globalLlmModelIdentifier;
                Object.assign(config.memberLlmConfigOverrides, activeProfile.value.memberLlmConfigOverrides);
            }

            // Ensure a default model is selected if not in profile
            if (!config.globalLlmModelIdentifier && llmStore.models.length > 0) {
                config.globalLlmModelIdentifier = llmStore.defaultLlmIdentifier || llmStore.models[0];
            }
        } catch (e: any) {
            error.value = e.message;
        } finally {
            isLoading.value = false;
        }
    }
}, { immediate: true });

// --- COMPUTED PROPERTIES ---
const llmOptions = computed((): GroupedOption[] => {
  return llmStore.providersWithModelsForSelection.map(p => ({
    label: p.provider,
    items: p.models.map(m => ({ id: m.modelIdentifier, name: m.modelIdentifier }))
  }));
});

const overrideLlmOptions = computed((): GroupedOption[] => {
  return [
    { label: 'Inherit from Default', items: [{ id: DEFAULT_OPTION_ID, name: `Default: ${config.globalLlmModelIdentifier || 'Not Set'}` }] },
    ...llmOptions.value
  ];
});

const filteredOverrideLlmOptions = computed(() => {
    if (!uiState.agentLlmSearch) return overrideLlmOptions.value;
    const searchLower = uiState.agentLlmSearch.toLowerCase();
    return overrideLlmOptions.value.map(group => ({
        ...group,
        items: group.items.filter(item => item.name.toLowerCase().includes(searchLower))
    })).filter(group => group.items.length > 0);
});

const requiredAgentNames = computed(() => {
  if (!teamDef.value) return [];
  return teamDef.value.nodes
    .filter(node => node.referenceType === 'AGENT')
    .map(node => node.memberName);
});

const isLaunchDisabled = computed(() => {
  return applicationRunStore.isLaunching || !teamDef.value || !config.globalLlmModelIdentifier;
});

// --- METHODS ---
function closeModal() {
    emit('close');
}

function formatLlmButtonLabel(agentName: string): string {
    const overrideModel = config.memberLlmConfigOverrides[agentName];
    if (overrideModel) {
      return overrideModel;
    }
    return `Default: ${config.globalLlmModelIdentifier || 'Not Set'}`;
}

function toggleOverrideEditor(agentName: string) {
    uiState.editingAgentOverride = uiState.editingAgentOverride === agentName ? null : agentName;
    uiState.agentLlmSearch = '';
}

function isOverrideEditorOpen(agentName: string) {
    return uiState.editingAgentOverride === agentName;
}

function selectAgentLlm(agentName: string, modelId: string) {
    if (modelId === DEFAULT_OPTION_ID) {
        delete config.memberLlmConfigOverrides[agentName];
    } else {
        config.memberLlmConfigOverrides[agentName] = modelId;
    }
    toggleOverrideEditor(agentName);
}

async function handleLaunch() {
    if (isLaunchDisabled.value || !props.application || !teamDef.value) return;

    try {
        if (activeProfile.value) {
            appProfileStore.deleteLaunchProfile(activeProfile.value.id);
        }
        
        const finalOverrides: Record<string, string> = {};
        for (const [key, value] of Object.entries(config.memberLlmConfigOverrides)) {
            if (value) {
                finalOverrides[key] = value;
            }
        }

        const result = await applicationRunStore.createProfileAndLaunchApplication({
            appId: props.application.id,
            profileName: `${props.application.name} - Default Profile`,
            teamDefinition: teamDef.value,
            globalLlmModelIdentifier: config.globalLlmModelIdentifier,
            memberLlmConfigOverrides: finalOverrides,
        });
        
        emit('success', { appId: props.application.id, applicationRunId: result.applicationRunId });

    } catch (e: any) {
        console.error("Failed to launch application:", e);
        error.value = `Launch Failed: ${e.message}`;
    }
}
</script>
