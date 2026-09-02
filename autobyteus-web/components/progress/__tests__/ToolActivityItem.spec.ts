import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { ToolActivity } from '~/types/activity/RunActivity';
import ToolActivityItem from '../ToolActivityItem.vue';

const IconStub = {
  name: 'Icon',
  props: ['icon'],
  template: '<i class="icon-stub" :data-icon="icon" />',
};

const activity: ToolActivity = {
  kind: 'tool',
  activityId: 'abc123def456',
  invocationId: 'abc123def456',
  toolName: 'ReadFile',
  type: 'tool_call',
  status: 'success',
  contextText: '',
  arguments: {},
  logs: [],
  result: null,
  error: null,
  timestamp: new Date('2026-04-08T10:00:00.000Z'),
};

const buildLargeError = (): string => {
  const lines = Array.from({ length: 1915 }, (_, index) => `line-${index}: ${'x'.repeat(170)}`);
  const prefix = lines.join('\n');
  return `${prefix}${'x'.repeat(348_978 - prefix.length)}`;
};

const mountItem = (overrides: Partial<ToolActivity> = {}, isHighlighted = false) => mount(ToolActivityItem, {
  props: {
    activity: { ...activity, ...overrides },
    isHighlighted,
  },
  global: {
    stubs: {
      Icon: IconStub,
    },
  },
});

describe('ToolActivityItem.vue', () => {
  it('keeps the right-panel status chip text and short debug id visible', () => {
    const wrapper = mountItem();

    expect(wrapper.get('.rounded-full').text()).toBe('Success');
    expect(wrapper.text()).toContain('#abc123');
  });

  it('keeps a complete very large Error collapsed until each explicit toggle', async () => {
    const error = buildLargeError();
    const wrapper = mountItem({ status: 'error', error });
    const toggle = wrapper.get('[data-test="tool-activity-error-toggle"]');
    const body = wrapper.get('[data-test="tool-activity-error-body"]');

    expect(error).toHaveLength(348_978);
    expect(error.split('\n')).toHaveLength(1915);
    expect(toggle.isVisible()).toBe(true);
    expect(body.attributes('style')).toContain('display: none');

    await toggle.trigger('click');
    expect(body.attributes('style') ?? '').not.toContain('display: none');
    expect(body.text()).toBe(error);
    expect(body.get('.whitespace-pre-wrap').classes()).toContain('whitespace-pre-wrap');

    await toggle.trigger('click');
    expect(body.attributes('style')).toContain('display: none');
    await toggle.trigger('click');
    expect(body.attributes('style') ?? '').not.toContain('display: none');
    expect(body.text()).toBe(error);
  });

  it('does not auto-expand Error when a failed item is highlighted or updated', async () => {
    const wrapper = mountItem({ status: 'error', error: 'initial diagnostic' });
    const body = wrapper.get('[data-test="tool-activity-error-body"]');

    expect(body.attributes('style')).toContain('display: none');
    await wrapper.setProps({ isHighlighted: true });
    expect(body.attributes('style')).toContain('display: none');
    await wrapper.setProps({
      activity: { ...activity, status: 'error', error: 'replayed diagnostic' },
    });
    expect(body.attributes('style')).toContain('display: none');
  });

  it('preserves the successful Result collapsed default', () => {
    const wrapper = mountItem({ status: 'success', result: 'successful output' });
    const result = wrapper.get('.bg-white.border-gray-200.whitespace-pre-wrap');

    expect(result.element.parentElement?.getAttribute('style')).toContain('display: none');
  });
});
