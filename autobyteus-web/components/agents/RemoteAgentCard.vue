<template>
  <article class="group h-full rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-start">
      <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200">
        <img
          v-if="showAvatarImage"
          :src="avatarUrl"
          :alt="`${agent.name} avatar`"
          class="h-full w-full object-cover"
          @error="avatarLoadError = true"
        />
        <span v-else class="text-2xl font-semibold tracking-wide text-slate-600">{{ avatarInitials }}</span>
      </div>

      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="truncate text-2xl font-semibold text-slate-900">{{ agent.name }}</h3>
          <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">REMOTE</span>
        </div>
        <p class="mt-1 text-sm text-slate-600">{{ descriptionText }}</p>

        <div class="mt-3 space-y-2">
          <div class="flex items-start gap-2">
            <span class="min-w-[4rem] text-xs font-semibold text-slate-700">Tools {{ totalTools }}</span>
            <div class="flex min-w-0 flex-wrap gap-1.5">
              <span
                v-for="(tool, index) in visibleTools"
                :key="`${tool}-${index}`"
                class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {{ tool }}
              </span>
              <span v-if="remainingToolsCount > 0" class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                +{{ remainingToolsCount }}
              </span>
              <span v-if="totalTools === 0" class="text-xs italic text-slate-500">None</span>
            </div>
          </div>

          <div class="flex items-start gap-2">
            <span class="min-w-[4rem] text-xs font-semibold text-slate-700">Skills {{ totalSkills }}</span>
            <div class="flex min-w-0 flex-wrap gap-1.5">
              <span
                v-for="(skill, index) in visibleSkills"
                :key="`${skill}-${index}`"
                class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {{ skill }}
              </span>
              <span v-if="remainingSkillsCount > 0" class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                +{{ remainingSkillsCount }}
              </span>
              <span v-if="totalSkills === 0" class="text-xs italic text-slate-500">None</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex w-full flex-row gap-3 sm:w-auto sm:flex-col sm:items-end">
        <p v-if="disableReason" class="text-xs text-amber-700 sm:text-right">{{ disableReason }}</p>
        <span v-else class="text-xs text-slate-500">Run on home node</span>
        <button
          type="button"
          class="inline-flex min-w-[84px] justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors"
          :class="isRunnable
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed bg-slate-200 text-slate-500'"
          :disabled="!isRunnable"
          @click="$emit('run')"
        >
          {{ busy ? 'Opening...' : 'Run' }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import type { FederatedAgentRef, FederatedNodeStatus } from '~/stores/federatedCatalogStore';

const props = defineProps<{
  agent: FederatedAgentRef;
  nodeStatus: FederatedNodeStatus;
  nodeErrorMessage?: string | null;
  busy?: boolean;
}>();

defineEmits<{
  (event: 'run'): void;
}>();

const { agent } = toRefs(props);
const avatarLoadError = ref(false);

const MAX_TAG_PREVIEW = 3;

const toolNames = computed(() => agent.value.toolNames ?? []);
const skillNames = computed(() => agent.value.skillNames ?? []);

const totalTools = computed(() => toolNames.value.length);
const totalSkills = computed(() => skillNames.value.length);

const visibleTools = computed(() => toolNames.value.slice(0, MAX_TAG_PREVIEW));
const visibleSkills = computed(() => skillNames.value.slice(0, MAX_TAG_PREVIEW));

const remainingToolsCount = computed(() => Math.max(0, totalTools.value - MAX_TAG_PREVIEW));
const remainingSkillsCount = computed(() => Math.max(0, totalSkills.value - MAX_TAG_PREVIEW));

watch(() => agent.value.avatarUrl, () => {
  avatarLoadError.value = false;
});

const showAvatarImage = computed(() => Boolean(agent.value.avatarUrl) && !avatarLoadError.value);
const avatarUrl = computed(() => agent.value.avatarUrl || '');
const descriptionText = computed(() => agent.value.description?.trim() || 'No description provided.');

const avatarInitials = computed(() => {
  const raw = agent.value.name?.trim() ?? '';
  if (!raw) {
    return 'AI';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || 'AI';
});

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
