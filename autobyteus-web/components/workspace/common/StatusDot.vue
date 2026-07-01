<template>
  <svg
    v-if="props.variant === 'transient'"
    :class="[workspaceTransientStatusDotBaseClass, dotClass]"
    viewBox="0 0 12 12"
    aria-hidden="true"
    shape-rendering="geometricPrecision"
  >
    <circle
      v-for="dot in transientRingDots"
      :key="`${dot.cx}-${dot.cy}`"
      :cx="dot.cx"
      :cy="dot.cy"
      r="0.95"
      fill="currentColor"
    />
  </svg>
  <span
    v-else
    :class="[workspaceStatusDotBaseClass, dotClass]"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  agentTransientStatusDotClass,
  agentStatusDotClass,
  teamTransientStatusDotClass,
  teamStatusDotClass,
  workspaceTransientStatusDotBaseClass,
  workspaceStatusDotBaseClass,
  type WorkspaceStatusDotVariant,
} from '~/utils/workspaceStatusDotPresentation';

const transientRingDots = [
  { cx: 6, cy: 1.95 },
  { cx: 8.85, cy: 3.15 },
  { cx: 10.05, cy: 6 },
  { cx: 8.85, cy: 8.85 },
  { cx: 6, cy: 10.05 },
  { cx: 3.15, cy: 8.85 },
  { cx: 1.95, cy: 6 },
  { cx: 3.15, cy: 3.15 },
] as const;

const props = withDefaults(defineProps<{
  kind?: 'agent' | 'team';
  status?: AgentStatus | AgentTeamStatus | string | null;
  variant?: WorkspaceStatusDotVariant;
}>(), {
  kind: 'agent',
  status: null,
  variant: 'solid',
});

const dotClass = computed(() => {
  if (props.variant === 'transient') {
    return props.kind === 'team'
      ? teamTransientStatusDotClass(props.status)
      : agentTransientStatusDotClass(props.status);
  }

  return props.kind === 'team'
    ? teamStatusDotClass(props.status)
    : agentStatusDotClass(props.status);
});
</script>
