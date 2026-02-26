<template>
  <div class="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-start">
      <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-700">
        <img
          v-if="showAvatarImage"
          :src="avatarUrl"
          :alt="`${teamDef.name} avatar`"
          class="h-full w-full object-cover"
          @error="avatarLoadError = true"
        />
        <span v-else class="text-2xl font-semibold tracking-wide">{{ avatarInitials }}</span>
      </div>

      <div class="min-w-0">
        <h3 class="truncate text-xl font-semibold text-slate-900">{{ teamDef.name }}</h3>
        <p class="mt-1 line-clamp-2 text-sm text-slate-600">{{ descriptionText }}</p>
        <span class="mt-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {{ teamDef.role || 'No role specified' }}
        </span>
      </div>

      <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        <button
          @click.stop="$emit('sync-team', teamDef)"
          class="inline-flex min-w-[104px] justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Sync
        </button>
        <button
          @click.stop="$emit('run-team', teamDef)"
          class="inline-flex min-w-[104px] justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Run
        </button>
        <button
          @click.stop="$emit('view-details', teamDef.id)"
          class="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          View Details
          <span class="ml-1" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <div
        v-for="node in previewNodes"
        :key="`${node.memberName}-${node.referenceId}`"
        :title="`${node.memberName} (${node.referenceType})`"
        class="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
        :class="node.referenceType === 'AGENT' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-violet-200 bg-violet-50 text-violet-700'"
      >
        <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-[10px] font-semibold">{{ node.memberName.slice(0, 1).toUpperCase() }}</span>
        <span class="truncate">{{ node.memberName }}</span>
        <span
          v-if="node.referenceType === 'AGENT_TEAM'"
          class="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
        >
          TEAM
        </span>
      </div>
      <span v-if="remainingNodesCount > 0" class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
        +{{ remainingNodesCount }} more
      </span>
      <span v-if="teamNodes.length === 0" class="text-xs italic text-slate-500">No members defined</span>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:grid-cols-4">
      <div>
        <p class="font-medium text-slate-500">Coordinator</p>
        <p class="mt-0.5 truncate text-sm text-slate-800">{{ coordinatorLabel }}</p>
      </div>
      <div>
        <p class="font-medium text-slate-500">Members</p>
        <p class="mt-0.5 text-sm font-semibold text-slate-800">{{ teamNodes.length }}</p>
      </div>
      <div>
        <p class="font-medium text-slate-500">Nested Teams</p>
        <p class="mt-0.5 text-sm font-semibold text-slate-800">{{ nestedTeamCount }}</p>
      </div>
      <div>
        <p class="font-medium text-slate-500">Updated</p>
        <p class="mt-0.5 text-sm text-slate-800">{{ updatedLabel }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';

const props = defineProps<{
  teamDef: AgentTeamDefinition;
}>();

defineEmits(['view-details', 'run-team', 'sync-team']);

const { teamDef } = toRefs(props);
const avatarLoadError = ref(false);

const MAX_MEMBER_PREVIEW = 4;

const teamNodes = computed(() =>
  Array.isArray(teamDef.value.nodes) ? teamDef.value.nodes : [],
);
const previewNodes = computed(() => teamNodes.value.slice(0, MAX_MEMBER_PREVIEW));
const remainingNodesCount = computed(() => Math.max(0, teamNodes.value.length - MAX_MEMBER_PREVIEW));
const nestedTeamCount = computed(() => teamNodes.value.filter((node) => node.referenceType === 'AGENT_TEAM').length);

const avatarUrl = computed(() => (teamDef.value.avatarUrl || '').trim());
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);

watch(avatarUrl, () => {
  avatarLoadError.value = false;
});

const descriptionText = computed(() => teamDef.value.description?.trim() || 'No description provided.');

const avatarInitials = computed(() => {
  const raw = teamDef.value.name?.trim() ?? '';
  if (!raw) {
    return 'AT';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AT';
});

const coordinatorLabel = computed(() => teamDef.value.coordinatorMemberName || 'Not assigned');

const updatedLabel = computed(() => {
  const value = teamDef.value.updatedAt?.trim();
  if (!value) {
    return 'Not tracked';
  }

  const updatedDate = new Date(value);
  if (Number.isNaN(updatedDate.getTime())) {
    return 'Not tracked';
  }

  const now = Date.now();
  const diffMs = now - updatedDate.getTime();
  if (diffMs < 0) {
    return updatedDate.toLocaleDateString();
  }

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return 'Just now';
  }
  if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    return `${minutes}m ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours}h ago`;
  }
  if (diffMs < 2 * dayMs) {
    return 'Yesterday';
  }
  if (diffMs < 7 * dayMs) {
    const days = Math.floor(diffMs / dayMs);
    return `${days}d ago`;
  }

  return updatedDate.toLocaleDateString();
});
</script>
