<template>
  <article class="rounded-md border border-slate-200 bg-slate-50 p-3">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
          <img
            v-if="showAvatarImage"
            :src="avatarUrl"
            :alt="`${team.name} avatar`"
            class="h-full w-full object-cover"
            @error="avatarLoadError = true"
          />
          <span v-else>{{ teamInitials }}</span>
        </div>

        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900">{{ team.name }}</p>
          <p class="mt-1 line-clamp-2 text-xs text-slate-600">{{ team.description }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span class="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              {{ roleLabel }}
            </span>
            <span class="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              Coordinator: {{ coordinatorLabel }}
            </span>
            <span class="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              Members {{ team.memberCount }}
            </span>
            <span class="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              Nested {{ team.nestedTeamCount }}
            </span>
          </div>
        </div>
      </div>

      <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">REMOTE</span>
    </div>

    <div class="mt-3 flex items-center justify-between gap-3">
      <p v-if="disableReason" class="text-xs text-amber-700">{{ disableReason }}</p>
      <span v-else class="text-xs text-slate-500">Run on home node</span>
      <button
        type="button"
        class="inline-flex min-w-[72px] justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="isRunnable
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'cursor-not-allowed bg-slate-200 text-slate-500'"
        :disabled="!isRunnable"
        @click="$emit('run')"
      >
        {{ busy ? 'Opening...' : 'Run' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FederatedNodeStatus, FederatedTeamRef } from '~/stores/federatedCatalogStore';

const props = defineProps<{
  team: FederatedTeamRef;
  nodeStatus: FederatedNodeStatus;
  nodeErrorMessage?: string | null;
  busy?: boolean;
}>();

defineEmits<{
  (event: 'run'): void;
}>();

const avatarLoadError = ref(false);

watch(() => props.team.avatarUrl, () => {
  avatarLoadError.value = false;
});

const avatarUrl = computed(() => (props.team.avatarUrl || '').trim());
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);

const teamInitials = computed(() => {
  const raw = props.team.name?.trim() ?? '';
  if (!raw) {
    return 'AT';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AT';
});

const roleLabel = computed(() => props.team.role?.trim() || 'No role');
const coordinatorLabel = computed(() => props.team.coordinatorMemberName?.trim() || 'Unassigned');

const isRunnable = computed(() => props.nodeStatus === 'ready' && !props.busy);

const disableReason = computed(() => {
  if (props.busy) {
    return 'Preparing destination node window...';
  }
  if (props.nodeStatus !== 'ready') {
    return props.nodeErrorMessage || 'Remote node is not ready.';
  }
  return null;
});
</script>
