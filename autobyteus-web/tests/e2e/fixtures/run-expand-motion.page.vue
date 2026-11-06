<template>
  <!-- autobyteus-390: the Runs view itself (the product RunListPanel and its rows), with an Agent run that delegated twelve
       Teams below four other runs, so its delegated rows are well below the top of the window. Each delegated Team is on
       a Task, so its row has a Task line once the probe lets the Task answers through. -->
  <main data-test="run-expand-motion-probe" class="min-h-screen bg-white p-4 text-slate-900">
    <aside class="h-[58rem] w-80 border-r">
      <RunListPanel />
    </aside>
  </main>
</template>
<script setup lang="ts">
import { shallowReactive } from 'vue';
import RunListPanel from '~/components/runList/RunListPanel.vue';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { buildMultiTeamContext, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture';
import { AgentStatus } from '~/types/agent/AgentStatus';

definePageMeta({ layout: false });
const HOST = 'probe-host-run';
const DELEGATED = 12;
// Newest first: the four other runs are newer, so the Project Task Manager's row is the fifth.
const run = (runId: string, name: string, minutesAgo: number, hasCollaboration: boolean) => {
  const at = new Date(Date.UTC(2026, 10, 6, 8, 0) - minutesAgo * 60_000).toISOString();
  return { agentDefinitionId: `definition-${runId}`, agentName: name, runs: [{ runId, summary: `${name} notes`,
    createdAt: at, lastActivityAt: at, status: AgentStatus.Offline, isActive: false, hasCollaboration }] };
};
const runHistory = useRunHistoryStore();
runHistory.workspaceGroups = [{ workspaceRootPath: '/probe', workspaceName: 'probe', teamDefinitions: [], agentDefinitions: [
  ...['Writer', 'Researcher', 'Reviewer', 'Planner'].map((name, index) => run(`probe-run-${index}`, name, index + 1, false)),
  run(HOST, 'Project Task Manager', 30, true),
] }] as never;

// The stored delegated view is already in the store, as after its first load: no server read.
const collaboration = useAgentRunCollaborationStore();
const contextWithout = (closed: readonly number[]) => {
  const view = multiTeamView(DELEGATED, HOST);
  view.execution_tree.taskExecutions = view.execution_tree.taskExecutions.filter((_, index) => !closed.includes(index));
  return shallowReactive(buildMultiTeamContext(view));
};
collaboration.contexts = { [HOST]: contextWithout([]) };
const isExpanded = () => document.querySelector(`li[data-run-id="${HOST}"] [data-test="run-list-disclosure"]`)?.getAttribute('aria-expanded') === 'true';

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
  isExpanded,
  rowCount: () => rows().length,
  taskLines: () => document.querySelectorAll(`${treeSelector} [data-test="workspace-task-worker-task-summary"]`).length,
  treeShown: () => Boolean(document.querySelector<HTMLElement>(treeSelector)?.getClientRects().length),
  sample,
  /** Clicks the run's disclosure and samples every delegated row for `frames` animation frames, then once settled. */
  async toggleAndSample(frames = 4, settleMs = 600) {
    const button = document.querySelector<HTMLButtonElement>(`li[data-run-id="${HOST}"] [data-test="run-list-disclosure"]`);
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
  /**
   * The move class's transition on a delegated row inside the Runs view, and on the same row placed outside it (AC-006).
   * Vue decides whether a group moves the same way: it clones a row with the move class into the group.
   */
  moveTransitions() {
    const tree = document.querySelector<HTMLElement>(treeSelector);
    const row = rows()[0];
    if (!tree || !row) throw new Error('No delegated row');
    const clone = () => { const node = row.cloneNode() as HTMLElement; node.removeAttribute('data-probe-key'); node.className = 'tree-row-move'; return node; };
    const inside = clone();
    const outside = clone();
    tree.append(inside);
    document.body.append(outside);
    try { return { insideRunsView: getComputedStyle(inside).transition, outsideRunsView: getComputedStyle(outside).transition }; }
    finally { inside.remove(); outside.remove(); }
  },
  /** The delegation's Task is DONE: its row leaves the tree. */
  closeDelegation(copy: number) { collaboration.contexts = { [HOST]: contextWithout([copy]) }; },
};
</script>
