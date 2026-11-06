<template>
  <!-- autobyteus-390: the Runs view's rows (the product RunListRow), with an Agent run that delegated twelve Teams below
       four other runs, so its delegated rows are well below the top of the window. Each delegated Team is on a Task, so
       its row has a Task line once the probe lets the Task answers through. -->
  <main data-test="run-expand-motion-probe" class="min-h-screen bg-white p-4 text-slate-900">
    <aside class="w-80 border-r">
      <ul class="space-y-0.5" data-test="run-list">
        <RunListRow v-for="entry in entries" :key="entry.key" :entry="entry" :state="state" :actions="actions"
          :avatars="avatars" folder-label="probe" :relative="() => '1h'" />
      </ul>
    </aside>
  </main>
</template>
<script setup lang="ts">
import { reactive, shallowReactive } from 'vue';
import RunListRow from '~/components/runList/RunListRow.vue';
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts';
import { useRunListDisclosure } from '~/composables/useRunListDisclosure';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { buildMultiTeamContext, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunListEntry } from '~/utils/runListProjection';

definePageMeta({ layout: false });
const HOST = 'probe-host-run';
const DELEGATED = 12;
const at = '2026-11-06T08:00:00.000Z';
const agentEntry = (runId: string, name: string, hasCollaboration: boolean): RunListEntry => ({
  kind: 'agent', key: `agent:${runId}`, runId, name, lastActivityAt: at, isActive: false, folderRootPath: '/probe',
  agentDefinitionId: `definition-${runId}`, avatarUrl: null,
  run: { runId, summary: `${name} notes`, lastActivityAt: at, createdAt: at, currentStatus: AgentStatus.Offline,
    isActive: false, source: 'history', hasCollaboration } as never,
});
const entries = [
  ...['Writer', 'Researcher', 'Reviewer', 'Planner'].map((name, index) => agentEntry(`probe-run-${index}`, name, false)),
  agentEntry(HOST, 'Project Task Manager', true),
];

// The stored delegated view is already in the store, as after its first load: no server read.
const collaboration = useAgentRunCollaborationStore();
const contextWithout = (closed: readonly number[]) => {
  const view = multiTeamView(DELEGATED, HOST);
  view.execution_tree.taskExecutions = view.execution_tree.taskExecutions.filter((_, index) => !closed.includes(index));
  return shallowReactive(buildMultiTeamContext(view));
};
collaboration.contexts = { [HOST]: contextWithout([]) };

const disclosure = useRunListDisclosure({
  runHistoryStore: reactive({ selectedRunId: null, selectedTeamRunId: null, navigationTopologyRevision: 0, getTeamMemberNavigationAncestorRowKeys: () => [] }),
  runListStore: reactive({ entries, showRun: () => {} }),
  selectionStore: { selectedType: null, selectedRunId: null },
});
const noop = () => {};
const state = { ...disclosure, selectedRunId: null, isRunTerminating: () => false, isRunArchiving: () => false,
  isRunDeleting: () => false } as unknown as RunListSectionState;
const actions = new Proxy({}, { get: () => noop }) as RunListSectionActions;
const avatars = {
  showAgentAvatar: () => false, getAgentInitials: () => 'A', onAgentAvatarError: noop,
  showTeamAvatar: () => false, getTeamAvatarUrl: () => '', onTeamAvatarError: noop,
  showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: noop,
} as never;

const treeSelector = `[data-test="workspace-agent-run-task-tree"][data-run-id="${HOST}"]`;
// The row group's own children: the elements a move transition would slide.
const rows = () => [...document.querySelectorAll<HTMLElement>(`${treeSelector} > *`)];
// A row element keeps its element across renders (rows are keyed), so a key given on first sight follows the row.
let nextKey = 0;
const keyOf = (row: HTMLElement) => (row.dataset.probeKey ??= `row-${nextKey++}`);
/** The `copy`-th delegated Team row (in order) of the tree. */
const teamRow = (copy: number) => {
  const node = document.querySelectorAll<HTMLElement>(`${treeSelector} [data-node-kind="agent_team"]`)[copy];
  if (!node) throw new Error(`No delegated Team row ${copy}`);
  return rows().find((row) => row.contains(node))!;
};
/** Every delegated row with a layout box: its key, top, transform, opacity and whether it is leaving. */
const sample = () => rows().filter((row) => row.getClientRects().length > 0).map((row) => ({
  key: keyOf(row), top: Math.round(row.getBoundingClientRect().top), transform: getComputedStyle(row).transform,
  opacity: Number(getComputedStyle(row).opacity), leaving: row.className.includes('tree-row-leave'),
  taskLine: Boolean(row.querySelector('[data-test="workspace-task-worker-task-summary"]')),
}));
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
let recording: { frames: { t: number; rows: ReturnType<typeof sample> }[]; stop: boolean } | null = null;

(window as any).__runExpandMotionProbe = {
  host: HOST,
  delegated: DELEGATED,
  teamRowKey: (copy: number) => keyOf(teamRow(copy)),
  isExpanded: () => disclosure.isRunExpanded(HOST),
  rowCount: () => rows().length,
  taskLines: () => document.querySelectorAll(`${treeSelector} [data-test="workspace-task-worker-task-summary"]`).length,
  treeShown: () => Boolean(document.querySelector<HTMLElement>(treeSelector)?.getClientRects().length),
  sample,
  /** Clicks the run's disclosure and samples every delegated row for `frames` animation frames, then once settled. */
  async toggleAndSample(frames = 4, settleMs = 600) {
    const button = document.querySelector<HTMLButtonElement>(`[data-run-id="${HOST}"] [data-test="run-list-disclosure"]`);
    if (!button) throw new Error('No disclosure on the host run');
    button.click();
    const perFrame: ReturnType<typeof sample>[] = [];
    for (let index = 0; index < frames; index += 1) { await frame(); perFrame.push(sample()); }
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    return { perFrame, settled: sample() };
  },
  /** Records every animation frame until `stopRecording`. */
  startRecording() {
    recording = { frames: [], stop: false };
    const current = recording;
    const start = performance.now();
    const tick = () => {
      if (current.stop) return;
      current.frames.push({ t: Math.round(performance.now() - start), rows: sample() });
      if (current.frames.length < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  stopRecording() { if (!recording) return []; recording.stop = true; return recording.frames; },
  /** Opens a delegated Team row (its members appear under it). */
  expandTeam(copy: number) {
    const button = teamRow(copy).querySelector<HTMLButtonElement>('[data-test="workspace-team-transient-disclosure"]');
    if (!button) throw new Error(`No disclosure on delegated Team ${copy}`);
    button.click();
  },
  /** The delegation's Task is DONE: its row leaves the tree. */
  closeDelegation(copy: number) { collaboration.contexts = { [HOST]: contextWithout([copy]) }; },
};
</script>
