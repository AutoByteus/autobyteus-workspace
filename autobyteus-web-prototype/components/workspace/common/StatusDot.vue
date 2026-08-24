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
import {
  agentTransientStatusDotClass,
  agentStatusDotClass,
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
  status?: AgentStatus | string | null;
  variant?: WorkspaceStatusDotVariant;
}>(), {
  status: null,
  variant: 'solid',
});

const dotClass = computed(() => {
  if (props.variant === 'transient') {
    return agentTransientStatusDotClass(props.status);
  }
  return agentStatusDotClass(props.status);
});
</script>
