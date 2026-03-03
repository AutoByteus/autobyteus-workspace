import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
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
});
