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
  taskId: 'task-1', kind: 'shell', description: 'sleep 20; echo done > marker', status: 'running',
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

  it('hides the list when collapsed and emits toggle from the header', async () => {
    const wrapper = mountPanel(true);

    expect(wrapper.get('[data-test="background-tasks-empty"]').isVisible()).toBe(false);
    await wrapper.get('[data-test="background-tasks-header"]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });
});
