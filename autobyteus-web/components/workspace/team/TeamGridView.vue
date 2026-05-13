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
          v-for="entry in displayEntries"
          :key="entry.node.memberRouteKey"
          class="min-h-0"
          :class="entry.depth > 0 ? 'ml-3 border-l-2 border-slate-100 pl-3' : ''"
          :member-node="entry.node"
          :member-context="teamContext.leafAgentContextsByRouteKey.get(entry.node.memberRouteKey) || null"
          :is-focused="entry.node.memberRouteKey === focusedMemberRouteKey"
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
import { flattenTeamMemberNodesForDisplay } from '~/utils/teamDefinitionMembers';

const props = defineProps<{
  teamContext: AgentTeamContext;
  focusedMemberRouteKey: string;
}>();

defineEmits<{
  (e: 'select-member', memberRouteKey: string): void;
}>();

const displayEntries = computed(() =>
  flattenTeamMemberNodesForDisplay(props.teamContext.memberTree),
);

const gridColumnClasses = computed(() => {
  const memberCount = displayEntries.value.length;

  if (memberCount <= 1) {
    return 'grid-cols-1';
  }

  if (memberCount === 2) {
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2';
  }

  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
});
</script>
