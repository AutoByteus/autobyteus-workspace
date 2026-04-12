import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { nextTick } from 'vue';
import AppLeftPanel from '../AppLeftPanel.vue';

const { mockRuntimeConfig } = vi.hoisted(() => ({
  mockRuntimeConfig: {
    public: {
      enableApplications: false,
    },
  },
}));

const mockRoute = {
  path: '/agents',
};

const mockRouter = {
  push: vi.fn(),
};

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
}));

mockNuxtImport('useRuntimeConfig', () => () => mockRuntimeConfig);

// Mock WorkspaceAgentRunsTreePanel to avoid deep rendering issues
vi.mock('~/components/workspace/history/WorkspaceAgentRunsTreePanel.vue', () => ({
  default: {
    template: '<div></div>',
  },
}));

describe('AppLeftPanel Component', () => {
  beforeEach(() => {
    mockRuntimeConfig.public.enableApplications = false;
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('hides Applications link when feature flag is false', () => {
    const wrapper = mount(AppLeftPanel, {
      global: {
        stubs: {
          Icon: true,
          WorkspaceAgentRunsTreePanel: true,
        },
        mocks: {
          $route: mockRoute,
          $router: mockRouter,
        },
      },
    });

    const text = wrapper.text();
    expect(text).not.toContain('Applications');
    expect(text).toContain('Agents');
    expect(text).toContain('Agent Teams');
  });

  it('shows Applications link when feature flag is true', () => {
    mockRuntimeConfig.public.enableApplications = true;
    const wrapper = mount(AppLeftPanel, {
      global: {
        stubs: {
          Icon: true,
          WorkspaceAgentRunsTreePanel: true,
        },
        mocks: {
          $route: mockRoute,
          $router: mockRouter,
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain('Applications');
  });

  it('allows dragging the section handle upward to give workspaces more height', async () => {
    const wrapper = mount(AppLeftPanel, {
      attachTo: document.body,
      global: {
        stubs: {
          Icon: true,
          WorkspaceAgentRunsTreePanel: true,
        },
        mocks: {
          $route: mockRoute,
          $router: mockRouter,
        },
      },
    });

    const sectionsContainer = wrapper.get('[data-test="app-left-panel-sections"]').element as HTMLElement;
    Object.defineProperty(sectionsContainer, 'clientHeight', {
      configurable: true,
      value: 640,
    });

    const primaryNavSection = wrapper.get('[data-test="app-left-panel-primary-nav"]').element as HTMLElement;
    const resizeHandle = wrapper.get('[data-test="app-left-panel-section-resize-handle"]');

    expect(primaryNavSection.style.height).toBe('240px');

    await resizeHandle.trigger('mousedown', { clientY: 320 });
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 200 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await nextTick();

    expect(primaryNavSection.style.height).toBe('56px');

    wrapper.unmount();
  });
});
