<template>
  <div class="flex h-full flex-col bg-white">
    <div class="flex items-center justify-between border-t border-gray-200 px-3 py-2">
      <h3 class="text-sm font-semibold text-gray-700">Workspaces</h3>
      <button
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        title="Add workspace"
        @click="onCreateWorkspace"
      >
        <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" />
      </button>
    </div>

    <form
      v-if="showCreateWorkspaceInline"
      class="border-t border-gray-100 px-3 py-2"
      data-test="create-workspace-form"
      @submit.prevent="confirmCreateWorkspace"
    >
      <div class="space-y-2">
        <input
          id="workspace-path-input"
          ref="workspacePathInputRef"
          v-model="workspacePathDraft"
          data-test="workspace-path-input"
          type="text"
          class="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
          :class="workspacePathError ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : ''"
          placeholder="/Users/you/project"
          :disabled="creatingWorkspace"
          @keydown.enter.prevent="confirmCreateWorkspace"
          @keydown.esc.prevent="closeCreateWorkspaceInput"
        >
        <p v-if="workspacePathError" class="text-xs text-red-600">
          {{ workspacePathError }}
        </p>
        <div class="flex items-center justify-end gap-2">
          <button
            data-test="cancel-create-workspace"
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creatingWorkspace"
            @click="closeCreateWorkspaceInput"
          >
            Cancel
          </button>
          <button
            data-test="confirm-create-workspace"
            type="submit"
            class="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creatingWorkspace"
          >
            {{ creatingWorkspace ? 'Adding...' : 'Add' }}
          </button>
        </div>
      </div>
    </form>

    <div class="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
      <div v-if="runHistoryStore.loading" class="px-3 py-4 text-xs text-gray-500">
        Loading task history...
      </div>

      <div v-else-if="runHistoryStore.error" class="px-3 py-4 text-xs text-red-600">
        {{ runHistoryStore.error }}
      </div>

      <div
        v-else-if="workspaceNodes.length === 0"
        class="px-3 py-4 text-xs text-gray-500"
      >
        No run history yet.
      </div>

      <div v-else class="space-y-1">
        <section
          v-for="workspaceNode in workspaceNodes"
          :key="workspaceNode.workspaceRootPath"
          class="rounded-md"
        >
          <button
            type="button"
            class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            @click="toggleWorkspace(workspaceNode.workspaceRootPath)"
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
              v-if="workspaceNode.agents.length === 0 && workspaceTeams(workspaceNode.workspaceRootPath).length === 0"
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
                  @click="toggleAgent(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
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
                      @error="onAgentAvatarError(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
                    >
                    <span v-else>{{ getAgentInitials(agentNode.agentName) }}</span>
                  </span>
                  <span class="truncate font-medium">{{ agentNode.agentName }}</span>
                  <span class="ml-1 text-xs text-gray-400">({{ agentNode.runs.length }})</span>
                </button>

                <button
                  type="button"
                  class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  title="New run with this agent"
                  @click="onCreateRun(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
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
                  :key="run.runId"
                  type="button"
                  class="group/run-row flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                  :class="selectedRunId === run.runId
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'text-gray-700 hover:bg-gray-50'"
                  @click="onSelectRun(run)"
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
                      :disabled="Boolean(terminatingRunIds[run.runId])"
                      @click.stop="onTerminateRun(run.runId)"
                    >
                      <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
                    </button>
                    <button
                      v-if="run.source === 'history' && !run.isActive"
                      type="button"
                      class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Delete run permanently"
                      :disabled="Boolean(deletingRunIds[run.runId])"
                      @click.stop="onDeleteRun(run)"
                    >
                      <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
                    </button>
                    <span class="text-xs text-gray-400">
                      {{ runHistoryStore.formatRelativeTime(run.lastActivityAt) }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div
              v-if="workspaceTeams(workspaceNode.workspaceRootPath).length > 0"
              class="mt-1 space-y-0.5"
            >
              <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Teams
              </div>
              <div
                v-for="team in workspaceTeams(workspaceNode.workspaceRootPath)"
                :key="team.teamRunId"
                class="rounded-md"
              >
                <div class="group/team-row flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center text-left"
                    :data-test="`workspace-team-row-${team.teamRunId}`"
                    @click="onSelectTeam(team.teamRunId)"
                  >
                    <Icon
                      icon="heroicons:chevron-down-20-solid"
                      class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
                      :class="isTeamExpanded(team.teamRunId) ? 'rotate-0' : '-rotate-90'"
                    />
                    <span
                      class="mr-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                      :class="teamStatusClass(team.currentStatus)"
                    />
                    <span
                      class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600"
                    >
                      <img
                        v-if="showTeamAvatar(team)"
                        :src="getTeamAvatarUrl(team)"
                        :alt="`${team.teamDefinitionName} avatar`"
                        class="h-full w-full object-cover"
                        @error="onTeamAvatarError(team)"
                      >
                      <span v-else>{{ getTeamInitials(team.teamDefinitionName) }}</span>
                    </span>
                    <span class="truncate font-medium">{{ team.teamDefinitionName }}</span>
                    <span class="ml-1 text-xs text-gray-400">({{ team.members.length }})</span>
                  </button>

                  <button
                    v-if="canTerminateTeam(team.currentStatus)"
                    type="button"
                    class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Terminate team"
                    :disabled="Boolean(terminatingTeamIds[team.teamRunId])"
                    @click.stop="onTerminateTeam(team.teamRunId)"
                  >
                    <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-else-if="team.deleteLifecycle === 'READY'"
                    type="button"
                    class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/team-row:opacity-100 md:group-focus-within/team-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Delete team history permanently"
                    :disabled="Boolean(deletingTeamIds[team.teamRunId])"
                    @click.stop="onDeleteTeam(team)"
                  >
                    <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
                  </button>
                </div>

                <div v-if="isTeamExpanded(team.teamRunId)" class="ml-3 space-y-0.5">
                  <button
                    v-for="member in team.members"
                    :key="member.memberRouteKey"
                    type="button"
                    class="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors"
                    :class="member.memberRouteKey === team.focusedMemberName ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
                    :data-test="`workspace-team-member-${team.teamRunId}-${member.memberRouteKey}`"
                    @click="onSelectTeamMember(member)"
                  >
                    <div class="flex min-w-0 items-center">
                      <span
                        class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[9px] font-semibold text-gray-600"
                      >
                        <img
                          v-if="showTeamMemberAvatar(member)"
                          :src="getTeamMemberAvatarUrl(member)"
                          :alt="`${getTeamMemberDisplayName(member)} avatar`"
                          class="h-full w-full object-cover"
                          @error="onTeamMemberAvatarError(member)"
                        >
                        <span v-else>{{ getTeamMemberInitials(member) }}</span>
                      </span>
                      <span class="truncate">{{ getTeamMemberDisplayName(member) }}</span>
                    </div>
                    <span class="ml-2 text-xs text-gray-400">
                      {{ runHistoryStore.formatRelativeTime(team.lastActivityAt) }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <ConfirmationModal
      :show="showDeleteConfirmation"
      title=""
      message="Delete this history permanently. This cannot be undone."
      confirm-button-text="Delete"
      variant="danger"
      typography-size="large"
      @confirm="confirmDeleteRun"
      @cancel="closeDeleteConfirmation"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import ConfirmationModal from '~/components/common/ConfirmationModal.vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useToasts } from '~/composables/useToasts';
import { pickFolderPath } from '~/composables/useNativeFolderDialog';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryStore';

const emit = defineEmits<{
  (e: 'run-selected', payload: { type: 'agent'; runId: string }): void;
  (e: 'run-selected', payload: { type: 'team'; runId: string }): void;
  (e: 'run-created', payload: { type: 'agent'; definitionId: string }): void;
}>();

const runHistoryStore = useRunHistoryStore();
const workspaceStore = useWorkspaceStore();
const selectionStore = useAgentSelectionStore();
const agentRunStore = useAgentRunStore();
const teamRunStore = useAgentTeamRunStore();
const agentDefinitionStore = useAgentDefinitionStore();
const agentTeamDefinitionStore = useAgentTeamDefinitionStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore);
const { addToast } = useToasts();

const expandedWorkspace = ref<Record<string, boolean>>({});
const expandedAgents = ref<Record<string, boolean>>({});
const expandedTeams = ref<Record<string, boolean>>({});
const terminatingRunIds = ref<Record<string, boolean>>({});
const terminatingTeamIds = ref<Record<string, boolean>>({});
const deletingRunIds = ref<Record<string, boolean>>({});
const deletingTeamIds = ref<Record<string, boolean>>({});
const showCreateWorkspaceInline = ref(false);
const workspacePathDraft = ref('');
const workspacePathError = ref('');
const creatingWorkspace = ref(false);
const workspacePathInputRef = ref<HTMLInputElement | null>(null);
const showDeleteConfirmation = ref(false);
const pendingDeleteRunId = ref<string | null>(null);
const pendingDeleteTeamId = ref<string | null>(null);
const brokenAvatarByAgentKey = ref<Record<string, boolean>>({});
const brokenAvatarByTeamKey = ref<Record<string, boolean>>({});
const brokenAvatarByTeamMemberKey = ref<Record<string, boolean>>({});
const activeStatusClass = 'bg-blue-500 animate-pulse';

const normalizeRootPath = (value: string | null | undefined): string => {
  const source = (value || '').trim();
  if (!source) {
    return '';
  }
  const normalized = source.replace(/\\/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/+$/, '');
};

const workspaceNodes = computed(() => {
  return runHistoryStore.getTreeNodes();
});

const selectedRunId = computed(() => {
  if (selectionStore.selectedType === 'agent' && selectionStore.selectedRunId) {
    return selectionStore.selectedRunId;
  }
  return runHistoryStore.selectedRunId;
});

const selectedTeamRunId = computed(() => {
  if (selectionStore.selectedType === 'team' && selectionStore.selectedRunId) {
    return selectionStore.selectedRunId;
  }
  return null;
});

const workspaceTeams = (workspaceRootPath: string): TeamTreeNode[] => {
  const key = normalizeRootPath(workspaceRootPath);
  if (!key) {
    return [];
  }
  return runHistoryStore.getTeamNodes(key);
};

const isTeamExpanded = (teamRunId: string): boolean => {
  if (selectedTeamRunId.value === teamRunId) {
    return true;
  }
  return expandedTeams.value[teamRunId] ?? false;
};

const toggleTeam = (teamRunId: string): void => {
  const next = !isTeamExpanded(teamRunId);
  expandedTeams.value = {
    ...expandedTeams.value,
    [teamRunId]: next,
  };
};

const teamStatusClass = (status: AgentTeamStatus): string => {
  switch (status) {
    case AgentTeamStatus.Processing:
      return 'bg-blue-500 animate-pulse';
    case AgentTeamStatus.Idle:
      return 'bg-green-500';
    case AgentTeamStatus.Bootstrapping:
      return 'bg-purple-500 animate-pulse';
    case AgentTeamStatus.Error:
      return 'bg-red-500';
    case AgentTeamStatus.ShutdownComplete:
      return 'bg-gray-400';
    default:
      return 'bg-gray-300';
  }
};

const canTerminateTeam = (status: AgentTeamStatus): boolean => {
  return status !== AgentTeamStatus.ShutdownComplete && status !== AgentTeamStatus.Uninitialized;
};

const getAgentNodeKey = (workspaceRootPath: string, agentDefinitionId: string): string => {
  return `${workspaceRootPath}::${agentDefinitionId}`;
};

const getAgentAvatarKey = (
  workspaceRootPath: string,
  agentDefinitionId: string,
  avatarUrl?: string | null,
): string => {
  return `${getAgentNodeKey(workspaceRootPath, agentDefinitionId)}::${(avatarUrl || '').trim()}`;
};

const getAgentInitials = (agentName: string): string => {
  const tokens = (agentName || 'Agent')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return 'AG';
  }
  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

const teamAvatarByDefinitionId = computed(() => {
  const next: Record<string, string> = {};
  for (const definition of agentTeamDefinitionStore.agentTeamDefinitions) {
    const key = (definition.id || '').trim();
    const avatarUrl = (definition.avatarUrl || '').trim();
    if (key && avatarUrl && !next[key]) {
      next[key] = avatarUrl;
    }
  }
  return next;
});

const memberAvatarByName = computed(() => {
  const next: Record<string, string> = {};
  for (const definition of agentDefinitionStore.agentDefinitions) {
    const key = (definition.name || '').trim().toLowerCase();
    const avatarUrl = (definition.avatarUrl || '').trim();
    if (key && avatarUrl && !next[key]) {
      next[key] = avatarUrl;
    }
  }
  return next;
});

const getTeamInitials = (teamName: string): string => getAgentInitials(teamName || 'Team');

const getTeamAvatarUrl = (team: TeamTreeNode): string => {
  return teamAvatarByDefinitionId.value[(team.teamDefinitionId || '').trim()] || '';
};

const getTeamAvatarKey = (team: TeamTreeNode, avatarUrl: string): string => {
  return `${team.teamRunId}::${avatarUrl.trim()}`;
};

const showTeamAvatar = (team: TeamTreeNode): boolean => {
  const avatarUrl = getTeamAvatarUrl(team);
  if (!avatarUrl) {
    return false;
  }
  const key = getTeamAvatarKey(team, avatarUrl);
  return !brokenAvatarByTeamKey.value[key];
};

const onTeamAvatarError = (team: TeamTreeNode): void => {
  const avatarUrl = getTeamAvatarUrl(team);
  if (!avatarUrl) {
    return;
  }
  const key = getTeamAvatarKey(team, avatarUrl);
  brokenAvatarByTeamKey.value = {
    ...brokenAvatarByTeamKey.value,
    [key]: true,
  };
};

const getTeamMemberDisplayName = (member: TeamMemberTreeRow): string => {
  return toTeamMemberDisplayName(member);
};

const getTeamMemberInitials = (member: TeamMemberTreeRow): string => {
  return getAgentInitials(getTeamMemberDisplayName(member));
};

const getTeamMemberAvatarUrl = (member: TeamMemberTreeRow): string => {
  const memberNameKey = getTeamMemberDisplayName(member).trim().toLowerCase();
  return memberAvatarByName.value[memberNameKey] || '';
};

const getTeamMemberAvatarKey = (member: TeamMemberTreeRow, avatarUrl: string): string => {
  return `${member.teamRunId}::${member.memberRouteKey}::${avatarUrl.trim()}`;
};

const showTeamMemberAvatar = (member: TeamMemberTreeRow): boolean => {
  const avatarUrl = getTeamMemberAvatarUrl(member);
  if (!avatarUrl) {
    return false;
  }
  const key = getTeamMemberAvatarKey(member, avatarUrl);
  return !brokenAvatarByTeamMemberKey.value[key];
};

const onTeamMemberAvatarError = (member: TeamMemberTreeRow): void => {
  const avatarUrl = getTeamMemberAvatarUrl(member);
  if (!avatarUrl) {
    return;
  }
  const key = getTeamMemberAvatarKey(member, avatarUrl);
  brokenAvatarByTeamMemberKey.value = {
    ...brokenAvatarByTeamMemberKey.value,
    [key]: true,
  };
};

const showAgentAvatar = (
  workspaceRootPath: string,
  agentDefinitionId: string,
  avatarUrl?: string | null,
): boolean => {
  const key = getAgentAvatarKey(workspaceRootPath, agentDefinitionId, avatarUrl);
  return Boolean((avatarUrl || '').trim()) && !brokenAvatarByAgentKey.value[key];
};

const onAgentAvatarError = (
  workspaceRootPath: string,
  agentDefinitionId: string,
  avatarUrl?: string | null,
): void => {
  const key = getAgentAvatarKey(workspaceRootPath, agentDefinitionId, avatarUrl);
  brokenAvatarByAgentKey.value = {
    ...brokenAvatarByAgentKey.value,
    [key]: true,
  };
};

watch(
  () => runHistoryStore.loading,
  (loading, previousLoading) => {
    if (previousLoading && !loading) {
      brokenAvatarByAgentKey.value = {};
      brokenAvatarByTeamKey.value = {};
      brokenAvatarByTeamMemberKey.value = {};
    }
  },
);

const isWorkspaceExpanded = (workspaceRootPath: string): boolean => {
  return expandedWorkspace.value[workspaceRootPath] ?? true;
};

const isAgentExpanded = (workspaceRootPath: string, agentDefinitionId: string): boolean => {
  const key = getAgentNodeKey(workspaceRootPath, agentDefinitionId);
  return expandedAgents.value[key] ?? true;
};

const toggleWorkspace = (workspaceRootPath: string): void => {
  const next = !isWorkspaceExpanded(workspaceRootPath);
  expandedWorkspace.value = {
    ...expandedWorkspace.value,
    [workspaceRootPath]: next,
  };
};

const toggleAgent = (workspaceRootPath: string, agentDefinitionId: string): void => {
  const key = getAgentNodeKey(workspaceRootPath, agentDefinitionId);
  const next = !isAgentExpanded(workspaceRootPath, agentDefinitionId);
  expandedAgents.value = {
    ...expandedAgents.value,
    [key]: next,
  };
};

const onSelectRun = async (run: RunTreeRow): Promise<void> => {
  try {
    await runHistoryStore.selectTreeRun(run);
    emit('run-selected', { type: 'agent', runId: run.runId });
  } catch (error) {
    console.error('Failed to open run:', error);
  }
};

const onSelectTeam = (teamRunId: string): void => {
  toggleTeam(teamRunId);
  selectionStore.selectRun(teamRunId, 'team');
  emit('run-selected', { type: 'team', runId: teamRunId });
};

const toTeamMemberDisplayName = (member: TeamMemberTreeRow): string => {
  const direct = member.memberName?.trim();
  if (direct) {
    return direct;
  }
  const routeKey = member.memberRouteKey || '';
  const routeLeaf = routeKey
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .pop();
  return routeLeaf || routeKey || 'Member';
};

const onSelectTeamMember = async (member: TeamMemberTreeRow): Promise<void> => {
  try {
    await runHistoryStore.selectTreeRun(member);
    emit('run-selected', { type: 'team', runId: member.teamRunId });
  } catch (error) {
    console.error('Failed to open team member run:', error);
  }
};

const onTerminateTeam = async (teamRunId: string): Promise<void> => {
  const terminateErrorMessage = 'Failed to terminate team. Please try again.';
  if (terminatingTeamIds.value[teamRunId]) {
    return;
  }

  terminatingTeamIds.value = {
    ...terminatingTeamIds.value,
    [teamRunId]: true,
  };

  try {
    await teamRunStore.terminateTeamRun(teamRunId);
  } catch (error) {
    console.error('Failed to terminate team:', error);
    addToast(terminateErrorMessage, 'error');
  } finally {
    const next = { ...terminatingTeamIds.value };
    delete next[teamRunId];
    terminatingTeamIds.value = next;
  }
};

const onTerminateRun = async (runId: string): Promise<void> => {
  const terminateErrorMessage = 'Failed to terminate run. Please try again.';
  if (terminatingRunIds.value[runId]) {
    return;
  }

  terminatingRunIds.value = {
    ...terminatingRunIds.value,
    [runId]: true,
  };

  try {
    const terminated = await agentRunStore.terminateRun(runId);
    if (!terminated) {
      console.error(`Failed to terminate run '${runId}'.`);
      addToast(terminateErrorMessage, 'error');
    }
  } catch (error) {
    console.error('Failed to terminate run:', error);
    addToast(terminateErrorMessage, 'error');
  } finally {
    const next = { ...terminatingRunIds.value };
    delete next[runId];
    terminatingRunIds.value = next;
  }
};

const onDeleteRun = async (run: RunTreeRow): Promise<void> => {
  if (run.source !== 'history' || run.isActive) {
    return;
  }

  const runId = run.runId;
  if (deletingRunIds.value[runId]) {
    return;
  }

  pendingDeleteRunId.value = runId;
  pendingDeleteTeamId.value = null;
  showDeleteConfirmation.value = true;
};

const onDeleteTeam = async (team: TeamTreeNode): Promise<void> => {
  if (canTerminateTeam(team.currentStatus) || team.deleteLifecycle !== 'READY') {
    return;
  }

  const teamRunId = team.teamRunId.trim();
  if (!teamRunId || deletingTeamIds.value[teamRunId]) {
    return;
  }

  pendingDeleteRunId.value = null;
  pendingDeleteTeamId.value = teamRunId;
  showDeleteConfirmation.value = true;
};

const closeDeleteConfirmation = (): void => {
  showDeleteConfirmation.value = false;
  pendingDeleteRunId.value = null;
  pendingDeleteTeamId.value = null;
};

const confirmDeleteRun = async (): Promise<void> => {
  const deleteErrorMessage = 'Failed to delete run. Please try again.';
  const deleteTeamErrorMessage = 'Failed to delete team history. Please try again.';
  const runId = pendingDeleteRunId.value;
  const teamRunId = pendingDeleteTeamId.value;
  closeDeleteConfirmation();

  if (runId) {
    if (deletingRunIds.value[runId]) {
      return;
    }

    deletingRunIds.value = {
      ...deletingRunIds.value,
      [runId]: true,
    };

    try {
      const deleted = await runHistoryStore.deleteRun(runId);
      if (!deleted) {
        addToast(deleteErrorMessage, 'error');
        return;
      }
      addToast('Run deleted permanently.', 'success');
    } catch (error) {
      console.error('Failed to delete run:', error);
      addToast(deleteErrorMessage, 'error');
    } finally {
      const next = { ...deletingRunIds.value };
      delete next[runId];
      deletingRunIds.value = next;
    }
    return;
  }

  if (!teamRunId || deletingTeamIds.value[teamRunId]) {
    return;
  }

  deletingTeamIds.value = {
    ...deletingTeamIds.value,
    [teamRunId]: true,
  };

  try {
    const deleted = await runHistoryStore.deleteTeamRun(teamRunId);
    if (!deleted) {
      addToast(deleteTeamErrorMessage, 'error');
      return;
    }
    addToast('Team history deleted permanently.', 'success');
  } catch (error) {
    console.error('Failed to delete team history:', error);
    addToast(deleteTeamErrorMessage, 'error');
  } finally {
    const next = { ...deletingTeamIds.value };
    delete next[teamRunId];
    deletingTeamIds.value = next;
  }
};

const onCreateRun = async (workspaceRootPath: string, agentDefinitionId: string): Promise<void> => {
  try {
    await runHistoryStore.createDraftRun({ workspaceRootPath, agentDefinitionId });
    emit('run-created', { type: 'agent', definitionId: agentDefinitionId });
  } catch (error) {
    console.error('Failed to create draft run:', error);
  }
};

const focusWorkspaceInput = async (): Promise<void> => {
  await nextTick();
  workspacePathInputRef.value?.focus();
};

const createWorkspaceFromPath = async (rootPath: string): Promise<boolean> => {
  try {
    creatingWorkspace.value = true;
    workspacePathError.value = '';
    const normalizedRootPath = await runHistoryStore.createWorkspace(rootPath);
    expandedWorkspace.value = {
      ...expandedWorkspace.value,
      [normalizedRootPath]: true,
    };
    await workspaceStore.fetchAllWorkspaces();
    resetCreateWorkspaceInline();
    return true;
  } catch (error) {
    console.error('Failed to add workspace:', error);
    workspacePathDraft.value = rootPath;
    workspacePathError.value = 'Failed to add workspace. Please verify the path and try again.';
    showCreateWorkspaceInline.value = true;
    await focusWorkspaceInput();
    return false;
  } finally {
    creatingWorkspace.value = false;
  }
};

const onCreateWorkspace = async (): Promise<void> => {
  if (creatingWorkspace.value) {
    return;
  }

  const hasNativePicker = Boolean(window.electronAPI?.showFolderDialog);
  if (isEmbeddedWindow.value && hasNativePicker) {
    workspacePathError.value = '';
    const selectedPath = await pickFolderPath();
    if (!selectedPath) {
      return;
    }
    await createWorkspaceFromPath(selectedPath);
    return;
  }

  if (showCreateWorkspaceInline.value) {
    closeCreateWorkspaceInput();
    return;
  }
  workspacePathError.value = '';
  workspacePathDraft.value = '';
  showCreateWorkspaceInline.value = true;
  await focusWorkspaceInput();
};

const resetCreateWorkspaceInline = (): void => {
  showCreateWorkspaceInline.value = false;
  workspacePathDraft.value = '';
  workspacePathError.value = '';
};

const closeCreateWorkspaceInput = (): void => {
  if (creatingWorkspace.value) {
    return;
  }
  resetCreateWorkspaceInline();
};

const confirmCreateWorkspace = async (): Promise<void> => {
  const rootPath = workspacePathDraft.value.trim();
  if (!rootPath) {
    workspacePathError.value = 'Workspace path is required.';
    await focusWorkspaceInput();
    return;
  }

  await createWorkspaceFromPath(rootPath);
};

onMounted(async () => {
  await Promise.all([
    workspaceStore.fetchAllWorkspaces().catch(() => undefined),
    runHistoryStore.fetchTree(),
    agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined),
    agentTeamDefinitionStore.fetchAllAgentTeamDefinitions().catch(() => undefined),
  ]);
});
</script>
