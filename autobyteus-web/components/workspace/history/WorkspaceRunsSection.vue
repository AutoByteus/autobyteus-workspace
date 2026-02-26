<template>
  <section
    v-for="workspaceNode in workspaceNodes"
    :key="workspaceNode.workspaceRootPath"
    class="rounded-md"
  >
    <button
      type="button"
      class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
      @click="$emit('toggle-workspace', workspaceNode.workspaceRootPath)"
    >
      <Icon
        icon="heroicons:chevron-down-20-solid"
        class="mr-1.5 h-4 w-4 text-gray-400 transition-transform"
        :class="isWorkspaceExpanded(workspaceNode.workspaceRootPath) ? 'rotate-0' : '-rotate-90'"
      />
      <Icon icon="heroicons:folder-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
      <span class="truncate">{{ workspaceNode.workspaceName }}</span>
    </button>

    <div v-if="isWorkspaceExpanded(workspaceNode.workspaceRootPath)" class="ml-2 mt-0.5 space-y-1">
      <div
        v-if="workspaceNode.agents.length === 0"
        class="px-3 py-1 text-xs text-gray-400"
      >
        No task history in this workspace.
      </div>

      <div
        v-for="agentNode in workspaceNode.agents"
        :key="agentNode.agentDefinitionId"
        class="rounded-md"
      >
        <div
          class="flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center text-left"
            @click="$emit('toggle-agent', workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
          >
            <Icon
              icon="heroicons:chevron-down-20-solid"
              class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
              :class="isAgentExpanded(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId) ? 'rotate-0' : '-rotate-90'"
            />
            <span
              class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600"
            >
              <img
                v-if="showAgentAvatar(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
                :src="agentNode.agentAvatarUrl || ''"
                :alt="`${agentNode.agentName} avatar`"
                class="h-full w-full object-cover"
                @error="$emit('avatar-error', workspaceNode.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
              >
              <span v-else>{{ agentInitials(agentNode.agentName) }}</span>
            </span>
            <span class="truncate font-medium">{{ agentNode.agentName }}</span>
            <span class="ml-1 text-xs text-gray-400">({{ agentNode.runs.length }})</span>
          </button>

          <button
            type="button"
            class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="New run with this agent"
            @click="$emit('create-run', workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
          >
            <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" />
          </button>
        </div>

        <div
          v-if="isAgentExpanded(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
          class="ml-3 space-y-0.5"
        >
          <button
            v-for="run in agentNode.runs"
            :key="run.agentId"
            type="button"
            class="group/run-row flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            :class="selectedAgentId === run.agentId
              ? 'bg-indigo-50 text-indigo-900'
              : 'text-gray-700 hover:bg-gray-50'"
            @click="$emit('select-run', run)"
          >
            <div class="min-w-0 flex items-center">
              <span
                v-if="run.isActive"
                class="mr-2 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                :class="activeStatusClass"
              />
              <span class="truncate">
                {{ run.summary || 'Untitled task' }}
              </span>
            </div>
            <div class="ml-2 flex flex-shrink-0 items-center gap-1">
              <button
                v-if="run.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                title="Terminate run"
                :disabled="Boolean(terminatingAgentIds[run.agentId])"
                @click.stop="$emit('terminate-run', run.agentId)"
              >
                <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="run.source === 'history' && !run.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="Delete run permanently"
                :disabled="Boolean(deletingAgentIds[run.agentId])"
                @click.stop="$emit('delete-run', run)"
              >
                <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
              </button>
              <span class="text-xs text-gray-400">
                {{ formatRelativeTime(run.lastActivityAt) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { agentInitials } from '~/utils/workspace/history/runTreeDisplay';
import type { RunTreeWorkspaceNode, RunTreeRow } from '~/utils/runTreeProjection';

const activeStatusClass = 'bg-blue-500 animate-pulse';

const props = defineProps<{
  workspaceNodes: RunTreeWorkspaceNode[];
  selectedAgentId: string | null;
  expandedWorkspace: Record<string, boolean>;
  expandedAgents: Record<string, boolean>;
  terminatingAgentIds: Record<string, boolean>;
  deletingAgentIds: Record<string, boolean>;
  showAgentAvatar: (
    workspaceRootPath: string,
    agentDefinitionId: string,
    avatarUrl?: string | null,
  ) => boolean;
  formatRelativeTime: (iso: string) => string;
}>();

defineEmits<{
  (e: 'toggle-workspace', workspaceRootPath: string): void;
  (e: 'toggle-agent', workspaceRootPath: string, agentDefinitionId: string): void;
  (e: 'select-run', run: RunTreeRow): void;
  (e: 'create-run', workspaceRootPath: string, agentDefinitionId: string): void;
  (e: 'terminate-run', agentId: string): void;
  (e: 'delete-run', run: RunTreeRow): void;
  (e: 'avatar-error', workspaceRootPath: string, agentDefinitionId: string, avatarUrl?: string | null): void;
}>();

const isWorkspaceExpanded = (workspaceRootPath: string): boolean => {
  return props.expandedWorkspace[workspaceRootPath] ?? true;
};

const isAgentExpanded = (workspaceRootPath: string, agentDefinitionId: string): boolean => {
  const key = `${workspaceRootPath}::${agentDefinitionId}`;
  return props.expandedAgents[key] ?? true;
};
</script>
