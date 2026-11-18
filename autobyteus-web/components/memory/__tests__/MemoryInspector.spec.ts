import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryInspector from '../MemoryInspector.vue';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';

const mountInspector = (props: Record<string, unknown> = {}) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemoryInspectorStore();
  return { pinia, store, mountIt: () => mount(MemoryInspector, { props, global: { plugins: [pinia] } }) };
};

const tabLabels = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[role="tab"]').map(tab => tab.text());

describe('MemoryInspector', () => {
  it('renders empty state when no target is selected', () => {
    const { mountIt } = mountInspector();
    expect(mountIt().text()).toContain('Select a memory entry');
  });

  it('has two run tabs, Work Journal first and selected by default; no Working Context, Episodic or Semantic tab', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex', workspaceRootPath: '/w/app' };
    store.activeTab = 'journal';
    const wrapper = mountIt();
    expect(tabLabels(wrapper)).toEqual(['Work Journal', 'Raw Traces']);
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Work Journal');
    expect(wrapper.text()).not.toMatch(/working context|episodic|semantic/i);
    expect(wrapper.find('[data-test="work-journal"]').exists()).toBe(true);
  });

  it('names an agent run by its agent, with the run ID and workspace', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex', workspaceRootPath: '/w/app' };
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('Codex');
    expect(wrapper.text()).toContain('run-1 · /w/app');
  });

  it('calls setActiveTab when opening Raw Traces', async () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex' };
    const wrapper = mountIt();

    await wrapper.findAll('button').find((button) => button.text().includes('Raw Traces'))!.trigger('click');

    expect(store.setActiveTab).toHaveBeenCalledWith('raw');
  });

  it('names a team member as member · team, without path words', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'team_member_run', teamDefinitionName: 'Alpha Team', teamRunId: 'team-1', agentRunId: 'member-1', memberAddress: '/coordinator', memberName: 'Coordinator' };
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('Coordinator · Alpha Team');
    expect(wrapper.text()).toContain('member-1');
    expect(wrapper.text()).not.toContain('Agent Teams /');
  });

  it('names an org member as member · org', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'org_member_run', orgDefinitionName: 'Alpha Org', orgRunId: 'org-run-1', agentRunId: 'designer-run', memberAddress: '/software_engineering_team/solution_designer', memberName: 'software_engineering_team/solution_designer' };
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('software_engineering_team/solution_designer · Alpha Org');
    expect(wrapper.text()).toContain('designer-run');
  });

  it('shows a run known only by its folder with its Work Journal only', () => {
    const { mountIt } = mountInspector({ folderRun: { runKey: 'agent_teams/old_team/member_y', runId: 'member_y', agentName: 'member_y', groupName: 'old_team' } });
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('member_y · old_team');
    expect(wrapper.text()).toContain('agent_teams/old_team/member_y');
    expect(tabLabels(wrapper)).toEqual(['Work Journal']);
    expect(wrapper.find('[data-test="work-journal"]').exists()).toBe(true);
  });
});
