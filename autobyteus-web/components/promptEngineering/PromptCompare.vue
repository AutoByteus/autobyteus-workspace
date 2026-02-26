<template>
  <div class="prompt-compare-modal" :style="compareModalStyle">
    <div class="h-full flex flex-col">
      <!-- Header with controls -->
      <div class="bg-white border-b p-4 flex justify-between items-center">
        <div class="flex items-center">
          <button
            @click="$emit('close')"
            class="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Prompts
          </button>
          <h2 class="text-xl font-semibold text-gray-800">Comparing Prompts</h2>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center">
            <span class="text-sm text-gray-600 mr-2">Display:</span>
            <div class="flex border border-gray-300 rounded-md overflow-hidden">
              <button 
                @click="viewMode = 'side-by-side'"
                class="px-3 py-1 text-sm flex items-center"
                :class="viewMode === 'side-by-side' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600'"
              >
                Side-by-side
              </button>
              <button 
                @click="viewMode = 'line-by-line'"
                class="px-3 py-1 text-sm flex items-center"
                :class="viewMode === 'line-by-line' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600'"
              >
                Line-by-line
              </button>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div>
              <select
                v-model="leftPromptId"
                class="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm"
                @change="updateDiffView()"
              >
                <option v-for="prompt in prompts" :key="`left-${prompt.id}`" :value="prompt.id">
                  {{ prompt.name }} ({{ getModelsSummary(prompt) }})
                </option>
              </select>
            </div>
            <div>
              <select
                v-model="rightPromptId"
                class="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm"
                @change="updateDiffView()"
              >
                <option v-for="prompt in prompts" :key="`right-${prompt.id}`" :value="prompt.id">
                  {{ prompt.name }} ({{ getModelsSummary(prompt) }})
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Model badges and info -->
      <div class="bg-gray-50 p-4 border-b grid grid-cols-2 gap-4">
        <div v-if="leftPrompt" class="flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900">{{ leftPrompt.name }}</h3>
            <span class="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-1">
              v{{ leftPrompt.version }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1 mb-2">
            <ModelBadge
              v-for="model in getModelList(leftPrompt)"
              :key="`left-${model}`"
              :model="model"
              size="small"
            />
          </div>
        </div>
        <div v-if="rightPrompt" class="flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900">{{ rightPrompt.name }}</h3>
            <span class="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-1">
              v{{ rightPrompt.version }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1 mb-2">
            <ModelBadge
              v-for="model in getModelList(rightPrompt)"
              :key="`right-${model}`"
              :model="model"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- Diff Viewer -->
      <div class="flex-grow relative p-6 overflow-auto">
        <!-- Side-by-side diff view -->
        <div 
          v-if="leftPrompt && rightPrompt && viewMode === 'side-by-side'"
          class="diff-container grid grid-cols-2 gap-6"
        >
          <div class="left-diff bg-white border rounded-lg p-4 whitespace-pre-wrap font-mono text-sm">
            <div v-html="leftDiffContent"></div>
          </div>
          <div class="right-diff bg-white border rounded-lg p-4 whitespace-pre-wrap font-mono text-sm">
            <div v-html="rightDiffContent"></div>
          </div>
        </div>
        
        <!-- Line-by-line diff view -->
        <div 
          v-if="leftPrompt && rightPrompt && viewMode === 'line-by-line'"
          class="diff-container bg-white border rounded-lg p-4 whitespace-pre-wrap font-mono text-sm"
        >
          <div v-html="lineByLineDiffContent"></div>
        </div>
        
        <!-- Prompt selection message -->
        <div v-else-if="!leftPrompt || !rightPrompt" class="grid place-items-center h-full bg-gray-50">
          <p class="text-gray-500">Select two prompts to compare</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { diff_match_patch } from 'diff-match-patch';
import { usePromptStore } from '~/stores/promptStore';
import ModelBadge from '~/components/promptEngineering/ModelBadge.vue';
import { useLeftPanel } from '~/composables/useLeftPanel';

const props = defineProps<{  promptIds: string[];
  promptCategory: string;
  promptName: string;
}>();

const emit = defineEmits<{  (e: 'close'): void;
}>();

const promptStore = usePromptStore();
const { isLeftPanelVisible, leftPanelWidth } = useLeftPanel();

const COLLAPSED_LEFT_PANEL_WIDTH = 50;

const compareModalStyle = computed(() => ({
  '--prompt-compare-left': `${isLeftPanelVisible.value ? leftPanelWidth.value : COLLAPSED_LEFT_PANEL_WIDTH}px`,
}));

// Local state
const leftPromptId = ref('');
const rightPromptId = ref('');
const leftPrompt = ref<any>(null);
const rightPrompt = ref<any>(null);
const viewMode = ref<'side-by-side' | 'line-by-line'>('side-by-side');

// Get all prompts with the same name and category
const prompts = computed(() => {
  return promptStore.getPrompts.filter(
    p => p.name === props.promptName && p.category === props.promptCategory
  );
});

// Diff contents for different view modes
const leftDiffContent = computed(() => {
  if (!leftPrompt.value || !rightPrompt.value) return '';
  return computeDiffHighlighting(
    leftPrompt.value.promptContent || '', 
    rightPrompt.value.promptContent || '', 
    'removal'
  );
});

const rightDiffContent = computed(() => {
  if (!leftPrompt.value || !rightPrompt.value) return '';
  return computeDiffHighlighting(
    leftPrompt.value.promptContent || '', 
    rightPrompt.value.promptContent || '', 
    'addition'
  );
});

const lineByLineDiffContent = computed(() => {
  if (!leftPrompt.value || !rightPrompt.value) return '';
  return computeLineByLineDiff(
    leftPrompt.value.promptContent || '',
    rightPrompt.value.promptContent || ''
  );
});

// Helper functions
function getModelList(prompt: any) {
  if (!prompt?.suitableForModels) return [];
  return prompt.suitableForModels.split(',').map((model: string) => model.trim());
}

function getModelsSummary(prompt: any) {
  const models = getModelList(prompt);
  if (models.length === 0) return 'No models specified';
  if (models.length === 1) return models[0];
  return `${models[0]} + ${models.length - 1} more`;
}

// Compute text differences with highlighting for side-by-side view
function computeDiffHighlighting(oldText: string, newText: string, highlightType: 'addition' | 'removal') {
  if (!oldText || !newText) return '';
  
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  
  // Convert to HTML with highlighted differences
  let html = '';
  
  for (const diff of diffs) {
    const op = diff[0];
    const text = diff[1];
    
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
    
    if (op === 0) { // No change
      html += escapedText;
    } else if (op === -1 && highlightType === 'removal') { // Removed in newer version
      html += `<span class="bg-red-100">${escapedText}</span>`;
    } else if (op === 1 && highlightType === 'addition') { // Added in newer version
      html += `<span class="bg-green-100">${escapedText}</span>`;
    } else {
      // Skip content that doesn't belong in this view (e.g., additions in the "removal" view)
      if ((op === 1 && highlightType === 'removal') || (op === -1 && highlightType === 'addition')) {
        continue;
      }
      html += escapedText;
    }
  }
  
  return html;
}

// Compute line-by-line diff for inline view
function computeLineByLineDiff(oldText: string, newText: string) {
  if (!oldText || !newText) return '';
  
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  
  // Convert to HTML with highlighted differences
  let html = '';
  
  for (const diff of diffs) {
    const op = diff[0];
    const text = diff[1];
    
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
    
    if (op === 0) { // No change
      html += escapedText;
    } else if (op === -1) { // Removed
      html += `<span class="bg-red-100">${escapedText}</span>`;
    } else if (op === 1) { // Added
      html += `<span class="bg-green-100">${escapedText}</span>`;
    }
  }
  
  return html;
}

// Update the diff view when prompts change
async function updateDiffView() {
  if (leftPromptId.value) {
    try {
      leftPrompt.value = await promptStore.fetchPromptById(leftPromptId.value);
    } catch (e) {
      console.error('Failed to load left prompt:', e);
    }
  }

  if (rightPromptId.value) {
    try {
      rightPrompt.value = await promptStore.fetchPromptById(rightPromptId.value);
    } catch (e) {
      console.error('Failed to load right prompt:', e);
    }
  }
}

// Initialize with first two prompts if available
onMounted(() => {
  if (props.promptIds.length >= 2) {
    leftPromptId.value = props.promptIds[0];
    rightPromptId.value = props.promptIds[1];
  } else if (props.promptIds.length === 1 && prompts.value.length >= 2) {
    leftPromptId.value = props.promptIds[0];
    // Find another prompt that's not the first one
    const otherPrompts = prompts.value.filter(p => p.id !== props.promptIds[0]);
    if (otherPrompts.length > 0) {
      rightPromptId.value = otherPrompts[0].id;
    }
  } else if (prompts.value.length >= 2) {
    leftPromptId.value = prompts.value[0].id;
    rightPromptId.value = prompts.value[1].id;
  }

  if (leftPromptId.value || rightPromptId.value) {
    updateDiffView();
  }
});

// Watch for changes to selected prompts or view mode
watch([leftPromptId, rightPromptId, viewMode], () => {
  updateDiffView();
});
</script>

<style>
/* Modal styling to respect layout structure */
.prompt-compare-modal {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  background-color: white;
  overflow: auto;
}

@media (min-width: 768px) {
  .prompt-compare-modal {
    left: var(--prompt-compare-left);
  }
}

/* Add proper spacing and styling for diff blocks */
.diff-container {
  margin-top: 10px;
}

.left-diff, .right-diff {
  overflow-x: auto;
  min-height: 200px;
}
</style>
