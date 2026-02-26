<template>
  <div class="space-y-4">
    <div class="flex items-center space-x-2">
      <button
        @click="handleRecordingToggle"
        :disabled="disabled || audioStore.isStopping"
        :class="[
          'flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 shadow-sm text-white min-h-[40px]',
          audioStore.isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          (disabled || audioStore.isStopping) ? 'opacity-50 cursor-not-allowed' : ''
        ]"
      >
        <svg 
          :class="{'animate-pulse': audioStore.isRecording}" 
          class="h-4 w-4 mr-2 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <span class="whitespace-nowrap">
          {{ buttonText }}
        </span>
      </button>

      <button
        v-if="audioStore.audioChunks.length > 0"
        @click="audioStore.toggleChunksVisibility()"
        :disabled="audioStore.isStopping"
        class="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{{ audioStore.showChunks ? 'Hide Chunks' : 'Show Chunks' }}</span>
        <svg
          :class="{ 'rotate-180': audioStore.showChunks }"
          class="w-4 h-4 ml-2 transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <button
        v-if="audioStore.audioChunks.length > 0"
        @click="audioStore.clearAllChunks()"
        :disabled="audioStore.isStopping"
        class="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <span>Clear All</span>
      </button>
    </div>

    <div 
      v-if="!audioStore.isRecording && audioStore.combinedError" 
      class="p-4 bg-red-50 text-red-600 rounded-md"
    >
      {{ audioStore.combinedError }}
    </div>

    <div v-if="audioStore.showChunks && audioStore.audioChunks.length > 0" class="space-y-2">
      <div class="text-sm font-medium text-gray-700">Recorded Chunks</div>
      <div class="space-y-2">
        <div
          v-for="chunk in [...audioStore.audioChunks].reverse()"
          :key="chunk.id"
          class="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm"
        >
          <div class="text-sm text-gray-600">
            {{ new Date(chunk.timestamp).toLocaleTimeString() }}
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="audioStore.downloadChunk(chunk.id)"
              :disabled="audioStore.isStopping"
              class="px-2 py-1 text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              @click="audioStore.deleteChunk(chunk.id)"
              :disabled="audioStore.isStopping"
              class="px-2 py-1 text-sm text-red-600 hover:text-red-700 focus:outline-none"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAudioStore } from '~/stores/audioStore';
import { ref, onUnmounted, computed } from 'vue';

const props = defineProps<{  disabled?: boolean
}>();

const selectionStore = useAgentSelectionStore();
const agentContextsStore = useAgentContextsStore();
const audioStore = useAudioStore();

const lastRecordingTarget = ref<{ workspaceId: string | null; agentDefinitionId: string | null }>({
  workspaceId: null,
  agentDefinitionId: null,
});

const buttonText = computed(() => {
  if (audioStore.isStopping) return 'Stopping...';
  return audioStore.isRecording ? 'Recording...' : 'Start Recording';
});

const handleRecordingToggle = async () => {
  const activeAgent = selectionStore.selectedType === 'agent' ? agentContextsStore.activeRun : null;
  const workspaceId = activeAgent?.config.workspaceId;
  const agentDefinitionId = activeAgent?.config.agentDefinitionId;

  if (!workspaceId || !agentDefinitionId) {
    alert('Select an active agent with a workspace to start recording.');
    return;
  }

  try {
    if (!audioStore.isRecording) {
      lastRecordingTarget.value = { workspaceId, agentDefinitionId };
      await audioStore.startRecording(workspaceId, agentDefinitionId);
    } else {
      await audioStore.stopRecording(workspaceId, agentDefinitionId);
    }
  } catch (error: any) {
    console.error('Recording error:', error);
  }
};

onUnmounted(async () => {
  const activeAgent = selectionStore.selectedType === 'agent' ? agentContextsStore.activeRun : null;
  const workspaceId = lastRecordingTarget.value.workspaceId || activeAgent?.config.workspaceId || null;
  const agentDefinitionId = lastRecordingTarget.value.agentDefinitionId || activeAgent?.config.agentDefinitionId || null;
  await audioStore.cleanup(workspaceId, agentDefinitionId);
});
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
