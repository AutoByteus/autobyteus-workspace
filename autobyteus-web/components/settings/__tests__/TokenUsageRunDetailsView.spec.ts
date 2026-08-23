import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import TokenUsageRunDetailsView from '../token-usage/TokenUsageRunDetailsView.vue';

const { storeSlot, messages } = vi.hoisted(() => ({
  storeSlot: { store: null as any },
  messages: {
    groupingSelectAriaLabel: 'Result grouping',
    groupingTask: 'Task',
    groupingModel: 'Model',
    startDateAriaLabel: 'Start date',
    endDateAriaLabel: 'End date',
    rangeSeparator: 'to',
    loadingStatistics: 'Loading…',
    fetchStatistics: 'Fetch Statistics',
    loadingStatisticsLong: 'Loading token usage statistics…',
    rangeMeaning: 'The date range selects runs by creation time; totals show each selected run’s lifetime usage.',
    historyMigrationRequired: 'Stored token history is temporarily unavailable while its data migration is incomplete. New runs remain available.',
    noTaskUsage: 'No agent or team usage found for this date range.',
    tryWiderRangeOrModel: 'Try a wider date range or switch to Model.',
    noModelUsage: 'No runtime/model usage found for this date range.',
    selectDatesAlert: 'Please select both start and end dates.',
  } as Record<string, string>,
}));

vi.mock('~/stores/tokenUsageRunStatistics', () => ({
  useTokenUsageRunStatisticsStore: () => storeSlot.store,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const template = messages[key.split('.').pop() ?? key] ?? key;
      return Object.entries(params ?? {}).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, String(value)).replace(`{{${name}}}`, String(value)),
        template,
      );
    },
  }),
}));

const createStore = (overrides: Record<string, unknown> = {}) => {
  const base: any = {
    taskRows: [{ rowId: 'team:one' }],
    modelRows: [{ rowId: 'runtime-model:codex:gpt' }],
    loading: false,
    error: null as string | null,
    fetchStatistics: vi.fn(async () => undefined),
    ...overrides,
  };
  Object.defineProperties(base, {
    getTaskRows: { get: () => base.taskRows },
    getModelRows: { get: () => base.modelRows },
    isLoading: { get: () => base.loading },
    getError: { get: () => base.error },
  });
  return reactive(base);
};

const flushMounted = async () => {
  await Promise.resolve();
  await nextTick();
};

const mountPage = async () => {
  const wrapper = mount(TokenUsageRunDetailsView, {
    global: {
      stubs: {
        TokenUsageTaskStatisticsTable: {
          props: ['rows'],
          template: '<section data-test="task-table">Task rows: {{ rows.length }}</section>',
        },
        TokenUsageModelStatisticsTable: {
          props: ['rows'],
          template: '<section data-test="model-table">Model rows: {{ rows.length }}</section>',
        },
      },
    },
  });
  await flushMounted();
  return wrapper;
};

const buttonByText = (wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) => wrapper
  .findAll('button')
  .find((button) => button.text().toLowerCase() === label.toLowerCase());

describe('TokenUsageRunDetailsView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    storeSlot.store = createStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the compact grouping/date/fetch control card and fetches dates without grouping arguments', async () => {
    const wrapper = await mountPage();

    expect(wrapper.find('h2').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Token Statistics');
    expect(wrapper.text()).not.toContain('Select date range');
    expect(wrapper.text()).not.toContain('Usage during period');
    expect(wrapper.text()).toContain('The date range selects runs by creation time; totals show each selected run’s lifetime usage.');
    expect(wrapper.text()).not.toMatch(/By task/i);
    expect(wrapper.text()).not.toMatch(/By model/i);
    expect(wrapper.text()).not.toContain('Group by');
    expect(wrapper.find('[title]').exists()).toBe(false);
    expect(wrapper.find('button.border-b-2').exists()).toBe(false);
    expect(wrapper.findAll('button')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Tasks created in period');
    expect(wrapper.text()).not.toContain('rangeMode');
    expect(wrapper.find('[data-test="task-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(false);
    expect(storeSlot.store.fetchStatistics).toHaveBeenCalledWith('2026-06-22', '2026-06-29');
    expect(storeSlot.store.fetchStatistics.mock.calls[0]).toHaveLength(2);

    const controlTags = wrapper
      .findAll('select, input[type="date"], button')
      .map((control) => control.element.tagName.toLowerCase());
    expect(controlTags).toEqual(['select', 'input', 'input', 'button']);

    const groupingSelect = wrapper.find('select');
    expect(groupingSelect.attributes('aria-label')).toBe('Result grouping');
    expect((groupingSelect.element as HTMLSelectElement).value).toBe('task');
    expect(Array.from((groupingSelect.element as HTMLSelectElement).options).map((option) => option.text)).toEqual(['Task', 'Model']);

    const [startInput, endInput] = wrapper.findAll('input[type="date"]');
    expect(startInput!.attributes('aria-label')).toBe('Start date');
    expect(endInput!.attributes('aria-label')).toBe('End date');
    expect((startInput!.element as HTMLInputElement).value).toBe('2026-06-22');
    expect((endInput!.element as HTMLInputElement).value).toBe('2026-06-29');

    await groupingSelect.setValue('model');
    expect((groupingSelect.element as HTMLSelectElement).value).toBe('model');
    expect(wrapper.find('[data-test="task-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(true);
    expect((startInput!.element as HTMLInputElement).value).toBe('2026-06-22');
    expect((endInput!.element as HTMLInputElement).value).toBe('2026-06-29');
  });

  it('uses the edited shared date range when switching grouping before fetching', async () => {
    const wrapper = await mountPage();
    const [startInput, endInput] = wrapper.findAll('input[type="date"]');

    await startInput!.setValue('2026-06-21');
    await endInput!.setValue('2026-06-28');
    await wrapper.find('select').setValue('model');
    await buttonByText(wrapper, 'Fetch Statistics')!.trigger('click');

    expect(storeSlot.store.fetchStatistics).toHaveBeenLastCalledWith('2026-06-21', '2026-06-28');
    expect(storeSlot.store.fetchStatistics.mock.calls.at(-1)).toHaveLength(2);
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(true);
  });

  it('renders explicit task and model empty states instead of a blank table', async () => {
    storeSlot.store = createStore({ taskRows: [], modelRows: [] });
    const wrapper = await mountPage();

    expect(wrapper.text()).toContain('No agent or team usage found for this date range.');
    expect(wrapper.text()).toContain('Try a wider date range or switch to Model.');
    expect(wrapper.find('[data-test="task-table"]').exists()).toBe(false);

    await wrapper.find('select').setValue('model');
    expect(wrapper.text()).toContain('No runtime/model usage found for this date range.');
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(false);
  });

  it('maps migration-incomplete history errors to an actionable alert', async () => {
    storeSlot.store = createStore({
      error: 'TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED: Migration status is FAILED.',
    });
    const wrapper = await mountPage();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain('Stored token history is temporarily unavailable');
    expect(alert.text()).toContain('New runs remain available');
    expect(alert.text()).not.toContain('TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED');
  });
});
