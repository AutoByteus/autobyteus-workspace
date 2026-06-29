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
  agentStatusDotClass,
  teamStatusDotClass,
  workspaceStatusDotBaseClass,
} from '~/utils/workspaceStatusDotPresentation';

const props = withDefaults(defineProps<{
  kind?: 'agent' | 'team';
  status?: AgentStatus | AgentTeamStatus | string | null;
}>(), {
  kind: 'agent',
  status: null,
});

const dotClass = computed(() => (
  props.kind === 'team'
    ? teamStatusDotClass(props.status)
    : agentStatusDotClass(props.status)
));
</script>
