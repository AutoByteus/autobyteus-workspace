import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setActiveTab = vi.fn();
const setHighlightedActivity = vi.fn();
const postToolExecutionApproval = vi.fn();

const activeContextStoreMock = {
  activeAgentContext: {
    state: {
      runId: 'run-1',
    },
  },
  postToolExecutionApproval,
};

vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => activeContextStoreMock,
}));

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => ({
    setActiveTab,
  }),
}));

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({
    setHighlightedActivity,
  }),
}));

import ToolCallIndicator from '../ToolCallIndicator.vue';
import { buildToolCardPresentation } from '~/utils/toolCardPresentation';

const baseSegment = {
  type: 'tool_call' as const,
  invocationId: 'abc123def456',
  toolName: 'ReadFile',
  arguments: {
    path: '/tmp/project/report.md',
  },
  status: 'success' as const,
  approvalTarget: null,
  logs: [],
  result: null,
  error: null,
};

const mountIndicator = (overrides: Record<string, unknown>) => mount(ToolCallIndicator, {
  props: { presentation: buildToolCardPresentation({
    ...baseSegment,
    ...overrides,
    arguments: overrides.args ?? baseSegment.arguments,
    error: overrides.errorMessage ?? baseSegment.error,
  } as any) },
  global: {
    mocks: {
      $t: (key: string) => {
        if (key.endsWith('.approve')) return 'Approve';
        if (key.endsWith('.deny')) return 'Deny';
        return key;
      },
    },
  },
});

describe('ToolCallIndicator.vue', () => {
  beforeEach(() => {
    setActiveTab.mockReset();
    setHighlightedActivity.mockReset();
    postToolExecutionApproval.mockReset().mockResolvedValue(undefined);
    activeContextStoreMock.activeAgentContext.state.runId = 'run-1';
  });

  it.each([
    {
      status: 'success',
      forbiddenLabel: 'success',
      icon: 'heroicons:check-circle-solid',
    },
    {
      status: 'error',
      forbiddenLabel: 'failed',
      icon: 'heroicons:exclamation-circle-solid',
    },
    {
      status: 'approved',
      forbiddenLabel: 'approved',
      icon: 'heroicons:check-badge-solid',
    },
    {
      status: 'denied',
      forbiddenLabel: 'denied',
      icon: 'heroicons:x-circle-solid',
    },
  ])('omits the center status label for $status while preserving the status icon', ({ status, forbiddenLabel, icon }) => {
    const wrapper = mountIndicator({ status });

    expect(wrapper.text().toLowerCase()).not.toContain(forbiddenLabel);
    expect(wrapper.find(`[data-icon="${icon}"]`).exists()).toBe(true);
  });

  it('omits the center running label while preserving the executing spinner', () => {
    const wrapper = mountIndicator({ status: 'executing' });

    expect(wrapper.text().toLowerCase()).not.toContain('running');
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it('keeps the reclaimed header space focused on tool context content', () => {
    const wrapper = mountIndicator({
      status: 'success',
      toolName: 'read_file',
    });

    expect(wrapper.text()).toContain('read_file');
    expect(wrapper.text()).toContain('report.md');
    expect(wrapper.text().toLowerCase()).not.toContain('success');
  });

  it('keeps the full command summary available for responsive truncation instead of hard-cutting it in JavaScript', () => {
    const command = 'printf "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda"';
    const wrapper = mountIndicator({
      status: 'success',
      toolName: 'run_bash',
      args: {
        command,
      },
    });

    const summary = wrapper.get('[data-test="tool-context-summary"]');
    expect(summary.text()).toContain('theta iota kappa lambda');
    expect(summary.attributes('title')).toBe(command);
  });

  it('keeps a failed tool compact without rendering any short error detail', () => {
    const wrapper = mountIndicator({
      status: 'error',
      errorMessage: 'Permission denied',
    });

    expect(wrapper.text()).not.toContain('Permission denied');
    expect(wrapper.text().toLowerCase()).not.toContain('failed');
    expect(wrapper.find('[data-test="tool-error-message"]').exists()).toBe(false);
    expect(wrapper.find('[data-icon="heroicons:exclamation-circle-solid"]').exists()).toBe(true);
  });

  it('does not copy a very large multiline diagnostic into center visible or DOM text', () => {
    const lines = Array.from({ length: 1915 }, (_, index) => `line-${index}: ${'x'.repeat(170)}`);
    const diagnosticPrefix = lines.join('\n');
    const diagnostic = `${diagnosticPrefix}${'x'.repeat(348_978 - diagnosticPrefix.length)}`;
    const wrapper = mountIndicator({
      status: 'error',
      toolName: 'run_bash',
      args: { command: 'rg evidence | head -1400' },
      errorMessage: diagnostic,
    });

    expect(diagnostic).toHaveLength(348_978);
    expect(diagnostic.split('\n')).toHaveLength(1915);
    expect(wrapper.text()).toContain('run_bash');
    expect(wrapper.text()).toContain('rg evidence | head -1400');
    expect(wrapper.text()).not.toContain('line-0:');
    expect(wrapper.find('[data-test="tool-error-message"]').exists()).toBe(false);
  });

  it('keeps non-awaiting rows navigable to the Activity panel', async () => {
    const wrapper = mountIndicator({ status: 'success' });

    await wrapper.get('[role="button"]').trigger('click');

    expect(setActiveTab).toHaveBeenCalledWith('progress');
    expect(setHighlightedActivity).toHaveBeenCalledWith('run-1', 'abc123def456');
  });

  it.each(['keydown.enter', 'keydown.space'])('keeps failed-row %s navigation to the exact Activity item', async (event) => {
    const wrapper = mountIndicator({ status: 'error', errorMessage: 'diagnostic' });

    await wrapper.get('[role="button"]').trigger(event);

    expect(setActiveTab).toHaveBeenCalledWith('progress');
    expect(setHighlightedActivity).toHaveBeenCalledWith('run-1', 'abc123def456');
  });

  it('keeps awaiting-approval rows on the inline approval path instead of Activity navigation', async () => {
    const wrapper = mountIndicator({ status: 'awaiting-approval' });

    expect(wrapper.text()).toContain('Approve');
    expect(wrapper.text()).toContain('Deny');
    expect(wrapper.find('[data-icon="heroicons:chevron-right"]').exists()).toBe(false);

    await wrapper.get('.rounded-lg').trigger('click');
    expect(setActiveTab).not.toHaveBeenCalled();
    expect(setHighlightedActivity).not.toHaveBeenCalled();

    await wrapper.get('button:last-of-type').trigger('click');
    expect(postToolExecutionApproval).toHaveBeenCalledWith('abc123def456', true, null, null);
  });
});
