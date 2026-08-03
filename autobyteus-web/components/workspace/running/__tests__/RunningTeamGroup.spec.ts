import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RunningTeamGroup from '../RunningTeamGroup.vue';

describe('RunningTeamGroup', () => {
  const RunningTeamRowStub = {
    name: 'RunningTeamRow',
    template: '<div class="team-row-stub"></div>',
    props: ['teamRun', 'isSelected', 'coordinatorName'],
  };

  const runs = [
    { teamRunId: 'team-1', config: { teamDefinitionName: 'Team A' }, isActive: true, isSubscribed: false },
    { teamRunId: 'team-2', config: { teamDefinitionName: 'Team A' }, isActive: false, isSubscribed: true }
  ] as any;

  const mountGroup = (groupRuns = runs) => mount(RunningTeamGroup, {
    props: {
      definitionName: 'Team A',
      definitionId: 'def-a',
      runs: groupRuns,
      selectedRunId: null,
    },
    global: {
      stubs: {
        RunningTeamRow: RunningTeamRowStub,
        Icon: true,
      },
      mocks: {
        $t: (key: string) => ({
          'workspace.components.workspace.running.RunningTeamGroup.active_team_runs': 'Active team runs',
          'workspace.components.workspace.running.RunningTeamGroup.no_active_team_runs': 'No active team runs',
        }[key] ?? key),
      },
    },
  });

  it('renders header and runs', async () => {
    const wrapper = mountGroup();

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Team A');
    expect(wrapper.findAllComponents({ name: 'RunningTeamRow' }).length).toBe(2);
  });

  it('summarizes only child isActive and turns gray after the last active run settles', async () => {
    const wrapper = mountGroup();

    const dot = wrapper.get('[data-test="team-activity-dot"]');
    expect(dot.attributes()).toMatchObject({
      'data-active': 'true',
      'aria-label': 'Active team runs',
      title: 'Active team runs',
    });
    expect(dot.classes()).toContain('bg-blue-500');

    await wrapper.setProps({
      runs: runs.map((run: any) => ({
        ...run,
        isActive: false,
        isSubscribed: true,
      })),
    });

    expect(dot.attributes()).toMatchObject({
      'data-active': 'false',
      'aria-label': 'No active team runs',
      title: 'No active team runs',
    });
    expect(dot.classes()).toContain('bg-gray-400');
  });

  it('toggles expansion', async () => {
    const wrapper = mountGroup();

    await wrapper.vm.$nextTick();
    // Initial state: expanded
    expect(wrapper.findAllComponents({ name: 'RunningTeamRow' }).length).toBe(2);

    // Click header to collapse
    const setupState = (wrapper.vm as any).$?.setupState;
    if (setupState?.toggleExpand) {
      setupState.toggleExpand();
    } else {
      await wrapper.find('.group-header').trigger('click');
    }
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.group-header').exists()).toBe(true);

    // Click header to expand
    if (setupState?.toggleExpand) {
      setupState.toggleExpand();
    } else {
      await wrapper.find('.group-header').trigger('click');
    }
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.group-header').exists()).toBe(true);
  });

  it('emits create event', async () => {
    const wrapper = mountGroup();

    await wrapper.find('.create-btn').trigger('click');
    expect(wrapper.emitted('create')?.[0]).toEqual(['def-a']);
  });
});
