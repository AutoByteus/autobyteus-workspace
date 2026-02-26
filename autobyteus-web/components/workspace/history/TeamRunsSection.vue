<template>
  <section class="mt-2 rounded-md border border-gray-100">
    <button
      type="button"
      class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
      @click="$emit('toggle-teams-section')"
    >
      <Icon
        icon="heroicons:chevron-down-20-solid"
        class="mr-1.5 h-4 w-4 text-gray-400 transition-transform"
        :class="teamsSectionExpanded ? 'rotate-0' : '-rotate-90'"
      />
      <Icon icon="heroicons:user-group-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
      <span class="truncate font-semibold">Teams</span>
    </button>

    <div v-if="teamsSectionExpanded" class="ml-2 mt-0.5 space-y-1">
      <div
        v-if="teamNodes.length === 0"
        class="px-3 py-1 text-xs text-gray-400"
      >
        No team history yet.
      </div>

      <div
        v-for="teamNode in teamNodes"
        :key="teamNode.teamId"
        class="rounded-md"
      >
        <button
          type="button"
          class="group/team-row flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
          @click="$emit('toggle-team', teamNode.teamId)"
        >
          <div class="min-w-0 flex items-center">
            <Icon
              icon="heroicons:chevron-down-20-solid"
              class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
              :class="isTeamExpanded(teamNode.teamId) ? 'rotate-0' : '-rotate-90'"
            />
            <span class="truncate font-medium">{{ teamNode.teamDefinitionName }}</span>
            <span class="ml-1 text-xs text-gray-400">({{ teamNode.members.length }})</span>
          </div>
          <div class="ml-2 flex flex-shrink-0 items-center gap-1">
            <button
              v-if="teamNode.isActive"
              type="button"
              class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              title="Terminate team"
              :disabled="Boolean(terminatingTeamIds[teamNode.teamId])"
              @click.stop="$emit('terminate-team', teamNode.teamId)"
            >
              <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
            </button>
            <button
              v-if="!teamNode.isActive"
              type="button"
              class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/team-row:opacity-100 md:group-focus-within/team-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Delete team history"
              :disabled="Boolean(deletingTeamIds[teamNode.teamId])"
              @click.stop="$emit('delete-team', teamNode.teamId)"
            >
              <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
            </button>
            <span class="text-xs text-gray-400">
              {{ formatRelativeTime(teamNode.lastActivityAt) }}
            </span>
          </div>
        </button>

        <div
          v-if="isTeamExpanded(teamNode.teamId)"
          class="ml-3 space-y-0.5"
        >
          <button
            v-for="member in teamNode.members"
            :key="`${member.teamId}::${member.memberRouteKey}`"
            type="button"
            class="group/member-row flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            :class="isTeamMemberSelected(member.teamId, member.memberRouteKey)
              ? 'bg-indigo-50 text-indigo-900'
              : 'text-gray-700 hover:bg-gray-50'"
            @click="$emit('select-member', member)"
          >
            <div class="min-w-0 flex items-center">
              <span
                v-if="member.isActive"
                class="mr-2 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                :class="activeStatusClass"
              />
              <span class="truncate">{{ member.memberName }}</span>
              <span
                v-if="member.workspaceRootPath"
                class="ml-2 truncate text-xs text-gray-400"
                :title="member.workspaceRootPath"
              >
                {{ workspacePathLeafName(member.workspaceRootPath) }}
              </span>
              <span
                v-if="member.hostNodeId"
                class="ml-1 truncate text-xs text-gray-400"
              >
                @{{ member.hostNodeId }}
              </span>
            </div>
            <span class="text-xs text-gray-400">
              {{ formatRelativeTime(member.lastActivityAt) }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { workspacePathLeafName } from '~/utils/workspace/history/runTreeDisplay';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runTreeStore';

const activeStatusClass = 'bg-blue-500 animate-pulse';

const props = defineProps<{
  teamNodes: TeamTreeNode[];
  selectedTeamId: string | null;
  selectedTeamMemberRouteKey: string | null;
  teamsSectionExpanded: boolean;
  expandedTeams: Record<string, boolean>;
  terminatingTeamIds: Record<string, boolean>;
  deletingTeamIds: Record<string, boolean>;
  formatRelativeTime: (iso: string) => string;
}>();

defineEmits<{
  (e: 'toggle-teams-section'): void;
  (e: 'toggle-team', teamId: string): void;
  (e: 'select-member', member: TeamMemberTreeRow): void;
  (e: 'terminate-team', teamId: string): void;
  (e: 'delete-team', teamId: string): void;
}>();

const isTeamExpanded = (teamId: string): boolean => {
  return props.expandedTeams[teamId] ?? true;
};

const isTeamMemberSelected = (teamId: string, memberRouteKey: string): boolean => {
  return (
    props.selectedTeamId === teamId &&
    Boolean(props.selectedTeamMemberRouteKey) &&
    props.selectedTeamMemberRouteKey === memberRouteKey
  );
};
</script>
