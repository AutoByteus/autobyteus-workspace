<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        @click="goBackToList"
        class="mb-5 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <svg class="mr-2 h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z"
            clip-rule="evenodd"
          />
        </svg>{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.back_to_agent_teams') }}</button>

      <div v-if="loading" class="rounded-lg border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.loading_agent_team_details') }}</p>
      </div>

      <div v-else-if="deleteSuccessRedirecting" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
        <h3 class="font-bold">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.agent_team_deleted') }}</h3>
        <p>{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.the_agent_team_definition_was_deleted') }}</p>
      </div>

      <div v-else-if="!teamDef" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        <h3 class="font-bold">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.agent_team_not_found') }}</h3>
        <p>{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.the_agent_team_definition_with_the') }}</p>
        <button
          @click="goBackToList"
          class="mt-2 inline-block text-blue-700 hover:underline"
        >{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.and_larr_back_to_all_teams') }}</button>
      </div>

      <div v-else class="space-y-4">
        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div class="flex min-w-0 items-start gap-4">
              <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-700">
                <img
                  v-if="showAvatarImage"
                  :src="avatarUrl"
                  :alt="`${teamDef.name} avatar`"
                  class="h-full w-full object-cover"
                  @error="avatarLoadError = true"
                />
                <span v-else class="text-2xl font-semibold tracking-wide text-slate-600">{{ teamInitials }}</span>
              </div>

              <div class="min-w-0">
                <h1 class="truncate text-3xl font-semibold text-slate-900">{{ teamDef.name }}</h1>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{{ teamDef.category || $t('agentTeams.components.agentTeams.AgentTeamDetail.uncategorized') }}</span>
                  <span
                    v-if="ownershipBadge"
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="isApplicationOwned ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'"
                  >
                    {{ ownershipBadge }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-slate-600">{{ teamDef.description || $t('agentTeams.components.agentTeams.AgentTeamDetail.noDescription') }}</p>
                <p v-if="applicationLabel" class="mt-2 text-sm text-slate-500">Application: {{ applicationLabel }}</p>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.membersCount', { count: teamDef.nodes.length }) }}</span>
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.coordinatorPill', { name: teamDef.coordinatorMemberName || $t('agentTeams.components.agentTeams.AgentTeamDetail.notAssigned') }) }}</span>
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.nestedTeamsPill', { count: nestedTeamCount }) }}</span>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button
                @click="runTeam"
                class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.run') }}
              </button>
              <button
                @click="$emit('navigate', { view: 'team-edit', id: teamDef.id })"
                class="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.edit') }}
              </button>
              <button
                v-if="isShared"
                @click="handleDelete(teamDef.id)"
                class="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.delete') }}
              </button>
            </div>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.descriptionHeading') }}</h2>
          <p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">{{ teamDef.description }}</p>

          <div class="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('agentTeams.components.agentTeams.AgentTeamCard.coordinator') }}</p>
              <p class="mt-1">{{ teamDef.coordinatorMemberName || $t('agentTeams.components.agentTeams.AgentTeamDetail.notAssigned') }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.composition_summary') }}</p>
              <p class="mt-1">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.compositionSummaryValue', { agents: agentCount, teams: nestedTeamCount }) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('agents.components.agents.AgentDetail.defaultRuntime') }}</p>
              <p class="mt-1">{{ teamDef.defaultLaunchConfig?.runtimeKind || $t('agents.components.agents.AgentDetail.notSet') }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('agents.components.agents.AgentDetail.defaultModel') }}</p>
              <p class="mt-1 break-all">{{ teamDef.defaultLaunchConfig?.llmModelIdentifier || $t('agents.components.agents.AgentDetail.notSet') }}</p>
            </div>
          </div>
        </section>

        <ExpandableInstructionCard
          :content="teamDef.instructions"
          variant="slate"
        />

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.membersHeading', { count: teamDef.nodes.length }) }}</h2>
          <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <article
              v-for="node in teamDef.nodes"
              :key="getMemberKey(node)"
              class="rounded-lg border border-slate-200 bg-white p-3"
              :class="isMemberExpanded(node) ? 'lg:col-span-2' : ''"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
                    :class="node.refType === 'AGENT' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'"
                  >
                    <img
                      v-if="showMemberAvatarImage(node)"
                      :src="getMemberAvatarUrl(node)"
                      :alt="`${node.memberName} avatar`"
                      class="h-full w-full object-cover"
                      @error="handleMemberAvatarError(node)"
                    />
                    <span v-else>{{ memberInitials(node.memberName) }}</span>
                  </div>
                  <div class="min-w-0">
                    <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                      <p class="min-w-0 max-w-full truncate text-base font-semibold text-slate-900">{{ node.memberName }}</p>
                      <span
                        v-if="isCoordinatorNode(node)"
                        class="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                      >
                        {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.badgeCoordinator') }}
                      </span>
                    </div>
                    <p class="mt-0.5 truncate text-sm text-slate-500">
                      {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.blueprintLabel', { name: getBlueprintNameForNode(node) }) }}
                    </p>
                  </div>
                </div>

                <button
                  v-if="canExpandTeamLocalMember(node)"
                  type="button"
                  class="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-1"
                  :aria-expanded="isMemberExpanded(node) ? 'true' : 'false'"
                  :aria-label="isMemberExpanded(node)
                    ? $t('agentTeams.components.agentTeams.AgentTeamDetail.hideTeamLocalDetailsLabel', { name: node.memberName })
                    : $t('agentTeams.components.agentTeams.AgentTeamDetail.showTeamLocalDetailsLabel', { name: node.memberName })"
                  :title="isMemberExpanded(node)
                    ? $t('agentTeams.components.agentTeams.AgentTeamDetail.hideTeamLocalDetailsLabel', { name: node.memberName })
                    : $t('agentTeams.components.agentTeams.AgentTeamDetail.showTeamLocalDetailsLabel', { name: node.memberName })"
                  data-test="team-local-expand-toggle"
                  @click="toggleMemberExpansion(node)"
                >
                  {{ isMemberExpanded(node)
                    ? $t('agentTeams.components.agentTeams.AgentTeamDetail.hideDetailsAction')
                    : $t('agentTeams.components.agentTeams.AgentTeamDetail.detailsAction') }}
                </button>
                <button
                  v-else-if="canViewSharedAgentMember(node)"
                  type="button"
                  class="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1"
                  :aria-label="$t('agentTeams.components.agentTeams.AgentTeamDetail.viewSharedAgentLabel', { name: node.memberName })"
                  :title="$t('agentTeams.components.agentTeams.AgentTeamDetail.viewSharedAgentLabel', { name: node.memberName })"
                  data-test="shared-agent-view-link"
                  @click="viewSharedAgentMember(node)"
                >
                  {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.viewAgentAction') }}
                </button>
                <button
                  v-else-if="canViewNestedTeamMember(node)"
                  type="button"
                  class="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-1"
                  :aria-label="$t('agentTeams.components.agentTeams.AgentTeamDetail.viewNestedTeamLabel', { name: node.memberName })"
                  :title="$t('agentTeams.components.agentTeams.AgentTeamDetail.viewNestedTeamLabel', { name: node.memberName })"
                  data-test="nested-team-view-link"
                  @click="viewNestedTeamMember(node)"
                >
                  {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.viewTeamAction') }}
                </button>
              </div>

              <div v-if="isTeamLocalAgentNode(node) && (!canExpandTeamLocalMember(node) || isMemberExpanded(node))" class="mt-3 border-t border-slate-100 pt-3">
                <p v-if="!canExpandTeamLocalMember(node)" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-test="team-local-unresolved-message">
                  {{ $t('agentTeams.components.agentTeams.AgentTeamDetail.teamLocalDefinitionMissing', { id: getTeamLocalDefinitionId(node) || node.ref }) }}
                </p>

                <TeamLocalAgentMemberDetails
                  v-if="isMemberExpanded(node) && getAgentDefinitionForNode(node)"
                  class="mt-3"
                  :agent-def="getRequiredAgentDefinitionForNode(node)"
                  :member-name="node.memberName"
                  :is-coordinator="isCoordinatorNode(node)"
                  :team-name="teamDef.name"
                  @saved="handleTeamLocalMemberSaved"
                  @error="handleTeamLocalMemberError"
                />
              </div>
            </article>
          </div>
        </section>
      </div>

      <AgentDeleteConfirmDialog
        :show="showDeleteConfirm"
        :item-name="teamDef ? teamDef.name : ''"
        :item-type="$t('agentTeams.components.agentTeams.AgentTeamDetail.deleteItemType')"
        :title="$t('agentTeams.components.agentTeams.AgentTeamDetail.delete_agent_team_definition')"
        :confirm-text="$t('agentTeams.components.agentTeams.AgentTeamDetail.delete_definition')"
        @confirm="onDeleteConfirmed"
        @cancel="onDeleteCanceled"
      />

      <div
        v-if="notification"
        :class="[
          'fixed bottom-5 right-5 z-50 rounded-lg p-4 text-white shadow-lg',
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500',
        ]"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore';
import { useRunActions } from '~/composables/useRunActions';
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue';
import ExpandableInstructionCard from '~/components/common/ExpandableInstructionCard.vue';
import TeamLocalAgentMemberDetails from '~/components/agentTeams/TeamLocalAgentMemberDetails.vue';
import { formatApplicationOwnershipLabel } from '~/utils/definitionOwnership';
import { buildTeamLocalAgentDefinitionId, buildTeamLocalTeamDefinitionId } from '~/utils/teamLocalDefinitionId';

const props = defineProps<{ teamDefinitionId: string }>();
const { teamDefinitionId } = toRefs(props);

const emit = defineEmits(['navigate']);

const teamStore = useAgentTeamDefinitionStore();
const agentDefStore = useAgentDefinitionStore();
const { prepareTeamRun } = useRunActions();
const router = useRouter();
const { t: $t } = useLocalization();

const teamDef = computed(() => teamStore.getAgentTeamDefinitionById(teamDefinitionId.value));
const loading = ref(false);

const avatarLoadError = ref(false);
const avatarUrl = computed(() => ((teamDef.value?.avatarUrl as string | undefined) || '').trim());
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);

watch(avatarUrl, () => {
  avatarLoadError.value = false;
});

const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);
const showDeleteConfirm = ref(false);
const teamDefinitionIdToDelete = ref<string | null>(null);
const memberAvatarLoadErrors = ref<Record<string, boolean>>({});
const expandedMemberKeys = ref<string[]>([]);
const deleteSuccessRedirecting = ref(false);

type TeamMemberNode = AgentTeamDefinition['nodes'][number];

watch(teamDefinitionId, () => {
  memberAvatarLoadErrors.value = {};
  expandedMemberKeys.value = [];
  deleteSuccessRedirecting.value = false;
});

const teamInitials = computed(() => {
  const raw = teamDef.value?.name?.trim() ?? '';
  if (!raw) {
    return 'AT';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AT';
});

const nestedTeamCount = computed(() => teamDef.value?.nodes.filter((node) => node.refType === 'AGENT_TEAM').length || 0);
const agentCount = computed(() => teamDef.value?.nodes.filter((node) => node.refType === 'AGENT').length || 0);
const ownershipScope = computed(() => teamDef.value?.ownershipScope ?? 'SHARED');
const isShared = computed(() => ownershipScope.value === 'SHARED');
const isApplicationOwned = computed(() => ownershipScope.value === 'APPLICATION_OWNED');
const isTeamLocal = computed(() => ownershipScope.value === 'TEAM_LOCAL');
const ownershipBadge = computed(() => (isApplicationOwned.value ? 'Application-owned' : isTeamLocal.value ? 'Team-local' : ''));
const applicationLabel = computed(() => (
  isApplicationOwned.value && teamDef.value
    ? formatApplicationOwnershipLabel(teamDef.value)
    : ''
));

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    teamStore.fetchAllAgentTeamDefinitions(),
    agentDefStore.fetchAllAgentDefinitions(),
  ]);
  loading.value = false;
});

const memberInitials = (memberName: string): string => {
  const raw = memberName.trim();
  if (!raw) {
    return 'M';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
};

const getMemberAvatarErrorKey = (node: TeamMemberNode): string =>
  `${node.refType}:${node.ref}:${node.memberName}`;

const getMemberKey = (node: TeamMemberNode): string => `${node.refType}:${node.refScope || 'GLOBAL'}:${node.ref}:${node.memberName}`;

const isCoordinatorNode = (node: TeamMemberNode): boolean => node.memberName === teamDef.value?.coordinatorMemberName;

const isTeamLocalAgentNode = (node: TeamMemberNode): boolean => (
  node.refType === 'AGENT' && node.refScope === 'TEAM_LOCAL'
);

const isSharedAgentMemberNode = (node: TeamMemberNode): boolean => (
  node.refType === 'AGENT' && (!node.refScope || node.refScope === 'SHARED')
);

const getTeamDefinitionIdForNode = (node: TeamMemberNode): string => {
  if (!teamDef.value || node.refType !== 'AGENT_TEAM') {
    return '';
  }
  try {
    return node.refScope === 'TEAM_LOCAL'
      ? buildTeamLocalTeamDefinitionId(teamDef.value.id, node.ref)
      : node.ref.trim();
  } catch {
    return '';
  }
};

const getTeamLocalDefinitionId = (node: TeamMemberNode): string => {
  if (!teamDef.value || !isTeamLocalAgentNode(node)) {
    return '';
  }
  try {
    return buildTeamLocalAgentDefinitionId(teamDef.value.id, node.ref);
  } catch {
    return '';
  }
};

const getAgentDefinitionForNode = (node: TeamMemberNode): AgentDefinition | null => {
  if (node.refType !== 'AGENT') {
    return null;
  }
  const definitionId = isTeamLocalAgentNode(node) ? getTeamLocalDefinitionId(node) : node.ref;
  return definitionId ? agentDefStore.getAgentDefinitionById(definitionId) ?? null : null;
};

const canViewSharedAgentMember = (node: TeamMemberNode): boolean => (
  isSharedAgentMemberNode(node) && Boolean(getAgentDefinitionForNode(node))
);

const getResolvedNestedTeamDefinitionId = (node: TeamMemberNode): string => (
  node.refType === 'AGENT_TEAM' ? getTeamDefinitionIdForNode(node) : ''
);

const canViewNestedTeamMember = (node: TeamMemberNode): boolean => {
  const teamDefinitionId = getResolvedNestedTeamDefinitionId(node);
  return Boolean(teamDefinitionId && teamStore.getAgentTeamDefinitionById(teamDefinitionId));
};

const canExpandTeamLocalMember = (node: TeamMemberNode): boolean => (
  isTeamLocalAgentNode(node) && Boolean(getAgentDefinitionForNode(node))
);

const getRequiredAgentDefinitionForNode = (node: TeamMemberNode): AgentDefinition => {
  const definition = getAgentDefinitionForNode(node);
  if (!definition) {
    throw new Error(`Agent definition is required for member ${node.memberName}.`);
  }
  return definition;
};

const isMemberExpanded = (node: TeamMemberNode): boolean => expandedMemberKeys.value.includes(getMemberKey(node));

const toggleMemberExpansion = (node: TeamMemberNode): void => {
  const key = getMemberKey(node);
  expandedMemberKeys.value = isMemberExpanded(node)
    ? expandedMemberKeys.value.filter((entry) => entry !== key)
    : [...expandedMemberKeys.value, key];
};

const getMemberAvatarUrl = (node: TeamMemberNode): string => {
  if (node.refType === 'AGENT') {
    return (getAgentDefinitionForNode(node)?.avatarUrl || '').trim();
  }
  const teamDefinitionId = getTeamDefinitionIdForNode(node);
  return (teamDefinitionId ? teamStore.getAgentTeamDefinitionById(teamDefinitionId)?.avatarUrl || '' : '').trim();
};

const showMemberAvatarImage = (node: TeamMemberNode): boolean => {
  const url = getMemberAvatarUrl(node);
  if (!url) {
    return false;
  }
  return !memberAvatarLoadErrors.value[getMemberAvatarErrorKey(node)];
};

const handleMemberAvatarError = (node: TeamMemberNode): void => {
  memberAvatarLoadErrors.value = {
    ...memberAvatarLoadErrors.value,
    [getMemberAvatarErrorKey(node)]: true,
  };
};

const getBlueprintNameForNode = (node: TeamMemberNode): string => {
  if (node.refType === 'AGENT') {
    return getAgentDefinitionForNode(node)?.name
      || (isTeamLocalAgentNode(node)
        ? $t('agentTeams.components.agentTeams.AgentTeamDetail.localAgent', { id: node.ref })
        : $t('agentTeams.components.agentTeams.AgentTeamDetail.unknownAgent', { id: node.ref }));
  }
  const teamDefinitionId = getTeamDefinitionIdForNode(node);
  return (teamDefinitionId ? teamStore.getAgentTeamDefinitionById(teamDefinitionId)?.name : null) || $t('agentTeams.components.agentTeams.AgentTeamDetail.unknownTeam', { id: teamDefinitionId || node.ref });
};

const viewSharedAgentMember = (node: TeamMemberNode): void => {
  if (!teamDef.value || !canViewSharedAgentMember(node)) {
    return;
  }
  emit('navigate', {
    target: 'agents',
    view: 'detail',
    id: node.ref,
    returnToTeam: teamDef.value.id,
  });
};

const viewNestedTeamMember = (node: TeamMemberNode): void => {
  if (!canViewNestedTeamMember(node)) {
    return;
  }
  const resolvedChildTeamId = getResolvedNestedTeamDefinitionId(node);
  if (!resolvedChildTeamId) {
    return;
  }
  emit('navigate', {
    view: 'team-detail',
    id: resolvedChildTeamId,
  });
};

const runTeam = () => {
  if (!teamDef.value) {
    return;
  }
  prepareTeamRun(teamDef.value);
  router.push('/workspace');
};

const handleDelete = (id: string) => {
  teamDefinitionIdToDelete.value = id;
  showDeleteConfirm.value = true;
};

const onDeleteConfirmed = async () => {
  if (teamDefinitionIdToDelete.value) {
    try {
      const success = await teamStore.deleteAgentTeamDefinition(teamDefinitionIdToDelete.value);
      if (success) {
        deleteSuccessRedirecting.value = true;
        showNotification($t('agentTeams.components.agentTeams.AgentTeamDetail.deleteSuccess'), 'success');
        setTimeout(() => emit('navigate', { view: 'team-list' }), 1200);
      } else {
        throw new Error($t('agentTeams.components.agentTeams.AgentTeamDetail.deleteFailureUnknown'));
      }
    } catch (err: any) {
      showNotification(err.message || $t('agentTeams.components.agentTeams.AgentTeamDetail.deleteFailure'), 'error');
    }
  }
  onDeleteCanceled();
};

const onDeleteCanceled = () => {
  showDeleteConfirm.value = false;
  teamDefinitionIdToDelete.value = null;
};

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};

const handleTeamLocalMemberSaved = (payload: { message: string }) => {
  showNotification(payload.message, 'success');
};

const handleTeamLocalMemberError = (payload: { message: string }) => {
  showNotification(payload.message, 'error');
};

const goBackToList = () => {
  emit('navigate', { view: 'team-list' });
};
</script>
