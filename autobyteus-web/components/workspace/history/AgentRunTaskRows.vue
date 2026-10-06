<template>
  <!-- Task Agents and task Teams brought into a standalone Agent run with `@`. Rows of a DONE Task leave with motion. -->
  <TransitionGroup
    v-if="rendered"
    tag="div"
    name="tree-row"
    class="team-execution-tree ml-3 space-y-0.5"
    role="tree"
    :aria-label="t('workspace.history.hierarchy.tree_label', { name: label })"
    data-test="workspace-agent-run-task-tree"
    :data-run-id="runId"
    @before-leave="onBeforeLeave"
    @after-leave="onRowLeaveSettled"
    @leave-cancelled="onRowLeaveSettled"
  >
    <WorkspaceTransientExecutionRow
      v-for="display in rows"
      :key="display.row.rowKey"
      :row="display.row"
      :is-selected="isSelected(display.row)"
      :has-children="display.row.hasChildren"
      :expanded="isExpanded(display.row)"
      :continuing-ancestor-depths="display.continuingAncestorDepths"
      :has-following-sibling="display.hasFollowingSibling"
      @select="select"
      @toggle="toggle"
    />
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue'
import { useLeavingTreeRows } from '~/components/workspace/history/useLeavingTreeRows'
import { useLocalization } from '~/composables/useLocalization'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'

const props = defineProps<{
  runId: string
  label: string
  /** The run is the selected run in the workspace. */
  runSelected: boolean
  /** The run has a stored collaboration package. */
  hasCollaboration: boolean
}>()
const emit = defineEmits<{ (event: 'select-run'): void }>()
const { t } = useLocalization()
const collaboration = useAgentRunCollaborationStore()

// The stored view is read without restoring the run; a live run is kept current by its stream.
const loadStored = () => {
  if (props.hasCollaboration && !collaboration.contextFor(props.runId)) void collaboration.inspect(props.runId)
}
onMounted(loadStored)
watch(() => props.hasCollaboration, loadStored)

const rows = computed(() => collaboration.taskRows(props.runId))
// The run row directly precedes this tree.
const { leaving, onBeforeLeave, onLeaveSettled } = useLeavingTreeRows(
  (tree) => tree.previousElementSibling instanceof HTMLElement ? tree.previousElementSibling : null)
// The tree stays mounted while its last rows leave (their leave hooks need the group); once they
// have settled, the empty list is not rendered.
const rendered = ref(false)
watch(() => rows.value.length > 0, (hasRows) => { if (hasRows) rendered.value = true }, { immediate: true })
const onRowLeaveSettled = (): void => {
  onLeaveSettled()
  if (leaving.value === 0 && rows.value.length === 0) rendered.value = false
}
const isExpanded = (row: RunHistoryTransientExecutionRow): boolean =>
  Boolean(row.teamRunIdForNode && collaboration.isTaskTeamExpanded(props.runId, row.teamRunIdForNode))
const isSelected = (row: RunHistoryTransientExecutionRow): boolean =>
  props.runSelected && row.agentRunId !== null && collaboration.selectedChild(props.runId) === row.agentRunId

const toggle = (row: RunHistoryTransientExecutionRow): void => {
  if (row.teamRunIdForNode) collaboration.toggleTaskTeam(props.runId, row.teamRunIdForNode)
}

/** Opens the task Agent's conversation; a task Team row opens its coordinator. */
const select = (row: RunHistoryTransientExecutionRow): void => {
  const context = collaboration.contextFor(props.runId)
  if (!context) return
  const agentRunId = row.agentRunId ?? (row.teamRunIdForNode ? context.index.coordinatorOf(row.teamRunIdForNode).agentRunId : null)
  collaboration.selectChild(props.runId, agentRunId)
  if (!props.runSelected) emit('select-run')
}
</script>

<style scoped src="./treeRowLeave.css"></style>
