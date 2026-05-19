<template>
  <section class="space-y-2" data-testid="mobile-team-messages-detail">
    <article v-if="!activeTeamContext" class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
      Select a team run to see team messages.
    </article>
    <article v-else-if="!messages.length" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No team messages yet for the focused member.
    </article>
    <template v-else>
      <article
        v-for="message in messages.slice(0, 8)"
        :key="message.messageId"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
        data-testid="mobile-team-message-row"
      >
      <div class="flex items-start justify-between gap-3">
        <p class="font-semibold text-slate-900">{{ messageLabel(message) }}</p>
        <span class="shrink-0 text-xs text-slate-500">{{ formatTime(message.createdAt) }}</span>
      </div>
      <p class="mt-1 text-xs font-semibold text-slate-500">{{ counterpart(message) }}</p>
      <p class="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-slate-700">{{ message.content }}</p>
      <p v-if="message.referenceFiles.length" class="mt-2 text-xs font-semibold text-blue-700">
        {{ message.referenceFiles.length }} reference file{{ message.referenceFiles.length === 1 ? '' : 's' }}
      </p>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import type { TeamCommunicationPerspectiveMessage } from '~/stores/teamCommunicationTypes';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();
const teamCommunicationStore = useTeamCommunicationStore();
const activeTeamContext = computed(() => {
  if (props.context?.kind !== 'team-run') return null;
  if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return null;
  return teamContextsStore.getTeamContextById(props.context.teamRunId) ?? null;
});
const focusedMemberContext = computed(() => teamContextsStore.focusedMemberContext);
const focusedMemberNode = computed(() => teamContextsStore.focusedMemberNode);
const messages = computed(() => {
  const team = activeTeamContext.value;
  if (!team) return [];
  return teamCommunicationStore.getPerspectiveForMember(team.teamRunId, {
    memberRunId: focusedMemberContext.value?.state.runId || focusedMemberNode.value?.memberRunId || null,
    memberRouteKey: focusedMemberNode.value?.memberRouteKey || null,
    memberPath: focusedMemberNode.value?.memberPath || null,
    memberKind: focusedMemberNode.value?.memberKind || null,
  }).messages;
});

function messageLabel(message: TeamCommunicationPerspectiveMessage): string {
  const raw = (message.messageType || 'message').replace(/[_-]+/g, ' ');
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function counterpart(message: TeamCommunicationPerspectiveMessage): string {
  const name = message.counterpartMemberPath?.filter(Boolean).join(' / ')
    || message.counterpartMemberRouteKey
    || message.counterpartMemberName
    || message.counterpartRunId
    || 'teammate';
  return message.direction === 'sent' ? `To ${name}` : `From ${name}`;
}

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>
