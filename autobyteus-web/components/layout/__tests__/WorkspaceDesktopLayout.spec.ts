import { describe, it, expect, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import WorkspaceDesktopLayout from '../WorkspaceDesktopLayout.vue';

vi.mock('../RightSideTabs.vue', () => ({
  default: { template: '<div class="right-tabs-stub"></div>' },
}));

vi.mock('~/components/tabs/Tab.vue', () => ({
  default: { template: '<div class="tab-stub"></div>' },
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: class {},
}));
vi.mock('~/lib/novnc/core/rfb', () => ({
  default: class {},
}));

const AgentWorkspaceViewValue = { template: '<div class="agent-view"></div>' };
const TeamWorkspaceViewValue = { template: '<div class="team-view"></div>' };
const RunConfigPanelValue = { template: '<div class="run-config-view"></div>' };

describe('WorkspaceDesktopLayout', () => {
  const mountComponent = (initialState = {}) => {
    return shallowMount(WorkspaceDesktopLayout, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState,
          }),
        ],
        stubs: {
          RightSideTabs: { template: '<div class="right-tabs-stub"></div>' },
          RightSidebarStrip: { template: '<div class="right-strip-stub"></div>' },
          AgentWorkspaceView: AgentWorkspaceViewValue,
          TeamWorkspaceView: TeamWorkspaceViewValue,
          RunConfigPanel: RunConfigPanelValue,
        },
      },
    });
  };

  it('renders AgentWorkspaceView when agent is selected', () => {
    const wrapper = mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('.agent-view').exists()).toBe(true);
    expect(wrapper.find('.team-view').exists()).toBe(false);
    expect(wrapper.find('.run-config-view').exists()).toBe(false);
  });

  it('renders TeamWorkspaceView when team is selected', () => {
    const wrapper = mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('.team-view').exists()).toBe(true);
    expect(wrapper.find('.agent-view').exists()).toBe(false);
    expect(wrapper.find('.run-config-view').exists()).toBe(false);
  });

  it('renders RunConfigPanel when no selection and pending agent config exists', () => {
    const wrapper = mountComponent({
      agentSelection: { selectedType: null, selectedRunId: null },
      workspaceCenterView: { mode: 'chat' },
      agentRunConfig: {
        config: {
          agentDefinitionId: 'agent-def-1',
          agentDefinitionName: 'Research Agent',
          llmModelIdentifier: '',
          workspaceId: null,
        },
      },
      teamRunConfig: { config: null },
    });

    expect(wrapper.find('.run-config-view').exists()).toBe(true);
    expect(wrapper.find('.agent-view').exists()).toBe(false);
    expect(wrapper.find('.team-view').exists()).toBe(false);
  });

  it('renders placeholder when nothing is selected and no pending config exists', () => {
    const wrapper = mountComponent({
      agentSelection: { selectedType: null, selectedRunId: null },
      workspaceCenterView: { mode: 'chat' },
      agentRunConfig: { config: null },
      teamRunConfig: { config: null },
    });

    expect(wrapper.text()).toContain('Select or run an agent/team to begin');
  });

  it('keeps the center content shell clipped instead of making it an outer scroll owner', () => {
    const wrapper = mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'chat' },
    });

    const shell = wrapper.get('[data-test="workspace-center-content-shell"]');
    expect(shell.classes()).toContain('overflow-hidden');
    expect(shell.classes()).not.toContain('overflow-auto');
  });

  it('renders RunConfigPanel for selected run when config view mode is active', () => {
    const wrapper = mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'config' },
    });

    expect(wrapper.find('.run-config-view').exists()).toBe(true);
    expect(wrapper.find('.agent-view').exists()).toBe(false);
    expect(wrapper.find('.team-view').exists()).toBe(false);
  });
});
