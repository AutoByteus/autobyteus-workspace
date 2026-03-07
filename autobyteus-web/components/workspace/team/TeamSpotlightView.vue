<template>
  <div class="flex h-full min-h-0 flex-col gap-4 px-4 py-4 xl:flex-row">
    <div class="min-h-0 min-w-0 flex-1">
      <TeamMemberMonitorTile
        v-if="primaryEntry"
        :member-name="primaryEntry[0]"
        :member-context="primaryEntry[1]"
        :is-focused="true"
        variant="primary"
        :team-context="teamContext"
        @select="$emit('select-member', $event)"
      />
    </div>

    <div class="flex w-full shrink-0 gap-3 overflow-x-auto pb-1 xl:w-[320px] xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden xl:pb-0">
      <TeamMemberMonitorTile
        v-for="[memberName, memberContext] in secondaryEntries"
        :key="memberName"
        :member-name="memberName"
        :member-context="memberContext"
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
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

const props = defineProps<{
  teamContext: AgentTeamContext;
  focusedMemberName: string;
}>();

defineEmits<{
  (e: 'select-member', memberName: string): void;
}>();

const orderedEntries = computed<[string, AgentContext][]>(() => {
  const entries = Array.from(props.teamContext.members.entries());
  const focusedIndex = entries.findIndex(([memberName]) => memberName === props.focusedMemberName);
  if (focusedIndex <= 0) {
    return entries;
  }

  const focusedEntry = entries[focusedIndex];
  return [focusedEntry, ...entries.filter(([memberName]) => memberName !== props.focusedMemberName)];
});

const primaryEntry = computed<[string, AgentContext] | null>(() => orderedEntries.value[0] || null);
const secondaryEntries = computed<[string, AgentContext][]>(() => orderedEntries.value.slice(1));
</script>
