<template>
  <!-- projects-left-navigation: the Projects mode of the run section (UIS-002). Each Project is shaped like a workspace
       (agent and team groups, runs, delegated runs with their Task line); states are single quiet text blocks. -->
  <div ref="rootRef" data-test="projects-runs-tree">
    <div
      v-if="runs.firstRead === 'loading' || runs.firstRead === 'idle'"
      class="px-3 py-4 text-xs text-gray-500"
      role="status"
      data-test="projects-tree-loading"
    >{{ t('projectsTree.loading') }}</div>

    <div v-else-if="runs.firstRead === 'error'" class="px-3 py-4" role="alert" data-test="projects-tree-error">
      <p class="text-xs text-red-600">{{ t('projectsTree.error') }}</p>
      <button
        type="button"
        class="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-test="projects-tree-retry"
        @click="runs.retry()"
      >{{ t('projectsTree.retry') }}</button>
    </div>

    <template v-else>
      <!-- A later read failed: the last good tree stays (REQ-011). -->
      <div
        v-if="runs.refreshFailed"
        class="mx-2 mb-1 flex items-center justify-between gap-2 rounded-md bg-red-50 px-2.5 py-1.5"
        role="alert"
        data-test="projects-tree-stale-error"
      >
        <p class="min-w-0 text-xs leading-4 text-red-700">{{ t('projectsTree.staleError') }}</p>
        <button
          type="button"
          class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-red-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          data-test="projects-tree-retry"
          @click="runs.retry()"
        >{{ t('projectsTree.retry') }}</button>
      </div>

      <div v-if="entries.length === 0" class="px-3 py-5 text-center" data-test="projects-tree-empty">
        <Icon icon="heroicons:briefcase" class="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
        <p class="mt-2 text-sm font-medium text-gray-700">{{ t('projectsTree.emptyTitle') }}</p>
        <p class="mt-1 text-xs leading-5 text-gray-500">{{ t('projectsTree.emptyHelp') }}</p>
        <NuxtLink
          to="/projects/new"
          class="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          data-test="projects-tree-empty-new"
        >{{ t('projectsTree.newProject') }}</NuxtLink>
      </div>

      <div v-else class="space-y-1">
        <ProjectHistorySection
          v-for="entry in entries"
          :key="entry.node.stableKey"
          :entry="entry"
          :selected="selectedProjectId === entry.project.projectId"
          :state="tree.state"
          :avatars="avatars"
          :actions="projectActions"
          @select="selectProject(entry.project.projectId)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import ProjectHistorySection from '~/components/workspace/history/ProjectHistorySection.vue'
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts'
import { useRevealSelectedTreeRow } from '~/components/workspace/history/useRevealSelectedTreeRow'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectsTreeState } from '~/composables/useProjectsTreeState'
import { useRunStart } from '~/composables/runSettings/useRunStart'
import { getProjectChangeFeed } from '~/services/projects/projectChangeFeed'
import { useProjectRunsStore } from '~/stores/projectRunsStore'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'

const props = withDefaults(defineProps<{
  /** The run section's state, avatars and actions; Project rows replace their own expansion and "+". */
  state: WorkspaceHistorySectionState
  avatars: WorkspaceHistoryAvatarBindings
  actions: WorkspaceHistorySectionActions
  /** A run is shown in the center: the open run's row is brought into view (as in Workspaces). */
  runShown?: boolean
}>(), { runShown: false })

const { t } = useLocalization()
const route = useRoute() as ReturnType<typeof useRoute> | undefined
const runs = useProjectRunsStore()
const panel = useProjectsPanelStore()
const selection = useAgentSelectionStore()
const runStart = useRunStart()

const projection = computed(() => runs.projection)
const entries = computed(() => projection.value.entries)
const tree = useProjectsTreeState({
  base: props.state,
  projection,
  openRun: () => ({
    agentRunId: props.state.selectedRunId,
    teamRunId: selection.selectedType === 'team' ? selection.selectedRunId : null,
    orgRunId: route?.query.rootSubjectKind === 'agent_org' ? String(route.query.orgRunId || '').trim() || null : null,
  }),
})

/** The board's Project; opening a run does not change it (DEC-017). */
const selectedProjectId = computed(() => (panel.choice.kind === 'project' ? panel.choice.projectId : null))
const selectProject = (projectId: string) => {
  panel.choose({ kind: 'project', projectId })
  tree.openProject(projectId)
}

const projectActions = computed<WorkspaceHistorySectionActions>(() => ({
  ...props.actions,
  // REQ-014: a Project's "Archive all runs" archives only that group's runs listed under the Project.
  onArchiveAgentGroup: props.actions.onArchiveListedAgentGroup,
  // REQ-004: "+" on a Project or one of its groups opens New chat under the Project; the Project opens and is selected.
  onCreateProjectRun: async (projectId, target) => {
    selectProject(projectId)
    await runStart.newChatInProject({ projectId, target })
  },
}))

// The mode is shown: every Project is read and the feed stays open (DS-004); the open run is revealed.
const rootRef = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
let releaseFeed: (() => void) | null = null
let hide: (() => void) | null = null
onMounted(() => {
  scroller.value = rootRef.value?.closest<HTMLElement>('[data-test="workspace-history-tree-scroll"]') ?? null
  releaseFeed = getProjectChangeFeed().retain()
  hide = runs.show()
})
onBeforeUnmount(() => { releaseFeed?.(); hide?.() })
useRevealSelectedTreeRow(scroller, computed(() => props.runShown))
</script>
