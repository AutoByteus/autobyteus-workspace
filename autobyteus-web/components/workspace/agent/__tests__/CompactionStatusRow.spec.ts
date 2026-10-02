import { getCompactionPhasePresentation } from '~/utils/compactionActivityPresentation';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import CompactionStatusRow from '../CompactionStatusRow.vue';

const iconStub = {
  name: 'Icon',
  props: ['icon'],
  template: '<svg v-bind="$attrs" :data-icon="icon" />',
};

const mountRow = (phase: CompactionActivity['phase']) => mount(CompactionStatusRow, {
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
  },
});

describe('CompactionStatusRow', () => {
  it('spins the centered compaction status icon while compaction is active', () => {
    const wrapper = mountRow('started');

    const icon = wrapper.get('[data-testid="compaction-status-icon"]');
    expect(icon.classes()).toContain('motion-safe:animate-spin');
    expect(wrapper.text()).toContain('Compacting');

    wrapper.unmount();
  });

  it('does not spin completed centered compaction status icons', () => {
    const wrapper = mountRow('completed');

    const icon = wrapper.get('[data-testid="compaction-status-icon"]');
    expect(icon.classes()).not.toContain('motion-safe:animate-spin');
    expect(wrapper.text()).toContain('Completed');

    wrapper.unmount();
  });
});

it('renders stopped with exact primary/status text, neutral static icon and no inherited error', () => {
  const wrapper = mountRow('stopped');
  expect(wrapper.findAll('span').map(span => span.text())).toEqual(['Stopped', 'Stopped']);
  const icon = wrapper.get('[data-testid="compaction-status-icon"]');
  expect(getCompactionPhasePresentation('stopped').icon).toBe('heroicons:stop-circle-solid');
  expect(icon.classes()).toContain('text-gray-600');
  expect(icon.classes()).not.toContain('motion-safe:animate-spin');
  wrapper.unmount();
});
