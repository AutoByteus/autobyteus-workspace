<template>
  <div class="rounded-lg border border-violet-100 bg-violet-50/40 p-4" data-test="team-local-agent-member-details">
    <div class="mb-4 flex flex-col gap-3 border-b border-violet-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
            {{ $t('agents.components.agents.AgentDetail.ownership.teamLocal') }}
          </span>
          <span
            v-if="isCoordinator"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
          >
            {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.badgeCoordinator') }}
          </span>
        </div>
        <h3 class="mt-2 text-lg font-semibold text-slate-900">{{ agentDef.name }}</h3>
        <p v-if="agentDef.role" class="mt-1 text-sm font-medium text-violet-700">{{ agentDef.role }}</p>
        <p class="mt-1 text-xs text-slate-500">
          {{ $t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.memberContext', { member: memberName }) }}
        </p>
        <p v-if="teamName" class="mt-1 text-xs text-slate-500">
          {{ $t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.teamContext', { team: teamName }) }}
        </p>
        <p v-if="applicationLabel" class="mt-1 text-xs text-slate-500">
          {{ $t('agents.components.agents.AgentDetail.applicationLabel', { application: applicationLabel }) }}
        </p>
      </div>

      <button
        v-if="!isEditing"
        type="button"
        class="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50"
        data-test="team-local-edit-button"
        @click="startEdit"
      >
        {{ $t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.edit') }}
      </button>
    </div>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-test="team-local-edit-error">
      {{ errorMessage }}
    </div>

    <AgentDefinitionForm
      v-if="isEditing"
      :initial-data="agentDef"
      :is-create-mode="false"
      :is-submitting="isSaving"
      :submit-button-text="$t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.saveMemberAgent')"
      variant="embedded"
      data-test="team-local-agent-form"
      @submit="handleSubmit"
      @cancel="cancelEdit"
    />

    <AgentDefinitionDetailSections
      v-else
      :agent-def="agentDef"
      variant="embedded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AgentDefinitionDetailSections from '~/components/agents/AgentDefinitionDetailSections.vue';
import AgentDefinitionForm from '~/components/agents/AgentDefinitionForm.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentDefinitionStore, type AgentDefinition, type UpdateAgentDefinitionInput } from '~/stores/agentDefinitionStore';
import { formatApplicationOwnershipLabel } from '~/utils/definitionOwnership';

const props = defineProps<{
  agentDef: AgentDefinition;
  memberName: string;
  isCoordinator: boolean;
  teamName?: string;
}>();

const emit = defineEmits<{
  saved: [payload: { agentId: string; message: string }];
  error: [payload: { agentId: string; message: string }];
}>();

const agentDefinitionStore = useAgentDefinitionStore();
const { t: $t } = useLocalization();
const isEditing = ref(false);
const isSaving = ref(false);
const errorMessage = ref<string | null>(null);
const applicationLabel = computed(() => (
  props.agentDef.ownerApplicationId || props.agentDef.ownerApplicationName || props.agentDef.ownerPackageId
    ? formatApplicationOwnershipLabel(props.agentDef)
    : ''
));

type AgentDefinitionFormPayload = Omit<UpdateAgentDefinitionInput, 'id'>;

const startEdit = () => {
  errorMessage.value = null;
  isEditing.value = true;
};

const cancelEdit = () => {
  errorMessage.value = null;
  isEditing.value = false;
};

const handleSubmit = async (formData: AgentDefinitionFormPayload) => {
  isSaving.value = true;
  errorMessage.value = null;
  try {
    const updatedDefinition = await agentDefinitionStore.updateAgentDefinition({
      id: props.agentDef.id,
      ...formData,
    });
    if (!updatedDefinition) {
      throw new Error($t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.updateFailedEmpty'));
    }
    isEditing.value = false;
    emit('saved', {
      agentId: props.agentDef.id,
      message: $t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.updateSuccess', { name: updatedDefinition.name }),
    });
  } catch (error: any) {
    const message = error?.message || $t('agentTeams.components.agentTeams.TeamLocalAgentMemberDetails.updateFailed');
    errorMessage.value = message;
    emit('error', {
      agentId: props.agentDef.id,
      message,
    });
  } finally {
    isSaving.value = false;
  }
};
</script>
