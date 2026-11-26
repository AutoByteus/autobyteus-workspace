import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryInspector from '../MemoryInspector.vue';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const mountInspector = (props: Record<string, unknown> = {}) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemoryInspectorStore();
  return {
    pinia,
    store,
    mountIt: () => mount(MemoryInspector, {
      props: { backText: 'Memory', backLabel: 'Back to Memory', ...props },
      global: { plugins: [pinia], stubs: { WorkJournalTab: { template: '<div data-test="work-journal" />' }, RawTracesTab: true } },
    }),
  };
};

const tabLabels = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[role="tab"]').map(tab => tab.text());

describe('MemoryInspector', () => {
  it('renders empty state when no target is selected', () => {
    const { mountIt } = mountInspector();
    expect(mountIt().text()).toContain('Select a memory entry');
  });

  it('has two run tabs, Work Journal first and selected by default; no Working Context tab', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex', workspaceRootPath: '/w/app' };
    store.activeTab = 'journal';
    const wrapper = mountIt();
    expect(tabLabels(wrapper)).toEqual(['Work Journal', 'Raw Traces']);
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Work Journal');
    expect(wrapper.text()).not.toMatch(/working context/i);
    expect(wrapper.find('[data-test="work-journal"]').exists()).toBe(true);
  });

  it('names an agent run by its agent; without a run title, the run ID · workspace in mono with it as tooltip (REQ-005)', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex', workspaceRootPath: '/w/app' };
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('Codex');
    expect(wrapper.find('h1').classes()).not.toContain('sr-only');
    const identity = wrapper.get('[data-test="memory-inspector-run-identity"]');
    expect(identity.text()).toBe('run-1 · /w/app');
    expect(identity.classes()).toContain('font-mono');
    expect(identity.attributes('title')).toBe('run-1 · /w/app');
    expect(wrapper.find('[data-test="memory-inspector-run-title"]').exists()).toBe(false);
  });

  it("one header row (DC-007): Back shows where it goes; the run's title, its run ID · workspace in the tooltip; the agent for screen readers only when Back names it", async () => {
    const { store, mountIt } = mountInspector({ backText: 'Codex', backLabel: 'Back to Codex' });
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex', workspaceRootPath: '/w/app', runLabel: 'Rename the helper and update callers' };
    const wrapper = mountIt();
    const back = wrapper.get('[data-test="memory-page-back"]');
    expect(back.text()).toBe('Codex');
    expect(back.attributes('aria-label')).toBe('Back to Codex');
    await back.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.get('h1').text()).toBe('Codex');
    expect(wrapper.get('h1').classes()).toContain('sr-only');
    const title = wrapper.get('[data-test="memory-inspector-run-title"]');
    expect(title.text()).toBe('Rename the helper and update callers');
    expect(title.attributes('title')).toBe('run-1 · /w/app');
    expect(wrapper.find('[data-test="memory-inspector-run-identity"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="memory-page-header"]').find('[role="tablist"]').exists()).toBe(true);
  });

  it('calls setActiveTab when opening Raw Traces', async () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex' };
    const wrapper = mountIt();

    await wrapper.findAll('button').find((button) => button.text().includes('Raw Traces'))!.trigger('click');

    expect(store.setActiveTab).toHaveBeenCalledWith('raw');
  });

  it('names a team member as member · team, without path words; the team is not repeated when Back names it; its run titled by the team run\'s summary (DEC-002)', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'team_member_run', teamDefinitionName: 'Alpha Team', teamRunId: 'team-1', agentRunId: 'member-1', memberAddress: '/coordinator', memberName: 'Coordinator' };
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('Coordinator · Alpha Team');
    expect(wrapper.get('[data-test="memory-inspector-run-identity"]').text()).toBe('member-1');
    expect(wrapper.text()).not.toContain('Agent Teams /');

    const fromTeam = mountInspector({ backText: 'Alpha Team', backLabel: 'Back to Alpha Team' });
    fromTeam.store.target = { ...store.target, runLabel: 'Planning run' };
    const titled = fromTeam.mountIt();
    expect(titled.get('h1').text()).toBe('Coordinator');
    expect(titled.get('[data-test="memory-inspector-run-title"]').text()).toBe('Planning run');
    expect(titled.get('[data-test="memory-inspector-run-title"]').attributes('title')).toBe('member-1');
  });

  it('names an org member as member · org', () => {
    const { store, mountIt } = mountInspector();
    store.target = { kind: 'org_member_run', orgDefinitionName: 'Alpha Org', orgRunId: 'org-run-1', agentRunId: 'designer-run', memberAddress: '/software_engineering_team/solution_designer', memberName: 'software_engineering_team/solution_designer' };
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('software_engineering_team/solution_designer · Alpha Org');
    expect(wrapper.text()).toContain('designer-run');
  });

  it('shows a run known only by its folder with its Work Journal only, its run key standing in for a title', () => {
    const { mountIt } = mountInspector({ folderRun: { runKey: 'agent_teams/old_team/member_y', runId: 'member_y', agentName: 'member_y', groupName: 'old_team', runLabel: null } });
    const wrapper = mountIt();
    expect(wrapper.find('h1').text()).toBe('member_y · old_team');
    expect(wrapper.text()).toContain('agent_teams/old_team/member_y');
    expect(tabLabels(wrapper)).toEqual(['Work Journal']);
    expect(wrapper.find('[data-test="work-journal"]').exists()).toBe(true);
  });
});
