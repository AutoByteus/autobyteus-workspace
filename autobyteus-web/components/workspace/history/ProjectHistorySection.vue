<template>
  <!-- projects-left-navigation (REQ-002, DEC-012): one Project, styled like a workspace row and with no selected mark.
       The chevron only opens or closes it; the name selects it (the right Projects board follows) and opens it when
       closed; "+" runs an agent or team under it. Its groups are the workspace section's (RunDefinitionGroups). -->
  <section class="rounded-md">
    <div
      class="group/project-row flex items-center rounded-md text-sm text-gray-700 transition-colors hover:bg-gray-50 focus-within:bg-gray-50"
      data-test="project-row"
      :data-project-id="entry.project.projectId"
    >
      <button
        type="button"
        class="flex flex-shrink-0 items-center self-stretch rounded-l-md py-1.5 pl-2 pr-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        data-test="project-row-disclosure"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-label="disclosureLabel"
        :title="disclosureLabel"
        @click="state.toggleWorkspace(entry.node)"
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="h-4 w-4 text-gray-400 transition-transform"
          :class="expanded ? 'rotate-0' : '-rotate-90'"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center py-1.5 pr-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        data-test="project-row-select"
        :aria-current="selected ? 'true' : undefined"
        :title="t('projectsTree.selectProject', { name: entry.project.name })"
        @click="emit('select')"
      >
        <Icon icon="heroicons:briefcase" class="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
        <span class="truncate">{{ entry.project.name }}</span>
      </button>
      <button
        type="button"
        class="mr-2 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-indigo-50 hover:text-indigo-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:opacity-0 md:group-hover/project-row:opacity-100 md:group-focus-within/project-row:opacity-100"
        data-test="project-run-add"
        :title="t('projectsTree.runUnderProject', { name: entry.project.name })"
        :aria-label="t('projectsTree.runUnderProject', { name: entry.project.name })"
        @click="actions.onCreateProjectRun?.(entry.project.projectId, null)"
      >
        <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div v-if="expanded" class="ml-2 mt-0.5 space-y-1">
      <div
        v-if="entry.node.agents.length === 0 && entry.teams.length === 0 && entry.node.agentOrgDefinitions.length === 0"
        class="px-3 py-1 text-xs text-gray-400"
        data-test="project-no-runs"
      >{{ t('projectsTree.noRuns') }}</div>
      <RunDefinitionGroups
        :node="entry.node"
        :teams="entry.teams"
        :team-history-groups="entry.teamHistoryGroups"
        :state="state"
        :avatars="avatars"
        :actions="actions"
        :project-scope="projectScope"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RunDefinitionGroups from '~/components/workspace/history/RunDefinitionGroups.vue'
import type {
  ProjectSectionScope,
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts'
import type { ProjectRunsEntry } from '~/stores/projectRunsProjection'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{
  entry: ProjectRunsEntry
  /** The right Projects board shows this Project (assistive technology only: no visual mark). */
  selected: boolean
  state: WorkspaceHistorySectionState
  avatars: WorkspaceHistoryAvatarBindings
  actions: WorkspaceHistorySectionActions
}>()
const emit = defineEmits<{ (event: 'select'): void }>()
const { t } = useLocalization()

const expanded = computed(() => props.state.isWorkspaceExpanded(props.entry.node.stableKey))
const disclosureLabel = computed(() => t(expanded.value ? 'projectsTree.collapseProject' : 'projectsTree.expandProject',
  { name: props.entry.project.name }))
const projectScope = computed<ProjectSectionScope>(() => ({
  projectId: props.entry.project.projectId,
  executionScopeOf: props.entry.executionScopeOf,
}))
</script>
