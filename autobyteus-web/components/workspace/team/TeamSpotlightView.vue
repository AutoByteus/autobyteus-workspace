<template>
  <div class="flex h-full min-h-0 flex-col gap-4 px-4 py-4 xl:flex-row">
    <div class="min-h-0 min-w-0 flex-1">
      <TeamMemberMonitorTile
        v-if="primaryEntry"
        :member-node="primaryEntry"
        :member-context="teamContext.leafAgentContextsByRouteKey.get(primaryEntry.memberRouteKey) || null"
        :is-focused="true"
        variant="primary"
        :team-context="teamContext"
        @select="$emit('select-member', $event)"
      />
    </div>

    <div class="flex w-full shrink-0 gap-3 overflow-x-auto pb-1 xl:w-[320px] xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden xl:pb-0">
      <TeamMemberMonitorTile
        v-for="memberNode in secondaryEntries"
        :key="memberNode.memberRouteKey"
        :member-node="memberNode"
        :member-context="teamContext.leafAgentContextsByRouteKey.get(memberNode.memberRouteKey) || null"
        :is-focused="false"
        :team-context="teamContext"
        @select="$emit('select-member', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TeamMemberMonitorTile from '~/components/workspace/team/TeamMemberMonitorTile.vue';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { flattenTeamMemberNodesForDisplay } from '~/utils/teamDefinitionMembers';

const props = defineProps<{
  teamContext: AgentTeamContext;
  focusedMemberRouteKey: string;
}>();

defineEmits<{
  (e: 'select-member', memberRouteKey: string): void;
}>();

const displayEntries = computed<TeamMemberNode[]>(() =>
  flattenTeamMemberNodesForDisplay(props.teamContext.memberTree).map((entry) => entry.node),
);

const orderedEntries = computed<TeamMemberNode[]>(() => {
  const entries = [...displayEntries.value];
  const focusedIndex = entries.findIndex((memberNode) => memberNode.memberRouteKey === props.focusedMemberRouteKey);
  if (focusedIndex <= 0) {
    return entries;
  }

  const focusedEntry = entries[focusedIndex];
  return [focusedEntry, ...entries.filter((memberNode) => memberNode.memberRouteKey !== props.focusedMemberRouteKey)];
});

const primaryEntry = computed<TeamMemberNode | null>(() => orderedEntries.value[0] || null);
const secondaryEntries = computed<TeamMemberNode[]>(() => orderedEntries.value.slice(1));
</script>
