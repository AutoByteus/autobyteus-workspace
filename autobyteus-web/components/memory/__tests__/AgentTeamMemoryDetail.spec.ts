import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AgentTeamMemoryDetail from '../AgentTeamMemoryDetail.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';

describe('AgentTeamMemoryDetail', () => {
  it('renders team runs and emits inspectMember', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.selectedTeam = { teamDefinitionId: 'team', teamDefinitionName: 'Software Team', teamRunCount: 1, memberMemoryCount: 1, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } };
    store.teamRuns.entries = [{ teamRunId: 'team-run-1', teamDefinitionId: 'team', teamDefinitionName: 'Software Team', memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false }, memberTargets: [{ memberRouteKey: 'lead', memberName: 'Lead', memberRunId: 'member-1', memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } }] }];
    const wrapper = mount(AgentTeamMemoryDetail, { props: { teamDefinitionId: 'team' }, global: { plugins: [pinia] } });

    expect(wrapper.text()).toContain('Software Team Memory');
    expect(wrapper.text()).toContain('Team member memories');
    await wrapper.findAll('button').find((button) => button.text().includes('Lead'))!.trigger('click');
    expect(wrapper.emitted('inspectMember')?.[0]?.[1]).toMatchObject({ memberRunId: 'member-1' });
  });
});
