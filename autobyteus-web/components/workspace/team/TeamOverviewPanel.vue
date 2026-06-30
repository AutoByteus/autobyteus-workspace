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
        :aria-expanded="messagesExpanded"
        @click="toggleSection('messages')"
      >
        <div class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transform text-gray-500 transition-transform duration-300"
            :class="messagesExpanded ? '' : '-rotate-90'"
            data-test="team-messages-disclosure"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <h3 class="text-xs font-bold leading-none tracking-wider text-gray-900">
            {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages') }}
          </h3>
        </div>
        <span class="text-xs font-medium text-gray-600">
          {{ messageCount }} {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages_count') }}
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

    <div
      v-if="activeTeamContext"
      class="flex flex-col transition-all duration-300 ease-in-out"
      :class="activeTasksExpanded ? 'min-h-0 flex-1' : 'flex-none'"
    >
      <TeamActiveTasksSection
        :team-context="activeTeamContext"
        :collapsed="!activeTasksExpanded"
        class="h-full"
        @toggle="toggleSection('activeTasks')"
        @select-member="focusActiveTaskMember"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import TeamCommunicationPanel from '~/components/workspace/team/TeamCommunicationPanel.vue';
import TeamActiveTasksSection from '~/components/workspace/team/TeamActiveTasksSection.vue';
import { deriveActiveTaskEntries } from '~/utils/teamActiveTaskEntries';

type TeamOverviewSection = 'messages' | 'activeTasks';

const teamContextsStore = useAgentTeamContextsStore();
const teamCommunicationStore = useTeamCommunicationStore();
const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const activeTeamRunId = computed(() => activeTeamContext.value?.teamRunId || '');
const expandedSection = ref<TeamOverviewSection | null>('messages');
const lastAutoOpenedTaskSignatureKey = ref('');
const messagesExpanded = computed(() => expandedSection.value === 'messages');
const activeTasksExpanded = computed(() => expandedSection.value === 'activeTasks');
const activeTaskEntries = computed(() => {
  const teamContext = activeTeamContext.value;
  return teamContext ? deriveActiveTaskEntries(teamContext) : [];
});
const activeTaskSignature = computed(() => activeTaskEntries.value
  .map((entry) => [
    entry.kind,
    entry.node.memberRouteKey,
    entry.taskId ?? '',
    entry.runId ?? '',
  ].join(':'))
  .sort()
  .join('|'));
const focusedMemberContext = computed(() => teamContextsStore.focusedMemberContext);
const focusedMemberNode = computed(() => teamContextsStore.focusedMemberNode);
const focusedMemberCommunicationRunId = computed(() => (
  focusedMemberContext.value?.state.runId || focusedMemberNode.value?.memberRunId || ''
));
const focusedMemberCommunicationRouteKey = computed(() => focusedMemberNode.value?.memberRouteKey || '');
const focusedMemberCommunicationPath = computed(() => focusedMemberNode.value?.memberPath || []);
const focusedMemberCommunicationKind = computed(() => focusedMemberNode.value?.memberKind || null);
const messageCount = computed(() => {
  const teamRunId = activeTeamRunId.value;
  return teamCommunicationStore.getPerspectiveForMember(teamRunId, {
    memberRunId: focusedMemberCommunicationRunId.value,
    memberRouteKey: focusedMemberCommunicationRouteKey.value,
    memberPath: focusedMemberCommunicationPath.value,
    memberKind: focusedMemberCommunicationKind.value,
  }).messages.length;
});

watch(
  [activeTeamRunId, activeTaskSignature],
  ([nextRunId, nextSignature], previousValues) => {
    const previousRunId = previousValues?.[0] ?? '';
    const runChanged = nextRunId !== previousRunId;
    const nextSignatureKey = nextRunId && nextSignature
      ? `${nextRunId}::${nextSignature}`
      : '';

    if (!nextRunId) {
      lastAutoOpenedTaskSignatureKey.value = '';
      return;
    }

    if (runChanged) {
      if (nextSignature) {
        expandedSection.value = 'activeTasks';
        lastAutoOpenedTaskSignatureKey.value = nextSignatureKey;
        return;
      }

      lastAutoOpenedTaskSignatureKey.value = '';
      expandedSection.value = 'messages';
      return;
    }

    if (nextSignature && nextSignatureKey !== lastAutoOpenedTaskSignatureKey.value) {
      expandedSection.value = 'activeTasks';
      lastAutoOpenedTaskSignatureKey.value = nextSignatureKey;
      return;
    }

    if (!nextSignature) {
      lastAutoOpenedTaskSignatureKey.value = '';
    }
  },
  { immediate: true },
);

const toggleSection = (section: TeamOverviewSection) => {
  expandedSection.value = expandedSection.value === section ? null : section;
};

const focusActiveTaskMember = async (memberRouteKey: string) => {
  const teamRunId = activeTeamContext.value?.teamRunId;
  if (!teamRunId) {
    return;
  }
  await teamContextsStore.focusMemberAndEnsureHydrated(teamRunId, memberRouteKey);
};
</script>
