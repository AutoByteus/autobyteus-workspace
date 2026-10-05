import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCatalog } from '~/localization/runtime/catalogRegistry';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';
import type { BackgroundTask } from '~/types/backgroundTask';

const activeContextStoreMock = reactive({ activeAgentContext: { state: { runId: 'run-1' } } as { state: { runId: string } } | null });
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => activeContextStoreMock }));

const catalog = getCatalog('en') as Record<string, string>;
const translate = (key: string, params: Record<string, unknown> = {}) => {
  const template = catalog[key];
  if (template === undefined) throw new Error(`missing translation ${key}`);
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), template);
};
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: translate }) }));

import BackgroundTaskPanel from '../BackgroundTaskPanel.vue';

const task = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  taskId: 'task-1', kind: 'shell', description: 'sleep 20; echo done > marker', command: null, status: 'running',
  summary: null, startedAt: '2026-09-29T16:48:20.000Z', ...overrides,
});

const mountPanel = (collapsed = false) => mount(BackgroundTaskPanel, {
  props: { collapsed },
  attachTo: document.body,
  global: { stubs: { Icon: { props: ['icon'], template: '<svg :data-icon="icon" />' } }, mocks: { $t: translate } },
});

describe('BackgroundTaskPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    activeContextStoreMock.activeAgentContext = { state: { runId: 'run-1' } };
  });

  it('shows the title, zero counts and the empty state for a run without background tasks (AC-002)', () => {
    const wrapper = mountPanel();

    expect(wrapper.get('h3').text()).toBe('Background Tasks');
    expect(wrapper.get('[data-test="background-tasks-counts"]').text()).toBe('0 running · 0 total');
    expect(wrapper.get('[data-test="background-tasks-empty"]').text()).toBe('No background tasks');
    expect(wrapper.text()).not.toMatch(/To-Do|to-dos/i);
  });

  it('lists tasks newest first with description, kind and status, and counts running and total (AC-007, AC-012)', async () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task({ taskId: 'old', description: 'pnpm dev', startedAt: '2026-09-29T16:00:00.000Z', status: 'failed', summary: 'The command exited with code 3.' }));
    store.upsertTask('run-1', task({ taskId: 'new', kind: 'subagent', description: 'Research lighthouses' }));
    store.upsertTask('other-run', task({ taskId: 'foreign' }));
    const wrapper = mountPanel();

    const rows = wrapper.findAll('[data-test="background-task-row"]');
    expect(rows.map((row) => row.attributes('data-status'))).toEqual(['running', 'failed']);
    expect(rows[0]!.text()).toContain('Research lighthouses');
    expect(rows[0]!.text()).toContain('Subagent');
    expect(rows[0]!.text()).toContain('Running');
    expect(rows[0]!.find('[data-test="background-task-summary"]').exists()).toBe(false);
    expect(rows[1]!.text()).toContain('Shell');
    expect(rows[1]!.text()).toContain('Failed');
    expect(rows[1]!.get('[data-test="background-task-summary"]').text()).toBe('The command exited with code 3.');
    expect(wrapper.get('[data-test="background-tasks-counts"]').text()).toBe('1 running · 2 total');

    store.upsertTask('run-1', task({ taskId: 'new', kind: 'subagent', description: 'Research lighthouses', status: 'completed', summary: 'Wrote it.' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="background-tasks-counts"]').text()).toBe('0 running · 2 total');
  });

  it('shows the full description on hover and expands a long summary on click', async () => {
    const summary = 'line one\nline two\nline three';
    useAgentBackgroundTaskStore().upsertTask('run-1', task({ status: 'completed', summary }));
    const wrapper = mountPanel();

    expect(wrapper.get('[data-test="background-task-row"] p').attributes('title')).toBe('sleep 20; echo done > marker');
    const button = wrapper.get('[data-test="background-task-summary"]');
    expect(button.attributes('title')).toBe(summary);
    expect(button.attributes('aria-expanded')).toBe('false');
    expect(button.classes()).toContain('line-clamp-2');

    await button.trigger('click');

    expect(button.attributes('aria-expanded')).toBe('true');
    expect(button.classes()).toContain('whitespace-pre-wrap');
  });

  it('falls back to a generic label when a task has no description', () => {
    useAgentBackgroundTaskStore().upsertTask('run-1', task({ description: '' }));

    expect(mountPanel().get('[data-test="background-task-row"] p').text()).toBe('Background task');
  });

  it('shows the command after the kind label in a monospace single truncated line (AC-001, REQ-005)', () => {
    useAgentBackgroundTaskStore().upsertTask('run-1', task({
      description: 'Wait for release workflows to complete', command: 'gh run watch 42 --exit-status',
    }));
    const wrapper = mountPanel();

    const row = wrapper.get('[data-test="background-task-row"]');
    expect(row.get('p').text()).toBe('Wait for release workflows to complete');
    expect(row.get('[data-test="background-task-kind-line"]').findAll('span').map((part) => part.text())).toEqual(['Shell', '·']);
    const command = row.get('[data-test="background-task-command"]');
    expect(command.element.tagName).toBe('BUTTON');
    expect(command.text()).toBe('gh run watch 42 --exit-status');
    expect(command.classes()).toEqual(expect.arrayContaining(['font-mono', 'truncate']));
  });

  it('keeps showing the command after the task finishes, next to its summary (AC-001)', () => {
    useAgentBackgroundTaskStore().upsertTask('run-1', task({
      description: 'Probe background sleep', command: 'sleep 6 && echo BG_DONE', status: 'completed',
      summary: 'Background command "Probe background sleep" completed (exit code 0)',
    }));
    const row = mountPanel().get('[data-test="background-task-row"]');

    expect(row.get('[data-test="background-task-command"]').text()).toBe('sleep 6 && echo BG_DONE');
    expect(row.get('[data-test="background-task-summary"]').text()).toContain('exit code 0');
  });

  it('shows a long command in full on hover and expands and collapses it on click (AC-003, QR-002)', async () => {
    const longCommand = 'cd /tmp && for i in $(seq 1 110); do gh run list --workflow release.yml --limit 1; sleep 30; done\necho finished';
    useAgentBackgroundTaskStore().upsertTask('run-1', task({ description: 'Wait for release workflows', command: longCommand }));
    const wrapper = mountPanel();

    const command = wrapper.get('[data-test="background-task-command"]');
    expect(command.attributes('title')).toBe(longCommand);
    expect(command.attributes('type')).toBe('button');
    expect(command.attributes('aria-expanded')).toBe('false');
    expect(command.classes()).toContain('truncate');

    await command.trigger('click');
    expect(command.attributes('aria-expanded')).toBe('true');
    expect(command.classes()).toEqual(expect.arrayContaining(['whitespace-pre-wrap', 'break-all']));
    expect(command.classes()).not.toContain('truncate');

    await command.trigger('click');
    expect(command.attributes('aria-expanded')).toBe('false');
    expect(command.classes()).toContain('truncate');
  });

  it('expands a command independently of the summary of the same row', async () => {
    useAgentBackgroundTaskStore().upsertTask('run-1', task({ description: 'Build', command: 'pnpm build', status: 'failed', summary: 'exit 1' }));
    const wrapper = mountPanel();

    await wrapper.get('[data-test="background-task-command"]').trigger('click');

    expect(wrapper.get('[data-test="background-task-command"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-test="background-task-summary"]').attributes('aria-expanded')).toBe('false');
  });

  it('does not repeat a command that is already the title (AGY, AC-004, REQ-006)', () => {
    useAgentBackgroundTaskStore().upsertTask('run-1', task({ description: 'npm run dev', command: 'npm run dev ' }));
    const row = mountPanel().get('[data-test="background-task-row"]');

    expect(row.get('p').text()).toBe('npm run dev');
    expect(row.find('[data-test="background-task-command"]').exists()).toBe(false);
    expect(row.get('[data-test="background-task-kind-line"]').text()).toBe('Shell');
  });

  it.each([
    ['an unknown command', { kind: 'shell' as const, command: null }],
    ['a blank command', { kind: 'shell' as const, command: '   ' }],
    ['a subagent task', { kind: 'subagent' as const, description: 'Review the diff', command: null }],
  ])('renders the row exactly as before for %s (AC-005, REQ-004)', (_label, overrides) => {
    useAgentBackgroundTaskStore().upsertTask('run-1', task(overrides));
    const row = mountPanel().get('[data-test="background-task-row"]');

    expect(row.find('[data-test="background-task-command"]').exists()).toBe(false);
    expect(row.get('[data-test="background-task-kind-line"]').text()).toBe(overrides.kind === 'shell' ? 'Shell' : 'Subagent');
    expect(row.text()).not.toContain('null');
    expect(row.text()).not.toContain('·');
  });

  it('adds the command to the existing row when a follow-up snapshot reports it (REQ-007)', async () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task({ description: 'Probe background sleep' }));
    const wrapper = mountPanel();
    expect(wrapper.find('[data-test="background-task-command"]').exists()).toBe(false);

    store.upsertTask('run-1', task({ description: 'Probe background sleep', command: 'sleep 6 && echo BG_DONE' }));
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('[data-test="background-task-row"]')).toHaveLength(1);
    expect(wrapper.get('[data-test="background-task-command"]').text()).toBe('sleep 6 && echo BG_DONE');
  });

  it('hides the list when collapsed and emits toggle from the header', async () => {
    const wrapper = mountPanel(true);

    expect(wrapper.get('[data-test="background-tasks-empty"]').isVisible()).toBe(false);
    await wrapper.get('[data-test="background-tasks-header"]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });
});
