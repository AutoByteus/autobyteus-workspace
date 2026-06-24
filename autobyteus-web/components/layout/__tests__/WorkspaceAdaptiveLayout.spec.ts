import { beforeEach, describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import WorkspaceAdaptiveLayout from '../WorkspaceAdaptiveLayout.vue';
import { useRightPanel } from '~/composables/useRightPanel';

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

let mockClientWidth = 1200;
let mockClientHeight = 700;

const setViewport = (width: number, height: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    return mockClientWidth;
  },
});

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    return mockClientHeight;
  },
});

describe('WorkspaceAdaptiveLayout', () => {
  beforeEach(() => {
    mockClientWidth = 1200;
    mockClientHeight = 700;
    setViewport(1440, 900);
    const {
      setRightPanelVisible,
      setRightPanelResponsivePresentation,
      setRightPanelWorkspaceWidth,
    } = useRightPanel();
    setRightPanelVisible(true);
    setRightPanelWorkspaceWidth(mockClientWidth);
    setRightPanelResponsivePresentation('docked');
  });

  const mountComponent = async (initialState = {}) => {
    const wrapper = shallowMount(WorkspaceAdaptiveLayout, {
      props: { showFileContent: false },
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
          WorkspacePrimarySurfaceControls: {
            props: ['activeSurface'],
            template: '<div data-test="workspace-primary-surface-controls">Work Runs Files Tools</div>',
          },
          WorkspaceRightToolDrawer: { template: '<div data-test="workspace-right-tool-drawer"></div>' },
          AgentWorkspaceView: AgentWorkspaceViewValue,
          TeamWorkspaceView: TeamWorkspaceViewValue,
          RunConfigPanel: RunConfigPanelValue,
        },
      },
    });
    await nextTick();
    await nextTick();
    return wrapper;
  };

  it('renders AgentWorkspaceView when agent is selected', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('.agent-view').exists()).toBe(true);
    expect(wrapper.find('.team-view').exists()).toBe(false);
    expect(wrapper.find('.run-config-view').exists()).toBe(false);
  });

  it('renders TeamWorkspaceView when team is selected', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('.team-view').exists()).toBe(true);
    expect(wrapper.find('.agent-view').exists()).toBe(false);
    expect(wrapper.find('.run-config-view').exists()).toBe(false);
  });

  it('renders RunConfigPanel when no selection and pending agent config exists', async () => {
    const wrapper = await mountComponent({
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

  it('renders placeholder when nothing is selected and no pending config exists', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: null, selectedRunId: null },
      workspaceCenterView: { mode: 'chat' },
      agentRunConfig: { config: null },
      teamRunConfig: { config: null },
    });

    expect(wrapper.text()).toContain('Select or run an agent');
  });

  it('keeps the adaptive root and center/right split shrink-safe', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    const root = wrapper.get('[data-test="workspace-adaptive-layout"]');
    expect(root.classes()).toContain('min-w-0');
    expect(root.classes()).toContain('overflow-hidden');

    const handle = wrapper.get('[data-test="workspace-right-resize-handle"]');
    expect(handle.classes()).toContain('drag-handle');

    const rightPanel = wrapper.get('[data-test="workspace-right-panel"]');
    expect(rightPanel.classes()).toContain('flex-none');
    expect(rightPanel.classes()).toContain('min-w-0');
    expect(rightPanel.classes()).toContain('overflow-hidden');
  });

  it('keeps the center content shell clipped instead of making it an outer scroll owner', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'chat' },
    });

    const shell = wrapper.get('[data-test="workspace-center-content-shell"]');
    expect(shell.classes()).toContain('overflow-hidden');
    expect(shell.classes()).not.toContain('overflow-auto');
  });

  it('renders RunConfigPanel for selected run when config view mode is active', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'config' },
    });

    expect(wrapper.find('.run-config-view').exists()).toBe(true);
    expect(wrapper.find('.agent-view').exists()).toBe(false);
    expect(wrapper.find('.team-view').exists()).toBe(false);
  });

  it('shows a center loading overlay while a historical run is opening', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
      runHistory: { openingRun: true },
    });

    expect(wrapper.find('.team-view').exists()).toBe(true);
    expect(wrapper.find('workspace-center-loading-overlay-stub').exists()).toBe(true);
  });

  it('uses the canonical narrow primary surface controls instead of legacy mobile tabs', async () => {
    mockClientWidth = 700;
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'chat' },
    });

    const controls = wrapper.get('[data-test="workspace-primary-surface-controls"]');
    expect(controls.text()).toContain('Work');
    expect(controls.text()).toContain('Runs');
    expect(controls.text()).toContain('Files');
    expect(controls.text()).toContain('Tools');
    expect(controls.text()).not.toContain('Running');
    expect(controls.text()).not.toContain('Agent');
    expect(wrapper.find('[data-test="workspace-center-content-shell"]').exists()).toBe(true);
  });



  it('keeps Runs access visible in the 1024 left-strip plus docked-right band', async () => {
    setViewport(1024, 768);
    mockClientWidth = 974;
    mockClientHeight = 768;

    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(true);
    const controls = wrapper.get('[data-test="workspace-primary-surface-controls"]');
    expect(controls.text()).toContain('Work');
    expect(controls.text()).toContain('Runs');
    expect(controls.text()).toContain('Files');
    expect(controls.text()).toContain('Tools');
  });

  it('switches right tools out of the cramped docked pane at constrained widths', async () => {
    mockClientWidth = 750;
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="workspace-primary-surface-controls"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-center-content-shell"]').exists()).toBe(true);
  });
});
