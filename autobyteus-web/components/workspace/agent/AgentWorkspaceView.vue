<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header Bar -->
    <div v-if="selectedAgent" class="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0">
      <div class="flex items-center space-x-3 min-w-0">
        <div class="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
          <img
            v-if="showHeaderAvatarImage"
            :src="selectedAgentAvatarUrl"
            :alt="`${selectedAgent?.config.agentDefinitionName || 'Agent'} avatar`"
            class="h-full w-full object-cover"
            @error="headerAvatarLoadError = true"
          />
          <span v-else class="text-[10px] font-semibold tracking-wide text-slate-600">
            {{ headerAvatarInitials }}
          </span>
        </div>
        <h4 class="text-base font-medium text-gray-800 truncate" :title="headerTitle">{{ headerTitle }}</h4>
        <AgentStatusDisplay v-if="selectedAgent" :status="selectedAgent.state.currentStatus" />
      </div>
      
      <div class="flex items-center space-x-2">
        <CopyButton 
          v-if="selectedAgent" 
          :text-to-copy="conversationText" 
          label="Copy full conversation"
          class="h-10 w-10 inline-flex items-center justify-center rounded-full p-0 text-gray-500 hover:bg-gray-100"
        />
        <!-- Separator removed -->
        <WorkspaceHeaderActions
          @new-agent="createNewAgent"
          @edit-config="openSelectedRunConfig"
        />
      </div>
    </div>
    
    <!-- Active Agent Content -->
    <div class="flex-grow min-h-0">
      <AgentEventMonitor
        v-if="selectedAgent"
        :conversation="selectedAgent.state.conversation"
        :agent-name="selectedAgent.config.agentDefinitionName"
        :agent-avatar-url="selectedAgent.config.agentAvatarUrl"
        class="h-full"
      />
      <div v-else class="p-4 text-center text-gray-500">
        Select an agent or start a new one.
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import CopyButton from '~/components/common/CopyButton.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';

const agentContextsStore = useAgentContextsStore();
const agentDefinitionStore = useAgentDefinitionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const selectionStore = useAgentSelectionStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const selectedAgent = computed(() => agentContextsStore.activeRun);
const headerAvatarLoadError = ref(false);

const headerTitle = computed(() => {
  if (selectedAgent.value) {
    const agentState = selectedAgent.value.state;
    const name = selectedAgent.value.config.agentDefinitionName || 'Agent';
    if (agentState.runId.startsWith('temp-')) {
      return `New - ${name}`;
    }
    const idSuffix = agentState.runId.slice(-4).toUpperCase();
    return `${name} - ${idSuffix}`;
  }
  return 'Workspace'; // A generic fallback
});

const selectedAgentAvatarUrl = computed(() => {
  const fromContext = selectedAgent.value?.config.agentAvatarUrl?.trim();
  if (fromContext) {
    return fromContext;
  }

  const definitionId = selectedAgent.value?.config.agentDefinitionId?.trim();
  if (!definitionId) {
    return '';
  }

  return agentDefinitionStore.getAgentDefinitionById(definitionId)?.avatarUrl?.trim() || '';
});
const showHeaderAvatarImage = computed(
  () => Boolean(selectedAgentAvatarUrl.value) && !headerAvatarLoadError.value
);
const headerAvatarInitials = computed(() => {
  const name = selectedAgent.value?.config.agentDefinitionName?.trim() ?? '';
  if (!name) {
    return 'AI';
  }

  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'AI'
  );
});

watch(selectedAgentAvatarUrl, () => {
  headerAvatarLoadError.value = false;
});

const conversationText = computed(() => {
  if (!selectedAgent.value) return '';
  return selectedAgent.value.state.conversation.messages
    .map(m => {
      // Changed 'Agent' to 'Assistant' to match LLM chat templates
      const role = m.type === 'user' ? 'User' : 'Assistant';
      // Ensure text exists
      const content = m.text || ''; 
      return `${role}:\n${content}`;
    })
    .join('\n\n');
});

const createNewAgent = () => {
  if (!selectedAgent.value) return;

  const template = { ...selectedAgent.value.config, isLocked: false };
  runConfigStore.setAgentConfig(template);
  teamRunConfigStore.clearConfig();
  selectionStore.clearSelection();
};

const openSelectedRunConfig = () => {
  if (!selectedAgent.value) {
    return;
  }
  workspaceCenterViewStore.showConfig();
};

onMounted(async () => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    await agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined);
  }
});
</script>
