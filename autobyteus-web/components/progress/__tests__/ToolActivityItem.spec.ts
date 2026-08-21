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

describe('ToolActivityItem.vue', () => {
  it('keeps the right-panel status chip text and short debug id visible', () => {
    const wrapper = mount(ToolActivityItem, {
      props: {
        activity,
      },
      global: {
        stubs: {
          Icon: IconStub,
        },
      },
    });

    expect(wrapper.get('.rounded-full').text()).toBe('Success');
    expect(wrapper.text()).toContain('#abc123');
  });
});
