import { beforeEach, describe, it, expect, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import WorkspaceAdaptiveLayout from '../WorkspaceAdaptiveLayout.vue';
import { useRightPanel } from '~/composables/useRightPanel';
import { useLeftPanel } from '~/composables/useLeftPanel';
import {
  RESPONSIVE_WORKSPACE_SHELL_KEY,
} from '~/composables/layout/useResponsiveWorkspaceShell';
import { resolveResponsiveWorkspaceShellState } from '~/utils/layout/responsiveLayoutPolicy';

const routerMock = vi.hoisted(() => ({
  push: vi.fn().mockResolvedValue(undefined),
}));
const routeMock = vi.hoisted(() => ({
  path: '/workspace',
  fullPath: '/workspace',
}));

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
  useRoute: () => routeMock,
}));

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
    routerMock.push.mockReset();
    routerMock.push.mockResolvedValue(undefined);
    mockClientWidth = 1200;
    mockClientHeight = 700;
    setViewport(1440, 900);
    const {
      setRightPanelVisible,
    } = useRightPanel();
    setRightPanelVisible(true);
    useLeftPanel().setLeftPanelVisible(true);
  });

  const mountComponent = async (initialState = {}) => {
    const leftPanel = useLeftPanel();
    const rightPanel = useRightPanel();
    const responsiveWorkspaceShellState = ref(resolveResponsiveWorkspaceShellState({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      leftPanelPreference: leftPanel.isLeftPanelVisible.value ? 'visible' : 'hidden-by-user',
      leftPanelPreferredWidth: leftPanel.leftPanelWidth.value,
      rightPanelPreference: rightPanel.isRightPanelVisible.value ? 'visible' : 'hidden-by-user',
      rightPanelPreferredWidth: rightPanel.preferredRightPanelWidth.value,
    }));

    const wrapper = shallowMount(WorkspaceAdaptiveLayout, {
      props: { showFileContent: false },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
            initialState,
          }),
        ],
        stubs: {
          RightSideTabs: { template: '<div class="right-tabs-stub"></div>' },
          RightSidebarStrip: { template: '<div class="right-strip-stub"></div>' },
          WorkspacePrimarySurfaceControls: {
            props: ['showNavigationTrigger', 'showToolsTrigger'],
            template: `<nav data-test="workspace-semantic-surface-triggers">
              <button v-if="showNavigationTrigger" data-test="workspace-navigation-trigger" @click="$emit('open-navigation')">Agents &amp; teams</button>
              <button v-if="showToolsTrigger" data-test="workspace-tools-trigger" @click="$emit('open-tools')">Tools</button>
            </nav>`,
          },
          WorkspaceRightToolDrawer: { template: '<div data-test="workspace-right-tool-drawer"></div>' },
          AgentWorkspaceView: AgentWorkspaceViewValue,
          TeamWorkspaceView: TeamWorkspaceViewValue,
          RunConfigPanel: RunConfigPanelValue,
        },
        provide: {
          [RESPONSIVE_WORKSPACE_SHELL_KEY]: responsiveWorkspaceShellState,
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

    expect(wrapper.find('[data-test="workspace-empty-state"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-empty-state-choose"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-empty-state-runs"]').exists()).toBe(true);
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

  it('uses semantic narrow triggers instead of a generic surface row', async () => {
    setViewport(700, 700);
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'agent', selectedRunId: '123' },
      workspaceCenterView: { mode: 'chat' },
    });

    const controls = wrapper.get('[data-test="workspace-semantic-surface-triggers"]');
    expect(controls.text()).toContain('Tools');
    expect(controls.text()).not.toContain('Work');
    expect(controls.text()).not.toContain('Runs');
    expect(controls.text()).not.toContain('Files');
    expect(controls.text()).not.toContain('Running');
    expect(controls.text()).toContain('Agents & teams');
    expect(wrapper.find('[data-test="workspace-center-content-shell"]').exists()).toBe(true);
  });

  it('keeps the left navigation docked at 1024 while right tools yield', async () => {
    setViewport(1024, 768);
    mockClientWidth = 704;
    mockClientHeight = 768;

    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(false);
    const controls = wrapper.get('[data-test="workspace-semantic-surface-triggers"]');
    expect(controls.text()).toContain('Tools');
    expect(controls.text()).not.toContain('Work');
    expect(controls.text()).not.toContain('Runs');
  });

  it('switches right tools out of the cramped docked pane at constrained widths', async () => {
    setViewport(800, 700);
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="workspace-semantic-surface-triggers"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-center-content-shell"]').exists()).toBe(true);
  });

  it('does not render semantic triggers after a wide manual left collapse', async () => {
    useLeftPanel().setLeftPanelVisible(false);

    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: '456' },
      workspaceCenterView: { mode: 'chat' },
    });

    expect(wrapper.find('[data-test="workspace-semantic-surface-triggers"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="workspace-primary-surface-controls"]').exists()).toBe(false);
  });

  it('opens the existing primary navigation route from the wide empty state', async () => {
    const wrapper = await mountComponent({
      agentSelection: { selectedType: null, selectedRunId: null },
      workspaceCenterView: { mode: 'chat' },
      agentRunConfig: { config: null },
      teamRunConfig: { config: null },
    });

    await wrapper.get('[data-test="workspace-empty-state-choose"]').trigger('click');

    expect(routerMock.push).toHaveBeenCalledWith({ path: '/agents', query: { view: 'list' } });
    expect((wrapper.vm as any).selectionStore.selectedRunId).toBeNull();
  });

  it('opens the left drawer for empty-state selection at constrained widths', async () => {
    setViewport(700, 700);
    const wrapper = await mountComponent({
      agentSelection: { selectedType: null, selectedRunId: null },
      workspaceCenterView: { mode: 'chat' },
      agentRunConfig: { config: null },
      teamRunConfig: { config: null },
    });

    await wrapper.get('[data-test="workspace-empty-state-choose"]').trigger('click');

    expect((wrapper.vm as any).appLayoutStore.isMobileMenuOpen).toBe(true);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('opens run history without replacing the empty-state selection context', async () => {
    setViewport(700, 700);
    const historySurface = document.createElement('section');
    historySurface.dataset.test = 'app-left-panel-run-history';
    historySurface.tabIndex = -1;
    document.body.append(historySurface);

    try {
      const wrapper = await mountComponent({
        agentSelection: { selectedType: null, selectedRunId: null },
        workspaceCenterView: { mode: 'chat' },
        agentRunConfig: { config: null },
        teamRunConfig: { config: null },
      });

      await wrapper.get('[data-test="workspace-empty-state-runs"]').trigger('click');
      await nextTick();

      expect((wrapper.vm as any).appLayoutStore.isMobileMenuOpen).toBe(true);
      expect(document.activeElement).toBe(historySurface);
      expect((wrapper.vm as any).selectionStore.selectedRunId).toBeNull();
    } finally {
      historySurface.remove();
    }
  });

  it('opens constrained navigation and tools while preserving selection', async () => {
    setViewport(800, 700);
    const wrapper = await mountComponent({
      agentSelection: { selectedType: 'team', selectedRunId: 'run-2' },
      workspaceCenterView: { mode: 'chat' },
    });

    await wrapper.get('[data-test="workspace-navigation-trigger"]').trigger('click');
    expect((wrapper.vm as any).appLayoutStore.isMobileMenuOpen).toBe(true);
    expect((wrapper.vm as any).selectionStore.selectedRunId).toBe('run-2');

    await wrapper.get('[data-test="workspace-tools-trigger"]').trigger('click');
    expect(wrapper.find('[data-test="workspace-right-tool-drawer"]').exists()).toBe(true);
    expect((wrapper.vm as any).appLayoutStore.isMobileMenuOpen).toBe(false);
    expect((wrapper.vm as any).selectionStore.selectedRunId).toBe('run-2');
  });
});
