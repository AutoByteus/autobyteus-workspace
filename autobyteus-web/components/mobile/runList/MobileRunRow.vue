<template>
  <!-- One row of the run list (VIS-001, 002): a top-level run or a row of its delegated work or members. The body opens
       the agent's conversation; the chevron folds. Rails left of a nested row show its group. -->
  <li
    class="relative flex items-stretch"
    :class="open ? 'bg-blue-50' : ''"
    role="treeitem"
    :aria-level="row.depth + 1"
    :aria-expanded="row.hasChildren ? row.expanded : undefined"
    :aria-current="open ? 'true' : undefined"
    :data-testid="`mobile-run-row-${row.key}`"
    data-test="mobile-run-row"
    :data-depth="row.depth"
  >
    <span v-for="level in row.depth" :key="level" class="absolute inset-y-0 w-px bg-slate-200" :style="{ left: `${railLeft(level)}px` }" aria-hidden="true" />
    <button
      type="button"
      class="flex min-w-0 flex-1 items-start gap-3 text-left active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      :class="[row.depth === 0 ? 'min-h-[4rem] py-3' : 'min-h-[3.5rem] py-2.5', row.hasChildren ? 'pr-0' : 'pr-4']"
      :style="{ paddingLeft: `${contentLeft}px` }"
      :aria-label="accessibleLabel"
      data-testid="mobile-run-open"
      @click="$emit('open', row)"
    >
      <span class="relative mt-0.5 flex-shrink-0" aria-hidden="true">
        <span
          class="flex items-center justify-center font-semibold"
          :class="[
            row.depth === 0 ? 'h-9 w-9 text-xs' : 'h-7 w-7 text-[0.6875rem]',
            row.avatar === 'org' ? 'rounded-lg bg-slate-100 text-slate-500' : row.avatar === 'team' ? 'rounded-full bg-slate-100 text-slate-500' : 'rounded-full bg-slate-200 text-slate-600',
          ]"
        >
          <Icon v-if="row.avatar === 'team'" icon="heroicons:user-group-20-solid" :class="row.depth === 0 ? 'h-5 w-5' : 'h-4 w-4'" />
          <Icon v-else-if="row.avatar === 'org'" icon="heroicons:building-office-2-20-solid" :class="row.depth === 0 ? 'h-5 w-5' : 'h-4 w-4'" />
          <template v-else>{{ initials }}</template>
        </span>
        <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2" :class="[dotClass, open ? 'ring-blue-50' : 'ring-white']" data-testid="mobile-run-status-dot" :data-status="shownStatus" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[0.9375rem] leading-5 text-slate-900" :class="row.avatar === 'agent' ? 'font-medium' : 'font-semibold'" data-testid="mobile-run-name">{{ row.name }}</span>
        <span v-if="row.title" class="block truncate text-[0.8125rem] leading-[1.125rem] text-slate-500" data-testid="mobile-run-title">{{ row.title }}</span>
        <span v-if="row.remote" class="mt-1 flex items-center gap-2" data-testid="mobile-run-remote-line">
          <RemoteNodeChip :node-name="row.remote.nodeName" />
          <span v-if="!row.remote.reachable" class="min-w-0 truncate text-xs font-medium text-red-700" data-testid="mobile-run-unreachable">Not reachable</span>
        </span>
      </span>
      <span v-if="row.depth === 0 && age" class="mt-0.5 flex-shrink-0 text-xs text-slate-400" data-testid="mobile-run-age">{{ age }}</span>
    </button>
    <button
      v-if="row.hasChildren && row.fold"
      type="button"
      class="flex h-12 w-12 flex-shrink-0 items-center justify-center self-center text-slate-400 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :class="row.depth === 0 ? '' : 'mr-1'"
      :aria-expanded="row.expanded"
      :aria-label="`${row.expanded ? 'Hide' : 'Show'} ${disclosureNoun} of ${row.name}`"
      data-testid="mobile-run-toggle"
      @click="$emit('toggle', row)"
    >
      <Icon icon="heroicons:chevron-down-20-solid" class="h-5 w-5 transition-transform" :class="row.expanded ? 'rotate-0' : '-rotate-90'" aria-hidden="true" />
    </button>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import RemoteNodeChip from '~/components/workspace/remote/RemoteNodeChip.vue';
import type { MobileRunTreeRow } from '~/utils/mobile/mobileRunTreeProjection';
import { agentStatusDotClass } from '~/utils/workspaceStatusDotPresentation';
import { mobileRunStatusLabel } from '~/utils/mobile/mobileRunStatusLabel';

const props = defineProps<{ row: MobileRunTreeRow; open: boolean; age: string }>();
defineEmits<{ (event: 'open', row: MobileRunTreeRow): void; (event: 'toggle', row: MobileRunTreeRow): void }>();

// The rail of level k sits under the avatar's center of its group's row: 34px under a top-level row, 20px deeper.
const railLeft = (level: number): number => 34 + (level - 1) * 21;
const contentLeft = computed(() => (props.row.depth === 0 ? 16 : railLeft(props.row.depth) + 9));
const unreachable = computed(() => props.row.remote?.reachable === false);
const shownStatus = computed(() => (unreachable.value ? 'error' : props.row.status));
const dotClass = computed(() => agentStatusDotClass(shownStatus.value));
const disclosureNoun = computed(() => (props.row.avatar === 'agent' ? 'delegated work' : 'members'));
const initials = computed(() => props.row.name.replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2)
  .map((word) => word[0]?.toUpperCase() ?? '').join('') || 'AI');
const accessibleLabel = computed(() => [
  props.row.name, props.row.title, props.row.remote ? `Runs on ${props.row.remote.nodeName}` : '',
  unreachable.value ? 'Not reachable' : mobileRunStatusLabel(props.row.status),
].filter(Boolean).join(', '));
</script>
