<template>
  <div class="w-full h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 bg-white">
      <h1 class="text-xl font-semibold text-gray-800">Socratic Math Teacher</h1>
      <button 
        @click="handleReset"
        class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Start New Problem
      </button>
    </div>

    <!-- Chat Display -->
    <ChatDisplay
      :team-context="teamContext"
      :error="error"
      class="flex-grow"
    />
    
    <!-- Loading overlay -->
    <div v-if="isLoading" class="p-2 border-t border-gray-200 flex items-center text-sm text-gray-500 bg-gray-50">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        <span>The AI is thinking...</span>
    </div>

    <!-- Input Form -->
    <AppChatInput
      :is-loading="isLoading"
      v-model:problemText="problemText"
      v-model:contextFiles="contextFiles"
      @submit="handleSubmit"
      class="flex-shrink-0"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, toRef } from 'vue';
import { useApplicationRunStore } from '~/stores/applicationRunStore';
import { useApplicationContextStore } from '~/stores/applicationContextStore';
import AppChatInput from './components/AppChatInput.vue';
import ChatDisplay from './components/ChatDisplay.vue';
import type { ContextFilePath } from '~/types/conversation';
import { AgentStatus } from '~/types/agent/AgentStatus';

const props = defineProps<{
  applicationRunId: string;
}>();

const emit = defineEmits<{
  (e: 'reset'): void;
}>();

// Stores
const applicationRunStore = useApplicationRunStore();
const appContextStore = useApplicationContextStore();

// Local State
const applicationRunId = toRef(props, 'applicationRunId');

const error = ref<string | null>(null);
const problemText = ref('');
const contextFiles = ref<ContextFilePath[]>([]);

// Clean up the application run when the user navigates away or resets
onUnmounted(() => {
  if (applicationRunId.value) {
    applicationRunStore.terminateApplication(applicationRunId.value);
  }
});

// Computed properties to drive the UI
const runContext = computed(() => {
  return applicationRunId.value ? appContextStore.getRun(applicationRunId.value) : null;
});

const teamContext = computed(() => runContext.value?.teamContext || null);

const isLoading = computed(() => {
  // If there's no run context yet, we are effectively loading.
  if (!runContext.value) return true;
  // Also check if the store is in a launching state for initial message processing.
  if (applicationRunStore.isLaunching) return true;
  // Check the status of the coordinator agent for subsequent messages.
  const coordinatorStatus = teamContext.value?.members.get(teamContext.value.focusedMemberName)?.state.currentStatus;
  if (
    coordinatorStatus &&
    coordinatorStatus !== AgentStatus.Idle &&
    coordinatorStatus !== AgentStatus.Uninitialized &&
    coordinatorStatus !== AgentStatus.Error
  ) {
    return true;
  }
  return false;
});

// Methods
async function handleSubmit() {
  error.value = null;
  if (isLoading.value || !problemText.value.trim() || !applicationRunId.value) return;
  
  const payload = {
    problemText: problemText.value,
    contextFiles: contextFiles.value,
  };

  // Clear inputs immediately for better UX
  problemText.value = '';
  contextFiles.value = [];
  
  try {
    // The run is already launched by the parent. We just send a message.
    await applicationRunStore.sendMessageToApplication(
      applicationRunId.value,
      payload.problemText,
      payload.contextFiles.map(cf => ({ path: cf.path, type: cf.type.toUpperCase() }))
    );
  } catch (e: any) {
    console.error("Error during submission:", e);
    error.value = e.message || "An unknown error occurred during submission.";
    // Restore inputs on failure
    problemText.value = payload.problemText;
    contextFiles.value = payload.contextFiles;
  }
}

function handleReset() {
  // Terminate the backend run and notify the parent to reset the view.
  if (applicationRunId.value) {
    applicationRunStore.terminateApplication(applicationRunId.value);
  }
  emit('reset');
}
</script>
