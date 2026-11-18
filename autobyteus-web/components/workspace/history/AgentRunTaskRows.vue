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
    <WorkspaceDelegatedRunRow
      v-for="display in rows"
      :key="display.row.rowKey"
      :row="display.row"
      :team-status="display.teamStatus ?? undefined"
      :is-selected="isSelected(display.row)"
      :has-children="display.row.hasChildren"
      :expanded="collaboration.isTreeRowExpanded(runId, display.tree)"
      :continuing-ancestor-depths="display.continuingAncestorDepths"
      :has-following-sibling="display.hasFollowingSibling"
      :task="taskOf(display.row)"
      :stop-root="{ rootKind: 'AGENT', rootRunId: runId }"
      @select="select"
      @toggle="toggle"
      @locate-task="(task: TaskWorkerTask) => locate(task, () => emit('open-run'))"
    />
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WorkspaceDelegatedRunRow from '~/components/workspace/history/WorkspaceDelegatedRunRow.vue'
import { useLeavingTreeRows } from '~/components/workspace/history/useLeavingTreeRows'
import { useLocalization } from '~/composables/useLocalization'
import { useTaskWorkerTasks } from '~/composables/projects/useTaskWorkerTasks'
import type { RunHistoryDelegatedRunRow } from '~/stores/runHistoryTypes'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { openRunTarget } from '~/composables/useRunOpening'
import { runTreeDisplayRows } from '~/utils/runTree/runTreeDisplayRows'
import type { TaskWorkerTask } from '~/types/project'

const props = defineProps<{
  runId: string
  label: string
  /** The run is the selected run in the workspace. */
  runSelected: boolean
  /** The run has a stored collaboration package. */
  hasCollaboration: boolean
}>()
/**
 * `select-run` opens the run with its last selected child; `open-run` opens the run's own conversation, as
 * clicking the run row does (a Task summary located from a page without a right panel, REQ-012).
 */
const emit = defineEmits<{ (event: 'select-run'): void; (event: 'open-run'): void }>()
const { t } = useLocalization()
const collaboration = useAgentRunCollaborationStore()

const trees = useRunTreeStore()
const runStatus = useRunStatusStore()
const tree = computed(() => ({ kind: 'agent' as const, runId: props.runId }))

// The run's tree, built on the server (autobyteus-461 SR-084): its open view's stream feeds it, else it is read, and
// read again when its rows change. The stored view is still read for the Team tab and a peer's run (rule 2 aside).
watch(() => [props.runId, props.hasCollaboration] as const, ([, hasCollaboration], _previous, onCleanup) => {
  if (!hasCollaboration) return
  collaboration.ensureStoredView(props.runId, true)
  onCleanup(trees.hold(tree.value))
}, { immediate: true })

const rows = computed(() => runTreeDisplayRows({
  rows: trees.rowsOf(tree.value), rootKey: `agent:${props.runId}`, topRunId: props.runId,
  isExpanded: (row) => collaboration.isTreeRowExpanded(props.runId, row),
  // Each row's status is its own run's, by the ID the server named: an agent's, or a team run's own (SR-086 G-A4).
  statusOf: (row, id) => row.kind === 'team' || row.kind === 'peer_team'
    ? runStatus.runStateOf({ kind: 'agent_team', runId: id })?.status ?? null
    : runStatus.statusOf(id),
}))
// Task workers show their current Task's summary; it locates the Task in Projects.
const { taskOf, locate } = useTaskWorkerTasks(() => rows.value.map((display) => display.row))
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
/** The row that shows the opened agent (CR-461-108): a delegated Team opened at its coordinator selects the coordinator's row. */
const isSelected = (row: RunHistoryDelegatedRunRow): boolean =>
  props.runSelected && row.agentRunId !== null && collaboration.selectedChild(props.runId) === row.agentRunId

const toggle = (row: RunHistoryDelegatedRunRow): void => collaboration.toggleTreeRow(props.runId, row.rowKey)

/**
 * Opens the row where the server says (`openRunTarget`): a delegated agent's conversation, a delegated team at its
 * coordinator. The run is always (re)opened as well, so a click opens the conversation from any page, also when this
 * run is already the selected run (F-006); re-selecting the current run only navigates.
 */
const select = (row: RunHistoryDelegatedRunRow): void => {
  const display = rows.value.find((candidate) => candidate.row.rowKey === row.rowKey)
  if (display && openRunTarget(tree.value, display.tree)) emit('select-run')
}
</script>

<style scoped src="./treeRowLeave.css"></style>
