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
        v-if="activeTeamContext"
        v-show="messagesExpanded"
        :team-context="activeTeamContext"
        :focused-agent-run-id="focusedAgentRunId"
        class="min-h-0 flex-1"
      />
    </section>

    <div
      v-if="activeTeamContext"
      class="flex flex-col transition-all duration-300 ease-in-out"
      :class="delegatedTasksExpanded ? 'min-h-0 flex-1' : 'flex-none'"
    >
      <TeamDelegatedTasksSection
        :team-context="activeTeamContext"
        :focused-agent-run-id="focusedAgentRunId"
        :collapsed="!delegatedTasksExpanded"
        class="h-full"
        @toggle="toggleSection('delegatedTasks')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import TeamCommunicationPanel from '~/components/workspace/team/TeamCommunicationPanel.vue';
import TeamDelegatedTasksSection from '~/components/workspace/team/TeamDelegatedTasksSection.vue';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';
import { projectTeamCommunicationPerspective } from '~/utils/teamCommunication/teamCommunicationPerspective';

type TeamOverviewSection = 'messages' | 'delegatedTasks';

const teamContextsStore = useAgentTeamContextsStore();
const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const activeTeamRunId = computed(() => activeTeamContext.value?.view.getRootTeamRunId() || '');
const expandedSection = ref<TeamOverviewSection | null>('messages');
const lastAutoOpenedDelegatedTaskSignatureKey = ref('');
const messagesExpanded = computed(() => expandedSection.value === 'messages');
const delegatedTasksExpanded = computed(() => expandedSection.value === 'delegatedTasks');
const focusedAgentRunId = computed(() => activeTeamContext.value?.view.getFocusedAgentRunId() ?? '');
const delegatedTaskEntries = computed(() => {
  const teamContext = activeTeamContext.value;
  return teamContext
    ? deriveDelegatedTaskEntries(
      teamContext,
      focusedAgentRunId.value,
    )
    : [];
});
const delegatedTaskSignature = computed(() => delegatedTaskEntries.value
  .map((entry) => [
    entry.entryKey,
    entry.kind,
    entry.taskId ?? '',
    entry.runId ?? '',
  ].join(':'))
  .sort()
  .join('|'));
const messageCount = computed(() => {
  const teamContext = activeTeamContext.value;
  if (!teamContext) return 0;
  return projectTeamCommunicationPerspective({
    view: teamContext.view,
    messages: teamContext.view.listCommunicationMessages(),
    focusedAgentRunId: focusedAgentRunId.value,
  }).messages.length;
});

watch(
  [activeTeamRunId, delegatedTaskSignature],
  ([nextRunId, nextSignature], previousValues) => {
    const previousRunId = previousValues?.[0] ?? '';
    const runChanged = nextRunId !== previousRunId;
    const nextSignatureKey = nextRunId && nextSignature
      ? `${nextRunId}::${nextSignature}`
      : '';

    if (!nextRunId) {
      lastAutoOpenedDelegatedTaskSignatureKey.value = '';
      return;
    }

    if (runChanged) {
      if (nextSignature) {
        expandedSection.value = 'delegatedTasks';
        lastAutoOpenedDelegatedTaskSignatureKey.value = nextSignatureKey;
        return;
      }

      lastAutoOpenedDelegatedTaskSignatureKey.value = '';
      expandedSection.value = 'messages';
      return;
    }

    if (nextSignature && nextSignatureKey !== lastAutoOpenedDelegatedTaskSignatureKey.value) {
      expandedSection.value = 'delegatedTasks';
      lastAutoOpenedDelegatedTaskSignatureKey.value = nextSignatureKey;
      return;
    }

    if (!nextSignature) {
      lastAutoOpenedDelegatedTaskSignatureKey.value = '';
    }
  },
  { immediate: true },
);

const toggleSection = (section: TeamOverviewSection) => {
  expandedSection.value = expandedSection.value === section ? null : section;
};

</script>
