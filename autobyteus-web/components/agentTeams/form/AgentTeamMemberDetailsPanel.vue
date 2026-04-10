<template>
  <aside class="rounded-lg border border-slate-200 bg-white p-3">
    <h3 class="text-sm font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.member_details') }}</h3>
    <template v-if="selectedNode">
      <div class="mt-3 space-y-3">
        <p class="text-xs text-slate-500">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.member_names_auto_fill_from_dragged') }}</p>

        <div>
          <label class="block text-xs font-medium text-slate-600">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.member_name') }}</label>
          <input
            :value="selectedNode.memberName"
            type="text"
            class="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            @input="emitMemberName(($event.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <p class="text-xs font-medium text-slate-600">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.type') }}</p>
          <p class="mt-1 text-sm text-slate-900">{{ selectedNode.refType === 'AGENT' ? $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.typeAgent') : $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.typeTeam') }}</p>
        </div>

        <div>
          <p class="text-xs font-medium text-slate-600">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.source') }}</p>
          <p class="mt-1 text-sm text-slate-900">{{ referenceName }}</p>
        </div>

        <div v-if="selectedNode.refType === 'AGENT'">
          <p class="text-xs font-medium text-slate-600">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.scope') }}</p>
          <p class="mt-1 text-sm text-slate-900">{{ selectedNode.refScope === 'TEAM_LOCAL' ? $t('agentTeams.components.agentTeams.AgentTeamCard.teamBadge') : $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.scopeShared') }}</p>
        </div>

        <div>
          <p class="text-xs font-medium text-slate-600">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.coordinator') }}</p>
          <div
            v-if="selectedNode.refType === 'AGENT'"
            class="mt-1 inline-flex items-center gap-2 text-sm text-slate-800"
          >
            <span>{{ coordinatorEnabled ? $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.statusEnabled') : $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.statusDisabled') }}</span>
            <button
              type="button"
              role="switch"
              :aria-checked="coordinatorEnabled"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              :class="coordinatorEnabled ? 'bg-blue-600' : 'bg-slate-300'"
              @click="$emit('toggle-coordinator')"
            >
              <span class="sr-only">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.toggle_coordinator') }}</span>
              <span
                aria-hidden="true"
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="coordinatorEnabled ? 'translate-x-4' : 'translate-x-0.5'"
              />
            </button>
          </div>
          <p v-else class="mt-1 text-sm text-slate-500">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.only_agent_members_can_be_coordinator') }}</p>
        </div>
      </div>
    </template>
    <p v-else class="mt-3 text-sm text-slate-500">{{ $t('agentTeams.components.agentTeams.form.AgentTeamMemberDetailsPanel.emptyState') }}</p>

    <p v-if="coordinatorError" class="mt-2 text-xs text-red-600">{{ coordinatorError }}</p>
  </aside>
</template>

<script setup lang="ts">
import type { TeamMemberInput } from '~/stores/agentTeamDefinitionStore';

const props = defineProps<{
  coordinatorEnabled: boolean;
  coordinatorError?: string;
  referenceName: string;
  selectedNode: TeamMemberInput | null;
}>();

const emit = defineEmits<{
  'toggle-coordinator': [];
  'update-member-name': [value: string];
}>();

const emitMemberName = (value: string) => {
  if (!props.selectedNode) {
    return;
  }
  emit('update-member-name', value);
};
</script>
