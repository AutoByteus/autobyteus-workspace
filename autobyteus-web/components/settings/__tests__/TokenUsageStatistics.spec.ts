import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import TokenUsageStatistics from '../TokenUsageStatistics.vue';

const { storeSlot, messages } = vi.hoisted(() => ({
  storeSlot: { store: null as any },
  messages: {
    select_date_range: 'Select date range',
    rangeSeparator: 'to',
    usageDuringPeriod: 'Usage during period',
    usageDuringPeriodHelp: 'Shows token usage ledger events observed in the selected dates.',
    loadingStatistics: 'Loading…',
    fetchStatistics: 'Fetch Statistics',
    byTask: 'By Task',
    byModel: 'By Model',
    loadingStatisticsLong: 'Loading token usage statistics…',
    noTaskUsage: 'No agent or team usage found for this date range.',
    tryWiderRangeOrByModel: 'Try a wider date range or switch to By Model.',
    noModelUsage: 'No runtime/model usage found for this date range.',
    selectDatesAlert: 'Please select both start and end dates.',
  } as Record<string, string>,
}));

vi.mock('~/stores/tokenUsageStatistics', () => ({
  useTokenUsageStatisticsStore: () => storeSlot.store,
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
  const wrapper = mount(TokenUsageStatistics, {
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

describe('TokenUsageStatistics settings page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    storeSlot.store = createStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('defaults to By Task, renders compact usage-period affordance, and fetches dates without range mode', async () => {
    const wrapper = await mountPage();

    expect(wrapper.find('h2').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Token Statistics');
    expect(wrapper.text()).toContain('Select date range');
    expect(wrapper.text()).toContain('Usage during period');
    expect(wrapper.text()).not.toContain('Usage during period help');
    expect(wrapper.find('[title]').attributes('title')).toBe('Usage during period help');
    expect(wrapper.text()).toMatch(/By task/i);
    expect(wrapper.text()).toMatch(/By model/i);
    expect(wrapper.text()).not.toContain('Tasks created in period');
    expect(wrapper.text()).not.toContain('rangeMode');
    expect(wrapper.find('[data-test="task-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(false);
    expect(storeSlot.store.fetchStatistics).toHaveBeenCalledWith('2026-06-22', '2026-06-29');
    expect(storeSlot.store.fetchStatistics.mock.calls[0]).toHaveLength(2);

    const [startInput, endInput] = wrapper.findAll('input[type="date"]');
    expect((startInput!.element as HTMLInputElement).value).toBe('2026-06-22');
    expect((endInput!.element as HTMLInputElement).value).toBe('2026-06-29');

    await buttonByText(wrapper, 'By Model')!.trigger('click');
    expect(wrapper.find('[data-test="task-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(true);
    expect((startInput!.element as HTMLInputElement).value).toBe('2026-06-22');
    expect((endInput!.element as HTMLInputElement).value).toBe('2026-06-29');
  });

  it('uses the edited shared date range for both tabs when fetching', async () => {
    const wrapper = await mountPage();
    const [startInput, endInput] = wrapper.findAll('input[type="date"]');

    await startInput!.setValue('2026-06-21');
    await endInput!.setValue('2026-06-28');
    await buttonByText(wrapper, 'By Model')!.trigger('click');
    await buttonByText(wrapper, 'Fetch Statistics')!.trigger('click');

    expect(storeSlot.store.fetchStatistics).toHaveBeenLastCalledWith('2026-06-21', '2026-06-28');
    expect(storeSlot.store.fetchStatistics.mock.calls.at(-1)).toHaveLength(2);
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(true);
  });

  it('renders explicit task and model empty states instead of a blank table', async () => {
    storeSlot.store = createStore({ taskRows: [], modelRows: [] });
    const wrapper = await mountPage();

    expect(wrapper.text()).toContain('No task usage');
    expect(wrapper.text()).toContain('Try wider range or by model');
    expect(wrapper.find('[data-test="task-table"]').exists()).toBe(false);

    await buttonByText(wrapper, 'By Model')!.trigger('click');
    expect(wrapper.text()).toContain('No model usage');
    expect(wrapper.find('[data-test="model-table"]').exists()).toBe(false);
  });
});
