import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import LeftSidebarStrip from '../LeftSidebarStrip.vue';

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

// Mock useLeftPanel
vi.mock('~/composables/useLeftPanel', () => ({
  useLeftPanel: () => ({
    isLeftPanelVisible: { value: true },
    toggleLeftPanel: vi.fn(),
  }),
}));

describe('LeftSidebarStrip Component', () => {
  beforeEach(() => {
    mockRuntimeConfig.public.enableApplications = false;
    vi.clearAllMocks();
  });

  it('hides Applications link when feature flag is false', () => {
    const wrapper = mount(LeftSidebarStrip, {
      global: {
        stubs: {
          Icon: true,
        },
      },
    });

    const items = wrapper.findAll('button[title]');
    const labels = items.map(item => item.attributes('title'));
    
    expect(labels).not.toContain('Applications');
    expect(labels).toContain('Agents');
    expect(labels).toContain('Agent Teams');
    expect(labels).not.toContain('Prompt Engineering');
  });

  it('shows Applications link when feature flag is true', () => {
    mockRuntimeConfig.public.enableApplications = true;
    const wrapper = mount(LeftSidebarStrip, {
      global: {
        stubs: {
          Icon: true,
        },
      },
    });

    const items = wrapper.findAll('button[title]');
    const labels = items.map(item => item.attributes('title'));
    
    expect(labels).toContain('Applications');
    expect(labels).not.toContain('Prompt Engineering');
  });
});
