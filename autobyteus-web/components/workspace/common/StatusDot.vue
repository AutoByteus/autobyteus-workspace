<template>
  <svg
    v-if="props.variant === 'transient'"
    :class="[workspaceTransientStatusDotBaseClass, dotClass]"
    viewBox="0 0 12 12"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.15"
      fill="rgba(255,255,255,0.72)"
      stroke="currentColor"
      stroke-width="2.35"
      stroke-linecap="round"
      stroke-dasharray="0.2 3.25"
      vector-effect="non-scaling-stroke"
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
