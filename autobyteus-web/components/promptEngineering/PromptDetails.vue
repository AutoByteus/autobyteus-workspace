<template>
  <div
    class="prompt-details-overlay fixed inset-y-0 right-0 bg-white z-50 overflow-auto"
    :style="detailsOverlayStyle"
  >
    <!-- Delete confirmation dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div class="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Prompt</h3>
        <p class="text-gray-700 mb-6">Are you sure you want to delete this prompt? This action cannot be undone and will remove this version permanently.</p>
        <div class="flex justify-end space-x-3">
          <button 
            @click="cancelDelete" 
            :disabled="isDeleting"
            class="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            @click="confirmDelete"
            :disabled="isDeleting"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 flex items-center"
          >
            <svg v-if="isDeleting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Header with back button and actions -->
      <div class="flex justify-between items-center mb-6">
        <button
          @click="viewStore.closePromptDetails"
          class="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Prompts
        </button>
        
        <div class="flex space-x-3">
          <!-- Edit Mode Actions -->
          <template v-if="isEditing">
            <button
              @click="cancelEditing"
              class="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="saveChanges"
              :disabled="isSaving"
              class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </template>

          <!-- View Mode Actions -->
          <template v-else-if="prompt">
            <button
              v-if="!prompt.isActive"
              @click="setActivePrompt"
              :disabled="isSaving"
              class="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              Set as Active
            </button>
             <button
              @click="startEditing"
              class="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              Edit
            </button>
            <button
              @click="duplicatePrompt"
              class="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Duplicate
            </button>
            <button
              @click="copyPrompt"
              class="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Content
            </button>
             <button
              @click="openDeleteConfirm"
              class="flex items-center px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </template>
        </div>
      </div>

      <!-- Comparison View -->
      <PromptCompare
        v-if="comparisonMode"
        :promptIds="[promptId, compareWithPromptId]"
        :promptCategory="prompt?.category || ''"
        :promptName="prompt?.name || ''"
        @close="exitComparisonMode"
      />

      <!-- Loading state -->
      <div v-else-if="loading" class="animate-pulse space-y-8">
        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        <div class="space-y-4">
          <div class="h-4 bg-gray-200 rounded w-1/4"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-red-500 text-center py-8">
        {{ error }}
      </div>

      <!-- Details content - Single container with improved layout -->
      <div v-else-if="prompt" class="bg-white rounded-lg border p-6">
        <!-- Title and metadata (not editable) -->
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div v-if="isEditing" class="grid gap-4 mb-4 md:grid-cols-2">
                  <div class="flex flex-col">
                    <label for="prompt-name-input" class="text-sm font-medium text-gray-700 mb-1">Prompt Name</label>
                    <input
                      id="prompt-name-input"
                      v-model="formData.name"
                      type="text"
                      class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div class="flex flex-col">
                    <label for="prompt-category-input" class="text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      id="prompt-category-input"
                      v-model="formData.category"
                      type="text"
                      class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <h1 v-else class="text-2xl font-bold text-gray-900 mb-2">{{ prompt.name }}</h1>
                <div class="flex items-center gap-4 mb-6">
                <span class="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {{ isEditing ? formData.category : prompt.category }}
                </span>
                <span class="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                    v{{ prompt.version }}
                </span>
                <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="prompt.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'"
                >
                    {{ prompt.isActive ? 'Active' : 'Inactive' }}
                </span>
                <span class="text-sm text-gray-500">Created {{ formatDate(prompt.createdAt) }}</span>
                </div>
            </div>
        </div>


        <!-- Model compatibility -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Compatible Models</h2>
          <div v-if="isEditing">
            <CanonicalModelSelector v-model="formData.suitableForModels" />
          </div>
          <div v-else-if="prompt.suitableForModels" class="flex flex-wrap gap-2">
            <ModelBadge
              v-for="model in modelList"
              :key="model"
              :model="model"
            />
          </div>
           <p v-else class="text-gray-500 text-sm">None specified.</p>
        </div>

        <!-- Description -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Description</h2>
          <textarea
            v-if="isEditing"
            v-model="formData.description"
            rows="4"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
          <p v-else class="text-gray-700">{{ prompt.description || 'No description provided' }}</p>
        </div>

        <!-- Prompt content -->
        <div>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Prompt Content</h2>
          <textarea
            v-if="isEditing"
            ref="promptContentTextarea"
            v-model="formData.promptContent"
            class="mt-1 block w-full flex-grow p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono resize-none overflow-y-hidden min-h-[200px]"
            @input="adjustTextareaHeight"
          ></textarea>
          <pre
            v-else
            class="whitespace-pre-wrap text-gray-700 font-mono bg-gray-50 p-4 rounded-lg border overflow-auto"
          >{{ prompt.promptContent }}</pre>
        </div>

        <!-- Version History section (replaces related prompts) -->
        <div v-if="relatedPrompts.length > 1 && !isEditing" class="mt-8 pt-6 border-t">
           <h2 class="text-lg font-semibold text-gray-900 mb-3">Version History</h2>
            <ul class="border rounded-md divide-y">
              <li 
                v-for="related in relatedPrompts" 
                :key="related.id"
                class="p-3 flex justify-between items-center"
                :class="{'bg-blue-50': related.id === prompt.id}"
              >
                <div>
                  <span class="font-medium">Version {{ related.version }}</span>
                  <span 
                    class="ml-3 px-2 py-0.5 text-xs font-medium rounded-full"
                    :class="related.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'"
                  >{{ related.isActive ? 'Active' : 'Inactive' }}</span>
                   <span class="text-sm text-gray-500 ml-4">Created on {{ formatDate(related.createdAt) }}</span>
                </div>
                <div class="flex items-center gap-2">
                   <button 
                      v-if="related.id !== prompt.id"
                      @click="compareWithPrompt(related.id)"
                      class="px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100"
                    >
                      Compare
                    </button>
                    <button 
                      v-if="related.id !== prompt.id"
                      @click="viewRelatedPrompt(related.id)"
                      class="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      View
                    </button>
                </div>
              </li>
            </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, reactive, nextTick } from 'vue';
import { usePromptStore } from '~/stores/promptStore';
import { usePromptEngineeringViewStore } from '~/stores/promptEngineeringViewStore';
import ModelBadge from '~/components/promptEngineering/ModelBadge.vue';
import PromptCompare from '~/components/promptEngineering/PromptCompare.vue';
import CanonicalModelSelector from './CanonicalModelSelector.vue';
import { formatDate } from '~/utils/dateUtils';
import { useLeftPanel } from '~/composables/useLeftPanel';

const props = defineProps<{ promptId: string }>();

const promptStore = usePromptStore();
const viewStore = usePromptEngineeringViewStore();
const { isLeftPanelVisible, leftPanelWidth } = useLeftPanel();

const COLLAPSED_LEFT_PANEL_WIDTH = 50;

const detailsOverlayStyle = computed(() => ({
  '--prompt-details-left': `${isLeftPanelVisible.value ? leftPanelWidth.value : COLLAPSED_LEFT_PANEL_WIDTH}px`,
}));

const prompt = ref<any>(null);
const loading = ref(true);
const error = ref('');
const relatedPrompts = ref<any[]>([]);
const isEditing = ref(false);
const isSaving = ref(false);
const promptContentTextarea = ref<HTMLTextAreaElement | null>(null);
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

const formData = reactive({
  name: '',
  category: '',
  description: '',
  promptContent: '',
  suitableForModels: [] as string[],
});

function adjustTextareaHeight() {
  const textarea = promptContentTextarea.value;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}

// Edit mode functions
function startEditing() {
  if (!prompt.value) return;
  formData.name = prompt.value.name || '';
  formData.category = prompt.value.category || '';
  formData.description = prompt.value.description || '';
  formData.promptContent = prompt.value.promptContent || '';
  formData.suitableForModels = modelList.value;
  isEditing.value = true;
  nextTick(() => {
    adjustTextareaHeight();
  });
}

function cancelEditing() {
  isEditing.value = false;
  // No need to reset formData, it will be repopulated on next edit
}

async function saveChanges() {
  if (!prompt.value) return;
  isSaving.value = true;
  try {
    if (!formData.name.trim() || !formData.category.trim()) {
      throw new Error('Prompt name and category are required');
    }
    const updatedPrompt = await promptStore.updatePrompt(
      prompt.value.id,
      formData.promptContent,
      formData.description,
      formData.suitableForModels.join(', '),
      undefined,
      formData.name,
      formData.category
    );
    // Update local prompt data with the response from the store
    if (updatedPrompt) {
      prompt.value = { ...prompt.value, ...updatedPrompt };
      await loadRelatedPrompts();
    }
    isEditing.value = false;
  } catch (err) {
    console.error("Failed to update prompt:", err);
    // Optionally show an error toast to the user
  } finally {
    isSaving.value = false;
  }
}

async function setActivePrompt() {
  if (!prompt.value || prompt.value.isActive) return;
  isSaving.value = true; // Use same saving flag to disable buttons
  try {
    const activatedPrompt = await promptStore.setActivePrompt(prompt.value.id);
    // After success, the store will refetch all prompts. We should also update the local view.
    if (activatedPrompt) {
      prompt.value = { ...prompt.value, isActive: true };
      await loadRelatedPrompts(); // Reload related to update their active status too
    }
  } catch (err) {
    console.error("Failed to set prompt as active:", err);
  } finally {
    isSaving.value = false;
  }
}

// Delete functions
function openDeleteConfirm() {
  showDeleteConfirm.value = true;
}

function cancelDelete() {
  showDeleteConfirm.value = false;
}

async function confirmDelete() {
  if (!prompt.value) return;
  isDeleting.value = true;
  try {
    await promptStore.deletePrompt(prompt.value.id);
    // The marketplace will show the notification from the store's deleteResult
    viewStore.showMarketplace();
  } catch (err) {
    console.error("Failed to delete prompt:", err);
    // Optionally show an error toast
  } finally {
    isDeleting.value = false;
    showDeleteConfirm.value = false;
  }
}


// Comparison mode state
const comparisonMode = ref(false);
const compareWithPromptId = ref('');

// Parse models into a list for display
const modelList = computed(() => {
  if (!prompt.value?.suitableForModels) return [];
  return prompt.value.suitableForModels.split(',').map((model: string) => model.trim()).filter(Boolean);
});

async function loadPrompt() {
  loading.value = true;
  isEditing.value = false; // Ensure we are not in edit mode when a new prompt loads
  error.value = '';
  try {
    const fetchedPrompt = await promptStore.fetchPromptById(props.promptId);
    prompt.value = fetchedPrompt; 
    if (prompt.value) {
      // If the main prompts list isn't populated, fetch it
      if (promptStore.getPrompts.length === 0) {
        await promptStore.fetchPrompts();
      }
      await loadRelatedPrompts();
    } else {
      error.value = "Prompt not found.";
    }
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadRelatedPrompts() {
  if (!prompt.value) return;
  
  try {
    const allPrompts = promptStore.getPrompts;
    relatedPrompts.value = allPrompts.filter(p => 
      p.name === prompt.value.name && 
      p.category === prompt.value.category &&
      p.suitableForModels === prompt.value.suitableForModels
    ).sort((a, b) => b.version - a.version); // Sort by version descending
  } catch (e: any) {
    console.error('Failed to load related prompts:', e);
  }
}

function copyPrompt() {
  if (prompt.value?.promptContent) {
    navigator.clipboard
      .writeText(prompt.value.promptContent)
      .then(() => {
        // Simple toast notification
        const element = document.createElement('div');
        element.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        element.textContent = 'Prompt content copied to clipboard!';
        document.body.appendChild(element);
        
        setTimeout(() => {
          element.remove();
        }, 2000);
      })
      .catch((err) => console.error('Failed to copy prompt:', err));
  }
}

function duplicatePrompt() {
  if (!prompt.value) return;
  viewStore.duplicateDraft(prompt.value);
}

function viewRelatedPrompt(promptId: string) {
  viewStore.showPromptDetails(promptId);
}

function compareWithPrompt(promptId: string) {
  compareWithPromptId.value = promptId;
  comparisonMode.value = true;
}

function exitComparisonMode() {
  comparisonMode.value = false;
  compareWithPromptId.value = '';
}

watch(
  () => props.promptId,
  () => {
    loadPrompt();
    comparisonMode.value = false;
    compareWithPromptId.value = '';
  },
  { immediate: true },
);
</script>

<style scoped>
.prompt-details-overlay {
  left: 0;
}

@media (min-width: 768px) {
  .prompt-details-overlay {
    left: var(--prompt-details-left);
  }
}
</style>
