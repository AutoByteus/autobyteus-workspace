<template>
  <span
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
