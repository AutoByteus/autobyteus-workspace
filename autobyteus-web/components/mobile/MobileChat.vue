<template>
  <section class="flex h-full flex-col" data-testid="mobile-chat">
    <AgentEventMonitor
      v-if="selectedAgentContext"
      :conversation="selectedAgentContext.state.conversation"
      :compaction-status="selectedAgentContext.state.compactionStatus"
      :agent-name="selectedAgentContext.config.agentDefinitionName"
      :agent-avatar-url="selectedAgentContext.config.agentAvatarUrl"
      class="min-h-0 flex-1"
    >
      <template #composerContext>
        <MobileComposerContextTray :context="context" />
      </template>
    </AgentEventMonitor>
    <AgentTeamEventMonitor v-else-if="selectedTeamContext" class="min-h-0 flex-1">
      <template #composerContext>
        <MobileComposerContextTray :context="context" />
      </template>
    </AgentTeamEventMonitor>
    <div v-else class="flex h-full items-center justify-center p-6 text-center">
      <div class="max-w-sm rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Chat</p>
        <h2 class="mt-2 text-xl font-bold text-slate-950">{{ emptyTitle }}</h2>
        <p class="mt-2 text-sm text-slate-600">{{ emptyDetail }}</p>
        <div class="mt-5 grid gap-2">
          <button type="button" class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
            Choose work
          </button>
          <button type="button" class="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" @click="$emit('showRuns')">
            Open Runs
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MobileComposerContextTray from '~/components/mobile/MobileComposerContextTray.vue';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';
import AgentTeamEventMonitor from '~/components/workspace/team/AgentTeamEventMonitor.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
  showRuns: [];
}>();

const selectionStore = useAgentSelectionStore();
const agentContextsStore = useAgentContextsStore();
const teamContextsStore = useAgentTeamContextsStore();

const selectedAgentContext = computed(() => {
  if (props.context?.kind !== 'agent-run') return null;
  if (selectionStore.selectedType !== 'agent' || selectionStore.selectedRunId !== props.context.runId) return null;
  return agentContextsStore.getRun(props.context.runId) ?? null;
});
const selectedTeamContext = computed(() => {
  if (props.context?.kind !== 'team-run') return null;
  if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return null;
  return teamContextsStore.getTeamContextById(props.context.teamRunId) ?? null;
});
const emptyTitle = computed(() => {
  if (!props.context) return 'Choose a run to chat';
  if (props.context.kind === 'agent-run' || props.context.kind === 'team-run') return 'Opening conversation';
  return 'Start or open a run';
});
const emptyDetail = computed(() => {
  if (!props.context) return 'Pick a recent run, agent, team, or workspace. The desktop tree is intentionally hidden on phone.';
  if (props.context.kind === 'agent-definition' || props.context.kind === 'team-definition') {
    return 'Use Runs to start a run from this profile, then return to Chat.';
  }
  if (props.context.kind === 'workspace') return 'Open a recent run or start a run in this workspace before chatting.';
  return 'The run is selected. Messages will appear here when hydration finishes.';
});
</script>
