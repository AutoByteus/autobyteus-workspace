<template>
  <div
    data-test="team-grid-view"
    class="flex h-full min-h-0 flex-col overflow-hidden px-4 py-4"
  >
    <div
      data-test="team-grid-scroll-region"
      class="min-h-0 flex-1 overflow-y-auto pr-1"
    >
      <div
        data-test="team-grid-layout"
        class="grid h-full auto-rows-[minmax(420px,1fr)] gap-4"
        :class="gridColumnClasses"
      >
        <TeamMemberMonitorTile
          v-for="[memberName, memberContext] in teamContext.members"
          :key="memberName"
          class="min-h-0"
          :member-name="memberName"
          :member-context="memberContext"
          :is-focused="memberName === focusedMemberName"
          :team-context="teamContext"
          @select="$emit('select-member', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TeamMemberMonitorTile from '~/components/workspace/team/TeamMemberMonitorTile.vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

const props = defineProps<{
  teamContext: AgentTeamContext;
  focusedMemberName: string;
}>();

defineEmits<{
  (e: 'select-member', memberName: string): void;
}>();

const gridColumnClasses = computed(() => {
  const memberCount = props.teamContext.members.size;

  if (memberCount <= 1) {
    return 'grid-cols-1';
  }

  if (memberCount === 2) {
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2';
  }

  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
});
</script>
