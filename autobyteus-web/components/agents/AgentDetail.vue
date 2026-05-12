<template>
  <div class="flex-1 overflow-auto p-8">
    <div class="max-w-6xl mx-auto">
      <button
        type="button"
        @click="goBackToList"
        class="mb-5 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg class="mr-2 h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z"
            clip-rule="evenodd"
          />
        </svg>{{ backButtonLabel }}</button>

      <div v-if="viewState === 'loading'" class="text-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">{{ isDeleting ? $t('agents.components.agents.AgentDetail.loadingDeleting') : $t('agents.components.agents.AgentDetail.loadingDetails') }}</p>
      </div>

      <div v-else-if="viewState === 'not-found'" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        <h3 class="font-bold">{{ $t('agents.components.agents.AgentDetail.agent_not_found') }}</h3>
        <p>{{ $t('agents.components.agents.AgentDetail.the_agent_definition_with_the_specified') }}</p>
        <button @click="goBackToList" class="text-indigo-600 hover:underline mt-2 inline-block">{{ backButtonLabel }}</button>
      </div>

      <div v-else-if="agentDef" class="bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <div class="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-8">
          <aside class="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-5 space-y-5">
            <div class="mx-auto h-48 w-48 overflow-hidden rounded-3xl bg-slate-100 flex items-center justify-center shadow-sm">
              <img
                v-if="showAvatarImage"
                :src="avatarUrl"
                :alt="$t('agents.components.agents.AgentDetail.avatarAlt', { name: agentDef.name })"
                class="h-full w-full object-cover"
                @error="avatarLoadError = true"
              />
              <span v-else class="text-6xl font-semibold tracking-wide text-slate-600">{{ avatarInitials }}</span>
            </div>

              <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900">{{ agentDef.name }}</h1>
              <p v-if="agentDef.role" class="text-sm text-indigo-700 font-medium mt-1">{{ agentDef.role }}</p>
              <p v-if="teamLabel" class="text-sm text-gray-500 mt-1">{{ $t('agents.components.agents.AgentDetail.teamLabel', { team: teamLabel }) }}</p>
              <p v-if="applicationLabel" class="text-sm text-gray-500 mt-1">{{ $t('agents.components.agents.AgentDetail.applicationLabel', { application: applicationLabel }) }}</p>
              <div v-if="ownershipBadge" class="mt-2 flex justify-center">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  :class="isApplicationOwned ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'"
                >
                  {{ ownershipBadge }}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-center">
              <div class="rounded-lg border border-indigo-100 bg-white px-3 py-2">
                <p class="text-xs uppercase tracking-wide text-gray-500">{{ $t('agents.components.agents.AgentDetail.toolsLabel') }}</p>
                <p class="text-lg font-semibold text-gray-900">{{ agentDef.toolNames.length }}</p>
              </div>
              <div class="rounded-lg border border-indigo-100 bg-white px-3 py-2">
                <p class="text-xs uppercase tracking-wide text-gray-500">{{ $t('agents.components.agents.AgentDetail.skillsLabel') }}</p>
                <p class="text-lg font-semibold text-gray-900">{{ agentDef.skillNames.length }}</p>
              </div>
            </div>

            <div class="space-y-2 pt-2">
              <button @click="selectAgentToRun(agentDef)" class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center">
                <span class="block i-heroicons-play-20-solid w-5 h-5 mr-2"></span>{{ $t('agents.components.agents.AgentDetail.run_agent') }}</button>
              <button @click="$emit('navigate', { view: 'edit', id: agentDef.id })" class="w-full px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center">
                <span class="block i-heroicons-pencil-square-20-solid w-5 h-5 mr-2"></span>
                {{ $t('agents.components.agents.AgentDetail.edit') }}
              </button>
              <AgentDuplicateButton
                v-if="isShared"
                :agent-id="agentDef.id"
                :default-name="agentDef.name"
                @duplicated="handleDuplicated"
              />
              <button v-if="isShared" @click="handleDelete(agentDef.id)" class="w-full px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-md hover:bg-red-100 transition-colors flex items-center justify-center">
                <span class="block i-heroicons-trash-20-solid w-5 h-5 mr-2"></span>
                {{ $t('agents.components.agents.AgentDetail.delete') }}
              </button>
            </div>
          </aside>

          <AgentDefinitionDetailSections :agent-def="agentDef" />
        </div>
      </div>
    </div>

    <AgentDeleteConfirmDialog
      :show="showDeleteConfirm"
      :item-name="agentDef ? agentDef.name : ''"
      :item-type="$t('agents.components.agents.AgentDetail.deleteItemType')"
      :title="$t('agents.components.agents.AgentDetail.delete_agent_definition')"
      :confirm-text="$t('agents.components.agents.AgentDetail.delete_definition')"
      @confirm="onDeleteConfirmed"
      @cancel="onDeleteCanceled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, toRefs, watch } from 'vue';
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore';
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue';
import AgentDuplicateButton from '~/components/agents/AgentDuplicateButton.vue';
import AgentDefinitionDetailSections from '~/components/agents/AgentDefinitionDetailSections.vue';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useLocalization } from '~/composables/useLocalization';
import { formatApplicationOwnershipLabel } from '~/utils/definitionOwnership';

const props = defineProps<{
  agentDefinitionId: string;
  returnToTeamId?: string;
}>();
const { agentDefinitionId, returnToTeamId } = toRefs(props);

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const runConfigStore = useAgentRunConfigStore();
const selectionStore = useAgentSelectionStore();
const { t: $t } = useLocalization();
const agentDef = computed<AgentDefinition | null>(() => agentDefinitionStore.getAgentDefinitionById(agentDefinitionId.value) ?? null);
const loading = ref(false);
const avatarLoadError = ref(false);

const showDeleteConfirm = ref(false);
const agentDefinitionIdToDelete = ref<string | null>(null);
const isDeleting = ref(false);
const viewState = computed(() => {
  if (loading.value || isDeleting.value) return 'loading';
  if (!agentDef.value) return 'not-found';
  return 'ready';
});
const backButtonLabel = computed(() => (returnToTeamId.value
  ? $t('agents.components.agents.AgentDetail.back_to_team')
  : $t('agents.components.agents.AgentDetail.back_to_agents')));

const avatarUrl = computed(() => agentDef.value?.avatarUrl || '');
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);
const ownershipScope = computed(() => agentDef.value?.ownershipScope ?? 'SHARED');
const isShared = computed(() => ownershipScope.value === 'SHARED');
const isTeamLocal = computed(() => ownershipScope.value === 'TEAM_LOCAL');
const isApplicationOwned = computed(() => ownershipScope.value === 'APPLICATION_OWNED');
const teamLabel = computed(() => {
  if (!isTeamLocal.value) {
    return '';
  }
  return agentDef.value?.ownerTeamName?.trim()
    || agentDef.value?.ownerTeamId?.trim()
    || '';
});
const applicationLabel = computed(() => {
  if (!agentDef.value || (!agentDef.value.ownerApplicationId && !agentDef.value.ownerApplicationName)) {
    return '';
  }
  return formatApplicationOwnershipLabel(agentDef.value);
});
const ownershipBadge = computed(() => {
  if (isTeamLocal.value) {
    return $t('agents.components.agents.AgentDetail.ownership.teamLocal');
  }
  if (isApplicationOwned.value) {
    return $t('agents.components.agents.AgentDetail.ownership.applicationOwned');
  }
  return '';
});
const avatarInitials = computed(() => {
  const raw = agentDef.value?.name?.trim() || '';
  if (!raw) {
    return 'AI';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map(part => part[0]?.toUpperCase() || '').join('');
  return initials || 'AI';
});

watch(avatarUrl, () => {
  avatarLoadError.value = false;
});

onMounted(async () => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    loading.value = true;
    await agentDefinitionStore.fetchAllAgentDefinitions();
    loading.value = false;
  }
});

const selectAgentToRun = (agentDef: AgentDefinition) => {
  runConfigStore.setTemplate(agentDef);
  selectionStore.clearSelection();
  navigateTo('/workspace');
};

const handleDelete = (id: string) => {
  agentDefinitionIdToDelete.value = id;
  showDeleteConfirm.value = true;
};

const onDeleteConfirmed = async () => {
  const idToDelete = agentDefinitionIdToDelete.value;
  if (!idToDelete) {
    return;
  }

  onDeleteCanceled();
  isDeleting.value = true;

  try {
    const result = await agentDefinitionStore.deleteAgentDefinition(idToDelete);
    if (result?.success) {
      emit('navigate', { view: 'list' });
      return;
    }
  } catch (error) {
    console.error('Failed to delete agent definition:', error);
  }

  isDeleting.value = false;
};

const onDeleteCanceled = () => {
  showDeleteConfirm.value = false;
  agentDefinitionIdToDelete.value = null;
};

const goBackToList = () => {
  if (returnToTeamId.value) {
    emit('navigate', { target: 'agent-team', view: 'team-detail', id: returnToTeamId.value });
    return;
  }
  emit('navigate', { view: 'list' });
};

const handleDuplicated = (duplicatedId: string) => {
  emit('navigate', { view: 'edit', id: duplicatedId });
};
</script>
