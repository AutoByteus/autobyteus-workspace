import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AgentTeamMemoryDetail from '../AgentTeamMemoryDetail.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';

describe('AgentTeamMemoryDetail', () => {
  it('renders concise team runs and emits inspectMember', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.selectedTeam = { teamDefinitionId: 'team', teamDefinitionName: 'Software Team', teamRunCount: 1, memberMemoryCount: 1, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } };
    store.teamRuns.total = 1;
    store.teamRuns.entries = [{
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team',
      teamDefinitionName: 'Software Team',
      summary: 'Planning run',
      workspaceRootPath: '/tmp/team-project',
      lastUpdatedAt: '2026-06-19T10:06:04.000Z',
      memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
      memberTargets: [{ memberRouteKey: 'lead', memberName: 'Lead', memberRunId: 'member-1', memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } }],
    }];
    const wrapper = mount(AgentTeamMemoryDetail, { props: { teamDefinitionId: 'team' }, global: { plugins: [pinia] } });

    expect(wrapper.text()).toContain('Software Team');
    expect(wrapper.text()).not.toContain('Software Team Memory');
    expect(wrapper.text()).not.toMatch(/agent team memory detail/i);
    expect(wrapper.text()).toMatch(/\bruns\b/i);
    expect(wrapper.find('input').attributes('placeholder')).toMatch(/search runs/i);
    expect(wrapper.text()).toContain('Members');
    expect(wrapper.text()).not.toContain('Team member memories');
    expect(wrapper.text()).toContain('/tmp/team-project');
    expect(wrapper.text()).not.toContain('Workspace:');
    expect(wrapper.text()).not.toContain('Updated:');
    await wrapper.findAll('button').find((button) => button.text().includes('Lead'))!.trigger('click');
    expect(wrapper.emitted('inspectMember')?.[0]?.[1]).toMatchObject({ memberRunId: 'member-1' });
  });
});
