import { describe, expect, it } from 'vitest';
import { CodexBackgroundTaskView, parseCodexBackgroundTerminalPage, safeCodexCommandDescription } from '../../../../../../src/agent-execution/backends/codex/thread/codex-background-task-view.js';

const start = (processId = 'opaque-process', turnId = 'turn-1') => ({
  threadId: 'thread-1', turnId,
  item: { id: 'item-1', processId, type: 'commandExecution', command: '/bin/bash -c SECRET_ARG', status: 'inProgress' },
});
const end = (exitCode: number | null = 0, processId = 'opaque-process', turnId = 'turn-1') => ({
  ...start(processId, turnId), item: { ...start(processId, turnId).item, status: exitCode === 0 ? 'completed' : 'failed', exitCode, aggregatedOutput: 'SECRET_OUTPUT' },
});
const listed = (processId = 'opaque-process') => ({ itemId: 'item-1', processId, description: 'bash' });
const finishTurn = (view: CodexBackgroundTaskView, turnId = 'turn-1') => view.observeTurnCompleted('thread-1', { threadId: 'thread-1', turn: { id: turnId } }, turnId);

describe('Codex read-only background observation', () => {
  it('excludes foreground list membership; retains the same command beyond its exact turn', () => {
    const view = new CodexBackgroundTaskView();
    view.observeStarted('thread-1', start());
    expect(view.reconcile([listed()], false)).toEqual([]);
    finishTurn(view);
    expect(view.reconcile([listed()], true)).toMatchObject([{ kind: 'shell', status: 'running', command: null }]);
  });
  it.each([0, 3, -1])('settles post-turn exit %s without model polling, and never revives on stale membership', code => {
    const view = new CodexBackgroundTaskView();
    view.observeStarted('thread-1', start()); finishTurn(view);
    view.beginInspection(); view.observeCompleted('thread-1', end(code), true);
    const rows = view.reconcile([listed()], true); view.finishInspection();
    expect(rows).toMatchObject([{ status: code === 0 ? 'completed' : 'failed', exitCode: code }]);
    expect(JSON.stringify(rows)).not.toMatch(/SECRET|opaque-process|item-1|thread-1/);
    expect(view.reconcile([listed()], false)[0]?.status).toBe(code === 0 ? 'completed' : 'failed');
  });
  it('keeps provisional idle-page identity across a new turn and late completion while more pages are pending', () => {
    const view = new CodexBackgroundTaskView(); view.beginInspection();
    view.observeListedPage([listed()], null, true);
    view.observeCompleted('thread-1', end(), false);
    expect(view.reconcile([listed()], false)).toMatchObject([{ status: 'completed' }]);
    view.finishInspection();
  });
  it('withheld page membership becomes eligible at that turn boundary, not a later foreground completion', () => {
    const view = new CodexBackgroundTaskView(); view.beginInspection();
    view.observeListedPage([listed()], 'turn-1', false); finishTurn(view);
    expect(view.reconcile([listed()], false)).toMatchObject([{ status: 'running' }]); view.finishInspection();
    const foreground = new CodexBackgroundTaskView(); foreground.beginInspection();
    foreground.observeListedPage([listed()], 'turn-1', false);
    foreground.observeCompleted('thread-1', end(), false); finishTurn(foreground);
    expect(foreground.reconcile([listed()], true)).toEqual([]); foreground.finishInspection();
  });
  it('absence is unknown and positive evidence restores running, not fabricated success', () => {
    const view = new CodexBackgroundTaskView();
    expect(view.reconcile([listed()], true)[0]?.status).toBe('running');
    expect(view.reconcile([], true)[0]?.status).toBe('unknown');
    expect(view.reconcile([listed()], true)[0]?.status).toBe('running');
  });
  it('withholds unknown-origin membership during a turn, discovers it when idle', () => {
    const view = new CodexBackgroundTaskView();
    expect(view.reconcile([listed()], false)).toEqual([]);
    expect(view.reconcile([listed()], true)).toHaveLength(1);
  });
  it('merges completion of a first-read identity even if another turn starts before the response', () => {
    const view = new CodexBackgroundTaskView();
    view.beginInspection(); view.observeCompleted('thread-1', end(), true);
    expect(view.reconcile([listed()], false)).toMatchObject([{ status: 'completed' }]);
    view.finishInspection();
  });
  it('does not turn foreground completion during a read into background history', () => {
    const view = new CodexBackgroundTaskView();
    view.observeStarted('thread-1', start()); view.beginInspection();
    view.observeCompleted('thread-1', end(), false); finishTurn(view);
    expect(view.reconcile([listed()], true)).toEqual([]);
    view.finishInspection();
    expect((view as any).commands.size).toBe(0);
    expect((view as any).pendingCompletions.size).toBe(0);
  });
  it('rejects conflicting turn/thread/process matches and treats reused item IDs as different commands', () => {
    const view = new CodexBackgroundTaskView();
    view.observeStarted('thread-1', start()); finishTurn(view);
    view.observeCompleted('thread-1', { ...end(), threadId: 'thread-2' }, true);
    view.observeCompleted('thread-1', { ...end(), turn_id: 'forged-turn' }, true);
    view.observeCompleted('thread-1', end(0, 'other-process'), true);
    view.observeCompleted('thread-1', end(0, 'opaque-process', 'other-turn'), true);
    expect(view.reconcile([listed()], true)[0]?.status).toBe('running');
    const rows = view.reconcile([listed(), listed('other-process')], true);
    expect(new Set(rows.map(row => row.taskId)).size).toBe(2);
  });
  it('requires exact turn completion and does not classify from a stale/conflicting boundary', () => {
    const view = new CodexBackgroundTaskView(); view.observeStarted('thread-1', start());
    view.observeTurnCompleted('thread-1', { threadId: 'thread-1', turnId: 'other', turn: { id: 'turn-1' } }, 'turn-1');
    expect(view.reconcile([listed()], false)).toEqual([]);
  });
  it('keeps missing exit evidence unknown', () => {
    const view = new CodexBackgroundTaskView(); view.observeStarted('thread-1', start()); finishTurn(view);
    const terminal = end(null); terminal.item.status = 'completed';
    view.observeCompleted('thread-1', terminal, true);
    expect(view.reconcile([listed()], true)).toMatchObject([{ status: 'unknown', exitCode: null }]);
  });
  it('bounds terminal history without evicting live/unknown observations', () => {
    const view = new CodexBackgroundTaskView();
    view.reconcile([listed('keep-unknown')], true);
    for (let i = 0; i < 110; i++) {
      view.observeStarted('thread-1', start(String(i))); finishTurn(view);
      view.observeCompleted('thread-1', end(0, String(i)), true);
    }
    const rows = view.reconcile([], true);
    expect(rows.filter(row => row.status === 'completed')).toHaveLength(100);
    expect(rows.filter(row => row.status === 'unknown')).toHaveLength(1);
    view.clear(); expect(view.reconcile([], true)).toEqual([]);
  });
  it('validates complete pages and projects no raw command/output/OS identity', () => {
    expect(parseCodexBackgroundTerminalPage({ data: [], nextCursor: null })).toEqual({ data: [], nextCursor: null });
    expect(parseCodexBackgroundTerminalPage({ data: [] })).toBeNull();
    expect(parseCodexBackgroundTerminalPage({ data: [{ itemId: 'x' }], nextCursor: null })).toBeNull();
    const page = parseCodexBackgroundTerminalPage({ data: [{ ...listed(), command: '/usr/bin/node SECRET', cwd: '/private', osPid: 123, output: 'SECRET' }], nextCursor: null });
    expect(page).toEqual({ data: [{ ...listed(), description: 'node' }], nextCursor: null });
  });
  it.each([['node --token=secret', 'node'], ['/bin/bash -c secret', 'bash'], ['TOKEN=secret node', ''], ["'node' secret", ''], ['node;echo secret', '']])('safe label %s', (command, expected) => {
    expect(safeCodexCommandDescription(command)).toBe(expected);
  });
});
