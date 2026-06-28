<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <section
      class="flex min-h-0 flex-col transition-all duration-300 ease-in-out"
      :class="messagesExpanded ? 'flex-1' : 'flex-none'"
      data-test="team-messages-section"
    >
      <button
        type="button"
        class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-test="team-messages-header"
        @click="messagesExpanded = !messagesExpanded"
      >
        <div class="flex items-center gap-2">
          <h3 class="text-xs font-bold leading-none tracking-wider text-gray-900">
            {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages') }}
          </h3>
        </div>
        <span class="flex items-center gap-2 text-xs font-medium text-gray-600">
          <span>{{ messageCount }} {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages_count') }}</span>
          <span aria-hidden="true">{{ messagesExpanded ? '▾' : '▸' }}</span>
        </span>
      </button>

      <TeamCommunicationPanel
        v-show="messagesExpanded"
        :team-run-id="activeTeamContext?.teamRunId || ''"
        :focused-member-run-id="focusedMemberCommunicationRunId"
        :focused-member-route-key="focusedMemberCommunicationRouteKey"
        :focused-member-path="focusedMemberCommunicationPath"
        :focused-member-kind="focusedMemberCommunicationKind"
        class="min-h-0 flex-1"
      />
    </section>

    <TeamActiveTasksSection
      v-if="activeTeamContext"
      :team-context="activeTeamContext"
      @select-member="focusActiveTaskMember"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import TeamCommunicationPanel from '~/components/workspace/team/TeamCommunicationPanel.vue';
import TeamActiveTasksSection from '~/components/workspace/team/TeamActiveTasksSection.vue';

const teamContextsStore = useAgentTeamContextsStore();
const teamCommunicationStore = useTeamCommunicationStore();
const messagesExpanded = ref(true);
const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const focusedMemberContext = computed(() => teamContextsStore.focusedMemberContext);
const focusedMemberNode = computed(() => teamContextsStore.focusedMemberNode);
const focusedMemberCommunicationRunId = computed(() => (
  focusedMemberContext.value?.state.runId || focusedMemberNode.value?.memberRunId || ''
));
const focusedMemberCommunicationRouteKey = computed(() => focusedMemberNode.value?.memberRouteKey || '');
const focusedMemberCommunicationPath = computed(() => focusedMemberNode.value?.memberPath || []);
const focusedMemberCommunicationKind = computed(() => focusedMemberNode.value?.memberKind || null);
const messageCount = computed(() => {
  const teamRunId = activeTeamContext.value?.teamRunId || '';
  return teamCommunicationStore.getPerspectiveForMember(teamRunId, {
    memberRunId: focusedMemberCommunicationRunId.value,
    memberRouteKey: focusedMemberCommunicationRouteKey.value,
    memberPath: focusedMemberCommunicationPath.value,
    memberKind: focusedMemberCommunicationKind.value,
  }).messages.length;
});

const focusActiveTaskMember = async (memberRouteKey: string) => {
  const teamRunId = activeTeamContext.value?.teamRunId;
  if (!teamRunId) {
    return;
  }
  await teamContextsStore.focusMemberAndEnsureHydrated(teamRunId, memberRouteKey);
};
</script>
