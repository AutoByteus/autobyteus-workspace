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

const baseProps = {
  invocationId: 'abc123def456',
  toolName: 'ReadFile',
  args: {
    path: '/tmp/project/report.md',
  },
};

const mountIndicator = (props: Record<string, unknown>) => mount(ToolCallIndicator, {
  props: {
    ...baseProps,
    ...props,
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

  it('keeps the inline error details row available without restoring the failed label', () => {
    const wrapper = mountIndicator({
      status: 'error',
      errorMessage: 'Permission denied',
    });

    expect(wrapper.text()).toContain('Permission denied');
    expect(wrapper.text().toLowerCase()).not.toContain('failed');
    expect(wrapper.find('[data-icon="heroicons:exclamation-circle-solid"]').exists()).toBe(true);
  });

  it('keeps non-awaiting rows navigable to the Activity panel', async () => {
    const wrapper = mountIndicator({ status: 'success' });

    await wrapper.get('[role="button"]').trigger('click');

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
    expect(postToolExecutionApproval).toHaveBeenCalledWith('abc123def456', true);
  });
});
