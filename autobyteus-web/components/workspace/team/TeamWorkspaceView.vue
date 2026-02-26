<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header Bar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center space-x-3 min-w-0">
        <div class="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
          <img
            v-if="showHeaderAvatarImage"
            :src="headerAvatarUrl"
            :alt="`${headerTitle || 'Team member'} avatar`"
            class="h-full w-full object-cover"
            @error="headerAvatarLoadError = true"
          />
          <span v-else class="text-[10px] font-semibold tracking-wide text-slate-600">
            {{ headerAvatarInitials }}
          </span>
        </div>
        <h4 v-if="activeTeamContext" class="text-base font-medium text-gray-800 truncate" :title="headerTitle">
          {{ headerTitle }}
        </h4>
        <AgentStatusDisplay v-if="activeTeamContext" :status="headerStatus" />
      </div>
      <WorkspaceHeaderActions @new-agent="createNewTeamRun" />
    </div>

    <!-- Main Content Area -->
    <div v-if="activeTeamContext" class="flex-grow min-h-0">
      <!-- The Event Monitor now takes up the full space -->
      <AgentTeamEventMonitor />
    </div>
    
    <!-- Empty state when no runs are active -->
    <div v-else class="flex-grow flex items-center justify-center p-8 text-center text-gray-500 bg-gray-50">
      <div>
        <h3 class="text-lg font-medium text-gray-900">No Active Team Runs</h3>
        <p class="mt-2 max-w-md mx-auto">
          This team profile has no running runs. Click the "New" button in the header to launch one.
        </p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentTeamEventMonitor from '~/components/workspace/team/AgentTeamEventMonitor.vue';
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue';

const teamContextsStore = useAgentTeamContextsStore();
const agentDefinitionStore = useAgentDefinitionStore();
const teamRunConfigStore = useTeamRunConfigStore();
const agentRunConfigStore = useAgentRunConfigStore();
const selectionStore = useAgentSelectionStore();
const headerAvatarLoadError = ref(false);

const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const focusedMemberContext = computed(() => {
  const team = activeTeamContext.value;
  if (!team?.focusedMemberName) {
    return null;
  }
  return team.members.get(team.focusedMemberName) ?? null;
});

const headerStatus = computed(() => {
  return focusedMemberContext.value?.state.currentStatus
    ?? activeTeamContext.value?.currentStatus
    ?? AgentStatus.Uninitialized;
});

const headerTitle = computed(() => {
  const team = activeTeamContext.value;
  if (!team) {
    return '';
  }

  const focusedMemberRouteKey = team.focusedMemberName?.trim();
  if (!focusedMemberRouteKey) {
    return team.config.teamDefinitionName || 'Team';
  }

  const focusedContext = team.members.get(focusedMemberRouteKey);
  const routeSegments = focusedMemberRouteKey
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const routeLeaf = routeSegments.length > 0
    ? routeSegments[routeSegments.length - 1]
    : focusedMemberRouteKey;

  const focusedMemberName =
    focusedContext?.config.agentDefinitionName?.trim()
    || focusedContext?.state.conversation.agentName?.trim()
    || routeLeaf
    || focusedMemberRouteKey;

  return focusedMemberName || team.config.teamDefinitionName || 'Team';
});

const headerAvatarUrl = computed(() => {
  const focusedContext = focusedMemberContext.value;
  if (!focusedContext) {
    return '';
  }

  const fromContext = focusedContext.config.agentAvatarUrl?.trim();
  if (fromContext) {
    return fromContext;
  }

  const definitionId = focusedContext.config.agentDefinitionId?.trim();
  if (definitionId) {
    const fromDefinition = agentDefinitionStore.getAgentDefinitionById(definitionId)?.avatarUrl?.trim();
    if (fromDefinition) {
      return fromDefinition;
    }
  }

  const normalizedName = headerTitle.value.trim().toLowerCase();
  if (!normalizedName) {
    return '';
  }
  return (
    agentDefinitionStore.agentDefinitions.find((definition) =>
      (definition.name || '').trim().toLowerCase() === normalizedName
    )?.avatarUrl?.trim() || ''
  );
});

const showHeaderAvatarImage = computed(() => Boolean(headerAvatarUrl.value) && !headerAvatarLoadError.value);

const headerAvatarInitials = computed(() => {
  const name = headerTitle.value.trim();
  if (!name) {
    return 'AI';
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'AI';
});

watch(headerAvatarUrl, () => {
  headerAvatarLoadError.value = false;
});

const createNewTeamRun = () => {
  if (!activeTeamContext.value) return;

  const template = JSON.parse(JSON.stringify(activeTeamContext.value.config));
  template.isLocked = false;
  teamRunConfigStore.setConfig(template);
  agentRunConfigStore.clearConfig();
  selectionStore.clearSelection();
};

onMounted(async () => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    await agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined);
  }
});
</script>
