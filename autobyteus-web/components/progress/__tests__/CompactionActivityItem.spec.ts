import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import CompactionActivityItem from '../CompactionActivityItem.vue';

const iconStub = {
  name: 'Icon',
  props: ['icon'],
  template: '<svg v-bind="$attrs" :data-icon="icon" />',
};

const mountItem = (phase: CompactionActivity['phase']) => mount(CompactionActivityItem, {
  props: {
    activity: {
      kind: 'compaction',
      activityId: `compaction:${phase}`,
      phase,
      message: phase === 'started' ? 'Provider context compaction started' : 'Memory compacted',
      timestamp: new Date('2026-06-19T00:00:00.000Z'),
      updatedAt: new Date('2026-06-19T00:00:01.000Z'),
    },
  },
  global: {
    stubs: {
      Icon: iconStub,
    },
    mocks: {
      $t: () => 'Memory compaction',
    },
  },
});

describe('CompactionActivityItem', () => {
  it('spins the compaction activity icon while compaction is active', () => {
    const wrapper = mountItem('started');

    const icon = wrapper.get('[data-testid="compaction-activity-icon"]');
    expect(icon.classes()).toContain('motion-safe:animate-spin');
    expect(wrapper.text()).toContain('Compacting');

    wrapper.unmount();
  });

  it('does not spin completed compaction activity icons', () => {
    const wrapper = mountItem('completed');

    const icon = wrapper.get('[data-testid="compaction-activity-icon"]');
    expect(icon.classes()).not.toContain('motion-safe:animate-spin');
    expect(wrapper.text()).toContain('Completed');

    wrapper.unmount();
  });
});
