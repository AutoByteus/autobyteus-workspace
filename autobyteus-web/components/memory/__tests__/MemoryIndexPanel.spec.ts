import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryIndexPanel from '../MemoryIndexPanel.vue';
import { useMemorySearchStore } from '~/stores/memorySearchStore';
import type { IndexStatus, IndexStep, StepState } from '~/types/memorySearch';

const steps = (states: [StepState, number][], totals = [3654, 3654, 7385, 7385]): IndexStep[] =>
  (['runs', 'journals', 'text', 'meaning'] as const).map((id, i) => ({ id, state: states[i]![0], done: states[i]![1], total: totals[i]!, message: null }));
const indexStatus = (overrides: Partial<IndexStatus>): IndexStatus => ({
  phase: 'ready', steps: steps([['done', 3654], ['done', 3654], ['done', 7385], ['done', 7385]]), builtWithModel: 'granite', activeModel: 'granite',
  updatedAt: '2026-10-26T09:00:00.000Z', runCount: 3654, textIndexHasContent: true, ...overrides,
});
const mountPanel = (index: IndexStatus) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemorySearchStore();
  store.index = index;
  return { store, wrapper: mount(MemoryIndexPanel, { global: { plugins: [pinia], stubs: { NuxtLink: { template: '<a><slot /></a>' } } } }) };
};
const stepStates = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[data-step]').map((item) => [item.attributes('data-step'), item.attributes('data-state')]);

describe('MemoryIndexPanel', () => {
  it('first time: four waiting steps and Index now, which starts the build only on the click', async () => {
    const { store, wrapper } = mountPanel(indexStatus({ phase: 'needs_index', steps: steps([['waiting', 0], ['waiting', 0], ['waiting', 0], ['waiting', 0]], [0, 0, 0, 0]), builtWithModel: null, textIndexHasContent: false }));
    expect(stepStates(wrapper)).toEqual([['runs', 'waiting'], ['journals', 'waiting'], ['text', 'waiting'], ['meaning', 'waiting']]);
    expect(wrapper.find('[data-test="memory-index-first-time"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="memory-index-rebuild"]').exists()).toBe(false);
    expect(store.startIndex).not.toHaveBeenCalled();
    await wrapper.get('[data-test="memory-index-now"]').trigger('click');
    expect(store.startIndex).toHaveBeenCalledTimes(1);
  });

  it('building: the running step, progress bars named after their steps, Rebuild disabled', () => {
    const { wrapper } = mountPanel(indexStatus({ phase: 'building', steps: steps([['done', 3654], ['done', 3654], ['running', 3692], ['waiting', 0]]) }));
    expect(stepStates(wrapper)).toEqual([['runs', 'done'], ['journals', 'done'], ['text', 'running'], ['meaning', 'waiting']]);
    const bars = wrapper.findAll('[role="progressbar"]');
    expect(bars.map((bar) => bar.attributes('aria-valuenow'))).toEqual(['100', '100', '49', '0']);
    expect(wrapper.get('[data-test="memory-index-rebuild"]').attributes('disabled')).toBeDefined();
  });

  it('failed: the reason on the failed step, Try again resumes', async () => {
    const failedSteps = steps([['done', 3654], ['failed', 120], ['waiting', 0], ['waiting', 0]]);
    failedSteps[1]!.message = 'EACCES: permission denied';
    const { store, wrapper } = mountPanel(indexStatus({ phase: 'failed', steps: failedSteps }));
    expect(wrapper.get('[data-test="memory-index-step-error"]').text()).toBe('EACCES: permission denied');
    await wrapper.get('[data-test="memory-index-retry"]').trigger('click');
    expect(store.startIndex).toHaveBeenCalledTimes(1);
  });

  it('model changed: names both models; Rebuild asks first, then rebuilds; Cancel does not', async () => {
    const { store, wrapper } = mountPanel(indexStatus({ builtWithModel: 'leaf-ir', activeModel: 'granite' }));
    expect(wrapper.find('[data-test="memory-index-model-changed"]').exists()).toBe(true);
    await wrapper.get('[data-test="memory-index-rebuild"]').trigger('click');
    expect(wrapper.get('[role="alertdialog"]').exists()).toBe(true);
    await wrapper.findAll('[role="alertdialog"] button')[1]!.trigger('click');
    expect(store.rebuild).not.toHaveBeenCalled();
    await wrapper.get('[data-test="memory-index-rebuild"]').trigger('click');
    await wrapper.get('[data-test="memory-index-rebuild-yes"]').trigger('click');
    expect(store.rebuild).toHaveBeenCalledTimes(1);
  });

  it('ready: every step done and Rebuild available', () => {
    const { wrapper } = mountPanel(indexStatus({}));
    expect(stepStates(wrapper).every(([, state]) => state === 'done')).toBe(true);
    expect(wrapper.get('[data-test="memory-index-rebuild"]').attributes('disabled')).toBeUndefined();
  });
});
